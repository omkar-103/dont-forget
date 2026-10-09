import crypto from 'crypto';
import { dbService } from './db.ts';

export interface SecurityConfig {
  hash: string;
  salt: string;
  isCustomized: boolean;
  updatedAt: string;
}

const DEFAULT_PIN = process.env.APP_SECURITY_PIN || '12345678';

// Hash helper using PBKDF2 with SHA-256 (100,000 rounds)
function hashPin(pin: string, salt: string): string {
  return crypto.pbkdf2Sync(pin, salt, 100000, 64, 'sha256').toString('hex');
}

class ServerAuthManager {
  private failedAttempts: number = 0;
  private lockoutUntil: number = 0;
  private memoryConfig: SecurityConfig | null = null;

  constructor() {
    this.ensureInitialized();
  }

  private async ensureInitialized(): Promise<void> {
    try {
      const existing = await dbService.getAuthConfig('default_user');
      if (existing && existing.hash && existing.salt) {
        this.memoryConfig = {
          hash: existing.hash,
          salt: existing.salt,
          isCustomized: existing.isCustomized ?? false,
          updatedAt: existing.updatedAt || new Date().toISOString(),
        };
        return;
      }

      // Initialize with default PIN in database
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = hashPin(DEFAULT_PIN, salt);
      const config: SecurityConfig = {
        hash,
        salt,
        isCustomized: false,
        updatedAt: new Date().toISOString(),
      };
      this.memoryConfig = config;
      await dbService.saveAuthConfig(config, 'default_user');
    } catch (err) {
      console.warn('Auth manager initialization notice (using memory fallback):', err);
      if (!this.memoryConfig) {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = hashPin(DEFAULT_PIN, salt);
        this.memoryConfig = {
          hash,
          salt,
          isCustomized: false,
          updatedAt: new Date().toISOString(),
        };
      }
    }
  }

  private async getConfig(): Promise<SecurityConfig> {
    try {
      const dbConfig = await dbService.getAuthConfig('default_user');
      if (dbConfig && dbConfig.hash && dbConfig.salt) {
        this.memoryConfig = {
          hash: dbConfig.hash,
          salt: dbConfig.salt,
          isCustomized: dbConfig.isCustomized ?? false,
          updatedAt: dbConfig.updatedAt || new Date().toISOString(),
        };
        return this.memoryConfig;
      }
    } catch {
      // ignore
    }

    if (this.memoryConfig) return this.memoryConfig;

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPin(DEFAULT_PIN, salt);
    this.memoryConfig = {
      hash,
      salt,
      isCustomized: false,
      updatedAt: new Date().toISOString(),
    };
    return this.memoryConfig;
  }

  public getLockoutRemainingSeconds(): number {
    const now = Date.now();
    if (this.lockoutUntil > now) {
      return Math.ceil((this.lockoutUntil - now) / 1000);
    }
    return 0;
  }

  public async getStatus(clientToken?: string | null): Promise<{
    authenticated: boolean;
    sessionInvalidated: boolean;
    isLockedOut: boolean;
    lockoutSeconds: number;
    attemptsRemaining: number;
    isDefaultPin: boolean;
    activeSessionExists: boolean;
  }> {
    const lockoutSeconds = this.getLockoutRemainingSeconds();
    const config = await this.getConfig();

    let isValid = false;
    if (clientToken) {
      const validation = await dbService.validateSession(clientToken);
      isValid = validation.valid;
    }

    return {
      authenticated: isValid,
      sessionInvalidated: false,
      isLockedOut: lockoutSeconds > 0,
      lockoutSeconds,
      attemptsRemaining: Math.max(0, 5 - this.failedAttempts),
      isDefaultPin: !config.isCustomized,
      activeSessionExists: isValid,
    };
  }

  public async unlock(
    pin: string,
    userAgent?: string,
    ip?: string
  ): Promise<{
    success: boolean;
    token?: string;
    error?: string;
    lockoutSeconds?: number;
    attemptsRemaining?: number;
  }> {
    const lockoutSec = this.getLockoutRemainingSeconds();
    if (lockoutSec > 0) {
      return {
        success: false,
        error: `Too many failed attempts. Security cooldown active for ${lockoutSec}s.`,
        lockoutSeconds: lockoutSec,
        attemptsRemaining: 0,
      };
    }

    // Verify 8-digit format
    if (!pin || !/^\d{8}$/.test(pin.trim())) {
      return {
        success: false,
        error: 'Password must be exactly 8 numeric digits (0-9).',
        attemptsRemaining: Math.max(0, 5 - this.failedAttempts),
      };
    }

    const config = await this.getConfig();
    const candidateHash = hashPin(pin.trim(), config.salt);

    // Constant-time comparison to prevent timing attacks
    const hashBufferA = Buffer.from(candidateHash, 'hex');
    const hashBufferB = Buffer.from(config.hash, 'hex');
    const isMatch =
      hashBufferA.length === hashBufferB.length &&
      crypto.timingSafeEqual(hashBufferA, hashBufferB);

    if (!isMatch) {
      this.failedAttempts += 1;
      if (this.failedAttempts >= 5) {
        this.lockoutUntil = Date.now() + 30 * 1000; // 30 second cooldown
        this.failedAttempts = 0; // reset counter after cooldown begins
        return {
          success: false,
          error: 'Incorrect 8-digit password. Rate limit reached: Locked out for 30 seconds.',
          lockoutSeconds: 30,
          attemptsRemaining: 0,
        };
      }

      return {
        success: false,
        error: `Incorrect 8-digit password. ${5 - this.failedAttempts} attempt(s) remaining.`,
        attemptsRemaining: 5 - this.failedAttempts,
      };
    }

    // Success! Reset failed attempts
    this.failedAttempts = 0;
    this.lockoutUntil = 0;

    // Issue a brand new multi-device session token persisted in MongoDB Atlas
    const tokenBytes = crypto.randomBytes(32).toString('hex');
    const newSessionToken = `sec_sess_${tokenBytes}_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days session validity

    await dbService.createSession({
      token: newSessionToken,
      userId: 'default_user',
      expiresAt,
      userAgent: userAgent || 'Unknown Device',
      ip: ip || 'unknown',
    });

    return {
      success: true,
      token: newSessionToken,
    };
  }

  public async validateSession(clientToken: string | null | undefined): Promise<boolean> {
    if (!clientToken) return false;
    const result = await dbService.validateSession(clientToken);
    return result.valid;
  }

  public async lockSession(clientToken?: string | null): Promise<boolean> {
    if (!clientToken) return false;
    return await dbService.deleteSession(clientToken);
  }

  public async revokeAllSessions(userId = 'default_user'): Promise<boolean> {
    return await dbService.deleteAllSessions(userId);
  }

  public async changePin(
    currentPin: string,
    newPin: string
  ): Promise<{ success: boolean; token?: string; error?: string }> {
    if (!currentPin || !/^\d{8}$/.test(currentPin.trim())) {
      return { success: false, error: 'Current password must be 8 digits.' };
    }
    if (!newPin || !/^\d{8}$/.test(newPin.trim())) {
      return { success: false, error: 'New password must be exactly 8 digits (0-9).' };
    }

    const config = await this.getConfig();
    const candidateHash = hashPin(currentPin.trim(), config.salt);
    const hashBufferA = Buffer.from(candidateHash, 'hex');
    const hashBufferB = Buffer.from(config.hash, 'hex');
    const isMatch =
      hashBufferA.length === hashBufferB.length &&
      crypto.timingSafeEqual(hashBufferA, hashBufferB);

    if (!isMatch) {
      return { success: false, error: 'Current 8-digit password is incorrect.' };
    }

    // Generate new salt and save to MongoDB Atlas
    const newSalt = crypto.randomBytes(16).toString('hex');
    const newHash = hashPin(newPin.trim(), newSalt);
    const updatedConfig: SecurityConfig = {
      hash: newHash,
      salt: newSalt,
      isCustomized: true,
      updatedAt: new Date().toISOString(),
    };
    this.memoryConfig = updatedConfig;
    await dbService.saveAuthConfig(updatedConfig, 'default_user');

    // Invalidate existing sessions for security
    await dbService.deleteAllSessions('default_user');

    // Issue a fresh session token
    const tokenBytes = crypto.randomBytes(32).toString('hex');
    const newSessionToken = `sec_sess_${tokenBytes}_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await dbService.createSession({
      token: newSessionToken,
      userId: 'default_user',
      expiresAt,
    });

    return {
      success: true,
      token: newSessionToken,
    };
  }
}

export const serverAuth = new ServerAuthManager();

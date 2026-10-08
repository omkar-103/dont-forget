import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface SecurityConfig {
  hash: string;
  salt: string;
  isCustomized: boolean;
  updatedAt: string;
}

const VAULT_FILE_PATH = path.resolve(process.cwd(), '.security-vault.json');
const DEFAULT_PIN = '12345678';

// Hash helper using PBKDF2 with SHA-256
function hashPin(pin: string, salt: string): string {
  return crypto.pbkdf2Sync(pin, salt, 100000, 64, 'sha256').toString('hex');
}

class ServerAuthManager {
  private activeSessionToken: string | null = null;
  private sessionCreatedAt: number | null = null;
  private sessionUserAgent: string | null = null;
  private failedAttempts: number = 0;
  private lockoutUntil: number = 0;

  constructor() {
    this.ensureVaultInitialized();
  }

  private ensureVaultInitialized(): void {
    try {
      if (!fs.existsSync(VAULT_FILE_PATH)) {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = hashPin(DEFAULT_PIN, salt);
        const config: SecurityConfig = {
          hash,
          salt,
          isCustomized: false,
          updatedAt: new Date().toISOString(),
        };
        fs.writeFileSync(VAULT_FILE_PATH, JSON.stringify(config, null, 2), 'utf-8');
      }
    } catch (err) {
      console.error('Failed to initialize security vault:', err);
    }
  }

  private readConfig(): SecurityConfig {
    try {
      if (fs.existsSync(VAULT_FILE_PATH)) {
        const raw = fs.readFileSync(VAULT_FILE_PATH, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error reading security vault, re-initializing:', e);
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPin(DEFAULT_PIN, salt);
    return {
      hash,
      salt,
      isCustomized: false,
      updatedAt: new Date().toISOString(),
    };
  }

  private saveConfig(config: SecurityConfig): void {
    try {
      fs.writeFileSync(VAULT_FILE_PATH, JSON.stringify(config, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save security vault:', err);
    }
  }

  public getLockoutRemainingSeconds(): number {
    const now = Date.now();
    if (this.lockoutUntil > now) {
      return Math.ceil((this.lockoutUntil - now) / 1000);
    }
    return 0;
  }

  public getStatus(clientToken?: string | null) {
    const lockoutSeconds = this.getLockoutRemainingSeconds();
    const config = this.readConfig();
    const isValid = Boolean(
      clientToken && this.activeSessionToken && clientToken === this.activeSessionToken
    );

    return {
      authenticated: isValid,
      sessionInvalidated: Boolean(clientToken && this.activeSessionToken && clientToken !== this.activeSessionToken),
      isLockedOut: lockoutSeconds > 0,
      lockoutSeconds,
      attemptsRemaining: Math.max(0, 5 - this.failedAttempts),
      isDefaultPin: !config.isCustomized,
      activeSessionExists: Boolean(this.activeSessionToken),
    };
  }

  public unlock(
    pin: string,
    userAgent?: string
  ): {
    success: boolean;
    token?: string;
    error?: string;
    lockoutSeconds?: number;
    attemptsRemaining?: number;
  } {
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

    const config = this.readConfig();
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

    // Issue a brand new single-active session token
    // This immediately revokes any prior session across any browser or device!
    const newSessionToken = `sec_${crypto.randomUUID()}_${Date.now()}`;
    this.activeSessionToken = newSessionToken;
    this.sessionCreatedAt = Date.now();
    this.sessionUserAgent = userAgent || 'Unknown Device';

    return {
      success: true,
      token: newSessionToken,
    };
  }

  public validateSession(clientToken: string | null | undefined): boolean {
    if (!clientToken || !this.activeSessionToken) return false;
    return clientToken === this.activeSessionToken;
  }

  public lockSession(clientToken?: string | null): boolean {
    if (clientToken && clientToken === this.activeSessionToken) {
      this.activeSessionToken = null;
      this.sessionCreatedAt = null;
      this.sessionUserAgent = null;
      return true;
    }
    return false;
  }

  public changePin(
    currentPin: string,
    newPin: string
  ): { success: boolean; token?: string; error?: string } {
    if (!currentPin || !/^\d{8}$/.test(currentPin.trim())) {
      return { success: false, error: 'Current password must be 8 digits.' };
    }
    if (!newPin || !/^\d{8}$/.test(newPin.trim())) {
      return { success: false, error: 'New password must be exactly 8 digits (0-9).' };
    }

    const config = this.readConfig();
    const candidateHash = hashPin(currentPin.trim(), config.salt);
    const hashBufferA = Buffer.from(candidateHash, 'hex');
    const hashBufferB = Buffer.from(config.hash, 'hex');
    const isMatch =
      hashBufferA.length === hashBufferB.length &&
      crypto.timingSafeEqual(hashBufferA, hashBufferB);

    if (!isMatch) {
      return { success: false, error: 'Current 8-digit password is incorrect.' };
    }

    // Generate new salt and save
    const newSalt = crypto.randomBytes(16).toString('hex');
    const newHash = hashPin(newPin.trim(), newSalt);
    this.saveConfig({
      hash: newHash,
      salt: newSalt,
      isCustomized: true,
      updatedAt: new Date().toISOString(),
    });

    // Invalidate old sessions and issue new session token
    const newSessionToken = `sec_${crypto.randomUUID()}_${Date.now()}`;
    this.activeSessionToken = newSessionToken;
    this.sessionCreatedAt = Date.now();

    return {
      success: true,
      token: newSessionToken,
    };
  }
}

export const serverAuth = new ServerAuthManager();

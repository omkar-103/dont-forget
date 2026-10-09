import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { authApi, authStorage, AuthStatus } from '../api/authApi';

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionInvalidated: boolean;
  sessionTerminatedReason: string | null;
  isLockedOut: boolean;
  lockoutSeconds: number;
  attemptsRemaining: number;
  isDefaultPin: boolean;
  unlock: (pin: string) => Promise<{ success: boolean; error?: string }>;
  lock: () => Promise<void>;
  revokeAll: () => Promise<void>;
  changePin: (currentPin: string, newPin: string) => Promise<{ success: boolean; error?: string }>;
  dismissInvalidationNotice: () => void;
  checkSessionNow: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionInvalidated, setSessionInvalidated] = useState<boolean>(false);
  const [sessionTerminatedReason, setSessionTerminatedReason] = useState<string | null>(null);
  const [isLockedOut, setIsLockedOut] = useState<boolean>(false);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(5);
  const [isDefaultPin, setIsDefaultPin] = useState<boolean>(false);

  const lockoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Track consecutive heartbeat failures so we don't logout on transient errors
  const consecutiveFailuresRef = useRef<number>(0);
  const MAX_CONSECUTIVE_FAILURES = 3; // Allow 3 failed polls before acting

  /**
   * checkSession — validates the current session with the server.
   *
   * KEY FIX: We ONLY set isAuthenticated=false (trigger re-login) when:
   *   1. The server explicitly responds with sessionInvalidated=true, OR
   *   2. The server says authenticated=false AND we have no local token at all.
   *
   * We do NOT logout on:
   *   - Network errors / timeouts
   *   - Server 5xx errors
   *   - Transient failures (rate-limited to MAX_CONSECUTIVE_FAILURES)
   */
  const checkSession = useCallback(async () => {
    try {
      const status: AuthStatus = await authApi.getStatus();

      // Update lockout state regardless
      setIsLockedOut(status.isLockedOut);
      setLockoutSeconds(status.lockoutSeconds);
      setAttemptsRemaining(status.attemptsRemaining);
      setIsDefaultPin(status.isDefaultPin);

      if (status.sessionInvalidated) {
        // Server explicitly says session is revoked/expired
        consecutiveFailuresRef.current = 0;
        authStorage.clearToken();
        setIsAuthenticated(false);
        setSessionInvalidated(true);
        setSessionTerminatedReason(
          'Your session expired or was revoked. Please enter your password to unlock.'
        );
      } else if (status.authenticated) {
        // Valid session confirmed
        consecutiveFailuresRef.current = 0;
        setIsAuthenticated(true);
        setSessionInvalidated(false);
      } else {
        // Server says not authenticated
        const token = authStorage.getToken();
        if (!token) {
          // No token at all — legitimately unauthenticated
          consecutiveFailuresRef.current = 0;
          setIsAuthenticated(false);
        } else {
          // We have a token but server says unauthenticated.
          // This could be a cold-start serverless function or transient issue.
          // Don't immediately logout — count failures first.
          consecutiveFailuresRef.current += 1;
          console.warn(
            `Session check returned unauthenticated with existing token (attempt ${consecutiveFailuresRef.current}/${MAX_CONSECUTIVE_FAILURES})`
          );
          if (consecutiveFailuresRef.current >= MAX_CONSECUTIVE_FAILURES) {
            // After sustained failures, confirm with a dedicated check before logging out
            consecutiveFailuresRef.current = 0;
            authStorage.clearToken();
            setIsAuthenticated(false);
            setSessionInvalidated(true);
            setSessionTerminatedReason('Session could not be verified. Please log in again.');
          }
          // Otherwise: keep current state, retry on next heartbeat
        }
      }
    } catch (err) {
      // Network error or server crash — do NOT logout, just warn
      console.warn('Session verification check failed (network/server error):', err);
      // Don't increment consecutive failures for pure network errors
      // (server might just be cold starting on Vercel)
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial boot: check session once
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  /**
   * Periodic heartbeat — check session every 2 minutes (not 15s).
   *
   * KEY FIX: Removed the `focus` event listener that was triggering
   * session checks every time the user clicked an input field.
   * Removed the `visibilitychange` check that fired when switching tabs.
   *
   * These were causing the "logout while typing" bug:
   *  1. User opens assignment form and clicks input → focus event fires
   *  2. checkSession() is called
   *  3. If the Vercel function is cold-starting, it returns 500
   *  4. getStatus() returns authenticated:false
   *  5. Logout triggers
   *
   * Now we only heartbeat every 2 minutes and on visibility change
   * (tab switch) with a 5s delay to allow page to settle.
   */
  useEffect(() => {
    if (!isAuthenticated) return;

    // Check every 2 minutes (120 seconds) — not 15 seconds
    const interval = setInterval(() => {
      checkSession();
    }, 2 * 60 * 1000);

    // On visibility change: user returned to tab — wait 5 seconds to
    // allow the page to fully settle before checking (avoids cold-start 500s)
    let visibilityTimeout: NodeJS.Timeout | null = null;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (visibilityTimeout) clearTimeout(visibilityTimeout);
        visibilityTimeout = setTimeout(() => {
          checkSession();
        }, 5000); // 5s grace period
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    // NOTE: Do NOT add a 'focus' listener — focus fires on every input click!

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityTimeout) clearTimeout(visibilityTimeout);
    };
  }, [isAuthenticated, checkSession]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds > 0) {
      lockoutTimerRef.current = setInterval(() => {
        setLockoutSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(lockoutTimerRef.current as NodeJS.Timeout);
            setIsLockedOut(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current);
    };
  }, [lockoutSeconds]);

  // Unlock with 8-digit PIN
  const unlock = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await authApi.unlock(pin);
      if (res.success) {
        consecutiveFailuresRef.current = 0;
        setIsAuthenticated(true);
        setSessionInvalidated(false);
        setSessionTerminatedReason(null);
        setIsLockedOut(false);
        setLockoutSeconds(0);
        setAttemptsRemaining(5);
        return { success: true };
      } else {
        if (res.lockoutSeconds && res.lockoutSeconds > 0) {
          setIsLockedOut(true);
          setLockoutSeconds(res.lockoutSeconds);
        }
        if (typeof res.attemptsRemaining === 'number') {
          setAttemptsRemaining(res.attemptsRemaining);
        }
        return { success: false, error: res.error || 'Failed to unlock with 8-digit password' };
      }
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error verifying password' };
    }
  };

  // Lock site (logout current session)
  const lock = async (): Promise<void> => {
    consecutiveFailuresRef.current = 0;
    await authApi.lock();
    setIsAuthenticated(false);
    setSessionInvalidated(false);
  };

  // Revoke all sessions across all devices
  const revokeAll = async (): Promise<void> => {
    consecutiveFailuresRef.current = 0;
    await authApi.revokeAll();
    setIsAuthenticated(false);
  };

  // Change 8-digit PIN
  const changePin = async (
    currentPin: string,
    newPin: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await authApi.changePin(currentPin, newPin);
      if (res.success) {
        setIsDefaultPin(false);
        return { success: true };
      }
      return { success: false, error: res.error || 'Failed to update 8-digit password' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error updating password' };
    }
  };

  const dismissInvalidationNotice = () => {
    setSessionInvalidated(false);
    setSessionTerminatedReason(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        sessionInvalidated,
        sessionTerminatedReason,
        isLockedOut,
        lockoutSeconds,
        attemptsRemaining,
        isDefaultPin,
        unlock,
        lock,
        revokeAll,
        changePin,
        dismissInvalidationNotice,
        checkSessionNow: checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

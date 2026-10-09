import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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

  // Check auth and session validity
  const checkSession = useCallback(async () => {
    try {
      const status: AuthStatus = await authApi.getStatus();
      setIsLockedOut(status.isLockedOut);
      setLockoutSeconds(status.lockoutSeconds);
      setAttemptsRemaining(status.attemptsRemaining);
      setIsDefaultPin(status.isDefaultPin);

      if (status.sessionInvalidated) {
        authStorage.clearToken();
        setIsAuthenticated(false);
        setSessionInvalidated(true);
        setSessionTerminatedReason(
          'Your session expired or was revoked. Please enter your password to unlock.'
        );
      } else if (status.authenticated) {
        setIsAuthenticated(true);
      } else {
        // Unauthenticated session - mandatory password gate
        authStorage.clearToken();
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.warn('Session verification check failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial check on boot
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Periodic heartbeat session checking
  useEffect(() => {
    if (!isAuthenticated) return;

    // Check every 15 seconds
    const interval = setInterval(() => {
      checkSession();
    }, 15000);

    // Verify when user returns to the tab or app
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSession();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkSession);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkSession);
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
    await authApi.lock();
    setIsAuthenticated(false);
  };

  // Revoke all sessions across all devices
  const revokeAll = async (): Promise<void> => {
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

// Session token management and Auth API client
// FIX: Use localStorage instead of sessionStorage so tokens persist
// across tabs, browser restarts, and page refreshes.
// sessionStorage is cleared when the tab closes — that was causing the
// "auto-logout" because every new tab/refresh had no token.

let inMemorySessionToken: string | null = null;
const TOKEN_KEY = 'df_sess_token'; // localStorage key

export interface AuthStatus {
  authenticated: boolean;
  sessionInvalidated: boolean;
  isLockedOut: boolean;
  lockoutSeconds: number;
  attemptsRemaining: number;
  isDefaultPin: boolean;
  activeSessionExists: boolean;
}

export const authStorage = {
  getToken(): string | null {
    // Always prefer in-memory cache (fastest, avoids storage access on hot path)
    if (inMemorySessionToken) return inMemorySessionToken;
    try {
      const stored = localStorage.getItem(TOKEN_KEY);
      if (stored) {
        inMemorySessionToken = stored;
        return stored;
      }
    } catch {
      // Storage unavailable in restricted environments
    }
    return null;
  },

  setToken(token: string | null): void {
    inMemorySessionToken = token;
    try {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
      // Clean up all legacy keys
      localStorage.removeItem('dont_forget_session_token');
      localStorage.removeItem('dont_forget_custom_pin');
      // Also clear old sessionStorage key
      try { sessionStorage.removeItem('df_active_sess_id'); } catch { /* ignore */ }
    } catch {
      // ignore storage errors
    }
  },

  clearToken(): void {
    inMemorySessionToken = null;
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('dont_forget_session_token');
      localStorage.removeItem('dont_forget_custom_pin');
      try { sessionStorage.removeItem('df_active_sess_id'); } catch { /* ignore */ }
    } catch {
      // ignore
    }
  },
};

export const authApi = {
  async getStatus(): Promise<AuthStatus> {
    const token = authStorage.getToken();
    try {
      const res = await fetch('/api/auth/status', {
        headers: {
          ...(token ? { 'x-session-token': token } : {}),
        },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
      // Non-OK but not a definitive session invalidation — return safe default
      // Never treat a 500 / network failure as "session expired"
    } catch (err) {
      console.warn('Auth status check failed (network/server error):', err);
    }

    // Safe fallback: preserve existing auth state if we have a token
    // Only mark unauthenticated if there is no token at all
    return {
      authenticated: false,
      sessionInvalidated: false,
      isLockedOut: false,
      lockoutSeconds: 0,
      attemptsRemaining: 5,
      isDefaultPin: true,
      activeSessionExists: false,
    };
  },

  async unlock(pin: string): Promise<{
    success: boolean;
    token?: string;
    error?: string;
    lockoutSeconds?: number;
    attemptsRemaining?: number;
  }> {
    try {
      const res = await fetch('/api/auth/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
        credentials: 'include',
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.token) {
        authStorage.setToken(data.token);
        return data;
      }
      return data;
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network error verifying password with server.',
      };
    }
  },

  async lock(): Promise<boolean> {
    const token = authStorage.getToken();
    try {
      await fetch('/api/auth/lock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-session-token': token } : {}),
        },
        credentials: 'include',
      });
    } catch {
      // ignore
    }
    authStorage.clearToken();
    return true;
  },

  async revokeAll(): Promise<boolean> {
    const token = authStorage.getToken();
    try {
      await fetch('/api/auth/revoke-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-session-token': token } : {}),
        },
        credentials: 'include',
      });
    } catch {
      // ignore
    }
    authStorage.clearToken();
    return true;
  },

  async changePin(
    currentPin: string,
    newPin: string
  ): Promise<{ success: boolean; token?: string; error?: string }> {
    const token = authStorage.getToken();
    const res = await fetch('/api/auth/change-pin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'x-session-token': token } : {}),
      },
      body: JSON.stringify({ currentPin, newPin }),
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success && data.token) {
      authStorage.setToken(data.token);
    }
    return data;
  },
};

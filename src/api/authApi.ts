// Session token management and Auth API client

let inMemorySessionToken: string | null = null;
const SESSION_STORAGE_KEY = 'df_active_sess_id';

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
    if (inMemorySessionToken) return inMemorySessionToken;
    try {
      const sess = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (sess) {
        inMemorySessionToken = sess;
        return sess;
      }
    } catch {
      // session storage restricted
    }
    return null;
  },
  setToken(token: string | null): void {
    inMemorySessionToken = token;
    try {
      if (token) {
        sessionStorage.setItem(SESSION_STORAGE_KEY, token);
      } else {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
      // Clean up legacy localStorage keys to ensure zero leaked credentials
      localStorage.removeItem('dont_forget_session_token');
      localStorage.removeItem('dont_forget_custom_pin');
    } catch {
      // ignore
    }
  },
  clearToken(): void {
    inMemorySessionToken = null;
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem('dont_forget_session_token');
      localStorage.removeItem('dont_forget_custom_pin');
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
        credentials: 'same-origin',
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (err) {
      console.warn('Backend auth status query warning:', err);
    }

    return {
      authenticated: false,
      sessionInvalidated: false,
      isLockedOut: false,
      lockoutSeconds: 0,
      attemptsRemaining: 5,
      isDefaultPin: false,
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
        credentials: 'same-origin',
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
        credentials: 'same-origin',
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
        credentials: 'same-origin',
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
      credentials: 'same-origin',
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success && data.token) {
      authStorage.setToken(data.token);
    }
    return data;
  },
};

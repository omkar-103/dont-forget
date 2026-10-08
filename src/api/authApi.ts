// Session token management and Auth API client

const TOKEN_KEY = 'dont_forget_session_token';

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
    try {
      return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  setToken(token: string | null): void {
    try {
      if (token) {
        sessionStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        sessionStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      // storage unavailable
    }
  },
  clearToken(): void {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
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
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Backend auth status unreachable, using local fallback:', err);
    }

    const hasValidToken = Boolean(token && (token.startsWith('sec_') || token === 'client_unlocked'));
    return {
      authenticated: hasValidToken,
      sessionInvalidated: false,
      isLockedOut: false,
      lockoutSeconds: 0,
      attemptsRemaining: 5,
      isDefaultPin: !localStorage.getItem('dont_forget_custom_pin'),
      activeSessionExists: hasValidToken,
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
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.success && data.token) {
          authStorage.setToken(data.token);
          return data;
        }
      }
    } catch (err) {
      console.warn('Backend unlock request failed, checking client fallback:', err);
    }

    // Client-side fallback for static Vercel deployments:
    const customPin = localStorage.getItem('dont_forget_custom_pin');
    const validPin = customPin || '12345678';
    if (pin.trim() === validPin) {
      const token = `sec_client_${Date.now()}`;
      authStorage.setToken(token);
      return { success: true, token };
    }

    return {
      success: false,
      error: 'Incorrect 8-digit password. Try 12345678.',
    };
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
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success && data.token) {
      authStorage.setToken(data.token);
    }
    return data;
  },
};

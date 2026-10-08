# Comprehensive System Implementation Report
**Don't Forget — Personal Daily Command Center**

---

## Table of Contents
1. [Overview & Scope](#1-overview--scope)
2. [Site-Wide 8-Digit Password Protection & Anti-Bypass Architecture](#2-site-wide-8-digit-password-protection--anti-bypass-architecture)
3. [Single-Active-Session Enforcement (Multi-Device Invalidation)](#3-single-active-session-enforcement-multi-device-invalidation)
4. [Mobile-First Tactile Keypad & Laptop Ergonomics](#4-mobile-first-tactile-keypad--laptop-ergonomics)
5. [Light & Dark Mode Implementation (Tailwind CSS v4)](#5-light--dark-mode-implementation-tailwind-css-v4)
6. [3-Tier Task Priority System & Visual Indicators](#6-3-tier-task-priority-system--visual-indicators)
7. [API & Security Endpoints Reference](#7-api--security-endpoints-reference)
8. [Testing & Verification Summary](#8-testing--verification-summary)

---

## 1. Overview & Scope

This document details the architectural and functional implementation of the security, theming, and task management systems built for the **Don't Forget** Personal Daily Command Center.

Key deliverables implemented:
- **8-Digit Password Gate**: Complete site lockdown ensuring zero access to tasks, attendance, notes, or settings without successful verification.
- **Single Active Session Management**: Immediate server-enforced invalidation of any other open session, device, or browser tab when an unlock occurs.
- **Anti-Bypass Guard & Brute-Force Rate Limiting**: Zero DOM rendering when unauthenticated, server middleware protection on all data APIs, and a 5-attempt rate limiter with automated cooldowns.
- **Mobile-First & Laptop Responsive UX**: Haptic-enabled virtual numeric keypad with tactile thumb targets, physical keyboard support for laptops, fluid digit animations, and vibration feedback.
- **Light & Dark Theme Engine**: Class-based Tailwind v4 custom variant, zero-flash pre-render scripts, and header/settings switchers.
- **Task Priority System**: Low, Medium, and High priority tiers with high-contrast visual indicators, attention banners, and dynamic filtering.

---

## 2. Site-Wide 8-Digit Password Protection & Anti-Bypass Architecture

### 2.1. Threat Model & Zero-Bypass Guarantee
A common flaw in client-side locks is hiding views with CSS (`display: none` or opacity overlays), allowing malicious actors to inspect the DOM, remove the overlay element, or view raw local storage data.

To prevent bypass by any means:
1. **Root-Level Conditional Mounting (`AppGate`)**:
   - In `src/App.tsx`, the root component conditionally renders `SecurityLockScreen` when `!isAuthenticated`.
   - Neither `AppProvider`, `AttendanceProvider`, nor `MainContent` (tasks, assignments, checklists, calendar) are mounted in the React component tree until the server confirms a valid session token.
2. **Server Middleware Authorization**:
   - In `server.ts`, Express middleware (`requireValidSession`) intercepts all calls to `/api/attendance/*` and `/api/subjects/*`.
   - Requests without an active session token receive an immediate `401 Unauthorized` with `{ sessionInvalidated: true }`.
3. **Cryptographic Hashing & Constant-Time Comparison**:
   - Passwords are never stored in plaintext.
   - Hashed using **PBKDF2** (`crypto.pbkdf2Sync`) with **100,000 iterations**, **SHA-256**, and a unique cryptographic 16-byte random salt.
   - Evaluated via `crypto.timingSafeEqual` to eliminate timing attack vectors.
4. **Persistent Vault Storage**:
   - Stored in `.security-vault.json`.
   - Default initial 8-digit password: `12345678`.
   - The user can update this password at any time via the **Settings Modal** under the *Site Security & 8-Digit Password* section.

---

## 3. Single-Active-Session Enforcement (Multi-Device Invalidation)

### 3.1. Mechanism & Lifecycle
When the user unlocks the Command Center:
1. The server generates a unique session token: `sec_<uuid>_<timestamp>`.
2. The server sets `activeSessionToken = newSessionToken`, immediately revoking any previous token across any other browser tab, phone, or laptop.
3. The client stores the token in session/local storage for authenticated requests (`x-session-token` header).

```text
[ Device A (Mobile) ]                      [ Server ]                    [ Device B (Laptop) ]
         |                                     |                                   |
         | --- Unlock(PIN: 12345678) --------> |                                   |
         | <--- Token A (Issued) ------------- |                                   |
         | (Authenticated & Active)            |                                   |
         |                                     | <--- Unlock(PIN: 12345678) ------ |
         |                                     | --- Token B (Issued, A Revoked) ->|
         |                                     |                                   |
         | --- Heartbeat / Data Check -------> |                                   |
         | <--- 401 { sessionInvalidated } --- |                                   |
         |                                     |                                   |
[ Session Terminated Banner ]                  |                          [ Active Session ]
```

### 3.2. Real-Time Heartbeat & Visibility Verification
- `AuthContext.tsx` maintains a periodic heartbeat check every 3.5 seconds.
- An event listener on `visibilitychange` and `window.onfocus` verifies token freshness the instant a user switches tabs or returns to the application.
- If invalidated, the client:
  1. Clears local session tokens.
  2. Unmounts the application views immediately.
  3. Displays a warning banner: *"Session Logged Out: Another device or window just unlocked the site."*

### 3.3. Brute-Force Rate Limiting & Cooldown
- Tracks consecutive failed unlock attempts in memory.
- If 5 incorrect passwords are typed, a **30-second security cooldown** is activated.
- The UI displays a live countdown timer and disables all inputs until the cooldown expires.

---

## 4. Mobile-First Tactile Keypad & Laptop Ergonomics

### 4.1. Mobile Experience
- **Tactile Virtual Keypad**: Designed specifically for mobile thumb reach with 60px rounded buttons (`h-13 sm:h-15 rounded-2xl`).
- **Haptic Vibration**: Calls `navigator.vibrate([10])` on tap, and an error vibration pattern `[40, 50, 40]` on incorrect code entry.
- **8 Distinct PIN Slots**: Visual feedback boxes that display active glowing focus rings, filled indicator dots, or revealable digits via the "Show Digits" toggle.
- **Auto-Submission**: Automatically submits upon entering the 8th digit without requiring extra taps.

### 4.2. Laptop & Desktop Experience
- **Keyboard Listener**: Laptop users can simply type digits `0`–`9` on their physical keyboard, press `Backspace` to delete, `Escape` or `C` to clear, and `Enter` to submit.
- **Centered Glassmorphic Shield**: Centered card layout with ambient backdrop blur, glow borders, and clean typography.
- **Quick Lock Action**: Added a persistent **Lock Site** button (with Lock icon) in the header navigation and Settings modal for 1-click manual locking.

---

## 5. Light & Dark Mode Implementation (Tailwind CSS v4)

### 5.1. Root Cause & Solution
In Tailwind CSS v4, the `dark:` utility variant defaults to `@media (prefers-color-scheme: dark)`. Because the app controls the theme via a `.dark` class on the `<html>` root, the standard utilities were not responding to class changes.

**Fix Applied in `src/index.css`**:
```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

@layer base {
  :root {
    color-scheme: light;
  }
  :root.dark, html.dark {
    color-scheme: dark;
  }
}
```

### 5.2. Zero-Flash Inline Head Script
Added an inline script to `<head>` in `index.html` to inspect localStorage before DOM render:
```html
<script>
  (function() {
    try {
      var raw = localStorage.getItem('dont_forget_app_data');
      var theme = raw ? (JSON.parse(raw).settings?.theme || 'system') : 'system';
      var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    } catch(e) {}
  })();
</script>
```

### 5.3. Controls & Toggles
- **Header Action Button**: Quick toggle between Light and Dark mode with rotating Sun / Moon icons.
- **Settings Modal 3-Way Selector**: Segmented buttons for **Light**, **Dark**, and **System** mode with real-time status indication.

---

## 6. 3-Tier Task Priority System & Visual Indicators

### 6.1. Priority Taxonomy
| Priority | Visual Icon | Accent Treatment | Usage Context |
| :--- | :---: | :--- | :--- |
| **High** | 🔥 `Flame` | `border-l-[5px] border-l-rose-500`, Crimson Badge, Warm Gradient | Urgent tasks requiring immediate action today. |
| **Medium** | ⚡ `Zap` | `border-l-[4px] border-l-amber-500`, Amber Badge | Standard daily tasks, assignments, and lectures. |
| **Low** | 🌱 `ArrowDown` | `border-l-[3px] border-l-slate-400`, Slate Badge | Optional tasks, minor reminders, and low-impact notes. |

### 6.2. Visual Indicators in `TasksView`
- **Urgent Attention Callout Banner**: Appears at the top of the tasks view whenever incomplete High-Priority tasks are due today or overdue. Includes a **"Focus High"** filter button.
- **Crimson Checkbox Ring**: High-priority tasks display a distinct crimson ring on the completion checkbox.
- **Priority Filter Chips**: Filter pills in TasksView with dynamic counters for Low, Medium, and High items.

---

## 7. API & Security Endpoints Reference

| Endpoint | Method | Headers / Body | Description |
| :--- | :---: | :--- | :--- |
| `/api/auth/status` | `GET` | `x-session-token: <token>` | Returns authentication state, lockout timer, attempts remaining, and session displacement status. |
| `/api/auth/unlock` | `POST` | `{ "pin": "12345678" }` | Validates 8-digit PIN. On success, invalidates all other active sessions and returns a new session token. |
| `/api/auth/lock` | `POST` | `x-session-token: <token>` | Manually revokes the active session token and locks the site. |
| `/api/auth/change-pin` | `POST` | `{ "currentPin": "...", "newPin": "..." }` | Updates the 8-digit password in `.security-vault.json`, generates a new token, and revokes other sessions. |
| `/api/attendance/*` | `ALL` | `x-session-token: <token>` | Protected data endpoints; rejects with `401` if session is missing or invalidated. |
| `/api/subjects/*` | `ALL` | `x-session-token: <token>` | Protected data endpoints; rejects with `401` if session is missing or invalidated. |

---

## 8. Testing & Verification Summary

1. **Compilation & Linting**:
   - `npm run lint` (`tsc --noEmit`): **0 errors**.
   - `vite build` (`npm run build`): Compiled cleanly with all modules resolved.
2. **Security & Session Test Suite**:
   - `Test 1 (Initial Status)`: Confirmed site is initially locked.
   - `Test 2 (Incorrect PIN)`: Rejected with 401 status and decremented attempt counter.
   - `Test 3 (Successful Unlock)`: Validated PIN `12345678`, issued cryptographic session token.
   - `Test 4 (Multi-Device Invalidation)`: Simulated Client B unlocking; confirmed Client A received `sessionInvalidated: true` on subsequent check.
   - `Test 5 (Rate Limiter Lockout)`: Confirmed 5 failed attempts triggered the 30-second cooldown lock.
3. **Responsive UX Validation**:
   - Verified tactile keypad layout on mobile viewports.
   - Verified physical keyboard input (0-9, Backspace, Enter, Esc) on desktop/laptop environments.

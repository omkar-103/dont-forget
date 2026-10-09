import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  Unlock,
  ShieldAlert,
  ShieldCheck,
  Eye,
  EyeOff,
  Delete,
  Smartphone,
  Laptop,
  AlertCircle,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const SecurityLockScreen: React.FC = () => {
  const {
    unlock,
    isLockedOut,
    lockoutSeconds,
    attemptsRemaining,
    sessionInvalidated,
    sessionTerminatedReason,
    dismissInvalidationNotice,
    isDefaultPin,
  } = useAuth();

  const [pin, setPin] = useState<string>('');
  const [showDigits, setShowDigits] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // Trigger haptic feedback if supported on mobile
  const triggerHaptic = useCallback((pattern: number | number[] = 12) => {
    try {
      if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch {
      // Ignore if not supported
    }
  }, []);

  // Handle PIN submission
  const handleUnlock = useCallback(
    async (codeToVerify?: string) => {
      const code = (codeToVerify || pin).trim();
      if (code.length !== 8) {
        setErrorMsg('Please enter all 8 digits.');
        return;
      }
      if (isLockedOut) return;

      setIsSubmitting(true);
      setErrorMsg(null);

      const res = await unlock(code);
      setIsSubmitting(false);

      if (!res.success) {
        setIsShaking(true);
        triggerHaptic([40, 50, 40]);
        setErrorMsg(res.error || 'Incorrect 8-digit password.');
        setPin('');
        setTimeout(() => setIsShaking(false), 550);
      } else {
        triggerHaptic(25);
      }
    },
    [pin, isLockedOut, unlock, triggerHaptic]
  );

  // Auto-submit when user reaches 8 digits
  useEffect(() => {
    if (pin.length === 8 && !isSubmitting && !isLockedOut) {
      handleUnlock(pin);
    }
  }, [pin, isSubmitting, isLockedOut, handleUnlock]);

  // Handle number pad button clicks
  const handleDigitClick = (digit: string) => {
    if (isLockedOut || isSubmitting) return;
    if (pin.length < 8) {
      triggerHaptic(10);
      setErrorMsg(null);
      setPin((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    if (isLockedOut || isSubmitting) return;
    triggerHaptic(10);
    setErrorMsg(null);
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (isLockedOut || isSubmitting) return;
    triggerHaptic(15);
    setErrorMsg(null);
    setPin('');
  };

  const handleFillDefault = () => {
    if (isLockedOut || isSubmitting) return;
    triggerHaptic(15);
    setPin('12345678');
    handleUnlock('12345678');
  };

  // Keyboard navigation for laptop/desktop users
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLockedOut || isSubmitting) return;

      // Allow digits 0-9
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        if (pin.length < 8) {
          setErrorMsg(null);
          setPin((prev) => prev + e.key);
        }
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setErrorMsg(null);
        setPin((prev) => prev.slice(0, -1));
      } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        if (e.key !== 'c' && e.key !== 'C') {
          e.preventDefault();
          setPin('');
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (pin.length === 8) {
          handleUnlock(pin);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, isLockedOut, isSubmitting, handleUnlock]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-3 sm:p-6 bg-slate-950 text-slate-100 relative overflow-x-hidden selection:bg-rose-500 selection:text-white">
      {/* Ambient background decoration */}
      <div className="fixed inset-0 pointer-events-none opacity-40">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-rose-900/30 via-indigo-900/30 to-emerald-900/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 left-10 w-72 h-72 bg-blue-900/20 rounded-full blur-2xl" />
      </div>

      {/* Invisible input to keep mobile keyboard optional if user taps */}
      <input
        ref={hiddenInputRef}
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={8}
        value={pin}
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, '').slice(0, 8);
          setPin(val);
        }}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />

      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        {/* Displaced / Logged Out Session Alert Banner */}
        <AnimatePresence>
          {sessionInvalidated && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="w-full mb-4 p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs sm:text-sm flex items-start gap-3 shadow-lg shadow-amber-950/40 backdrop-blur-md"
            >
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-amber-300">Session Required</p>
                <p className="mt-0.5 text-amber-200/90 leading-relaxed">
                  {sessionTerminatedReason ||
                    'Your session expired or was logged out. Please enter your 8-digit password to continue.'}
                </p>
              </div>
              <button
                type="button"
                onClick={dismissInvalidationNotice}
                className="text-amber-400 hover:text-amber-200 text-xs font-bold underline shrink-0 px-1 py-0.5"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Security Vault Card */}
        <motion.div
          animate={
            isShaking
              ? {
                  x: [-12, 12, -8, 8, -4, 4, 0],
                  transition: { duration: 0.5 },
                }
              : {}
          }
          className="w-full bg-slate-900/80 border border-slate-800 backdrop-blur-xl rounded-3xl p-4 sm:p-7 shadow-2xl shadow-black/80 flex flex-col items-center text-center"
        >
          {/* Header Shield & Status */}
          <div className="relative mb-3">
            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-rose-500/20 via-indigo-500/20 to-slate-800 flex items-center justify-center border border-rose-500/30 shadow-inner">
              {isLockedOut ? (
                <ShieldAlert className="w-8 h-8 text-rose-400 animate-pulse" />
              ) : isSubmitting ? (
                <RefreshCw className="w-8 h-8 text-rose-400 animate-spin" />
              ) : (
                <Lock className="w-8 h-8 text-rose-400" />
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-slate-950 rounded-full p-1 border border-slate-800">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1">
            Site Locked & Protected
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mb-5 max-w-xs leading-relaxed">
            Enter the 8-digit secure password to unlock Don&apos;t Forget Command Center.
          </p>

          {/* Device & Mode indicator */}
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300 font-medium mb-5">
            <Smartphone className="w-3.5 h-3.5 text-rose-400" />
            <span>Mobile Tactile</span>
            <span className="text-slate-500">·</span>
            <Laptop className="w-3.5 h-3.5 text-indigo-400" />
            <span>Laptop Keyboard Ready</span>
          </div>

          {/* 8-Digit PIN Slots - Responsive sizes for all screen widths */}
          <div className="w-full flex items-center justify-center gap-1 sm:gap-2 mb-3 px-0.5">
            {Array.from({ length: 8 }).map((_, idx) => {
              const isFilled = idx < pin.length;
              const isCurrent = idx === pin.length && !isLockedOut;
              const digitVal = pin[idx];

              return (
                <div
                  key={idx}
                  className={`w-7 h-10 min-[370px]:w-8 min-[370px]:h-11 sm:w-11 sm:h-13 rounded-lg sm:rounded-xl border flex items-center justify-center font-mono font-bold text-base sm:text-xl transition-all duration-200 select-none ${
                    isFilled
                      ? 'border-rose-500/80 bg-rose-500/15 text-white shadow-sm shadow-rose-500/20'
                      : isCurrent
                      ? 'border-indigo-400 bg-slate-800/80 ring-2 ring-indigo-500/30'
                      : 'border-slate-800 bg-slate-950/60 text-slate-600'
                  }`}
                >
                  {isFilled ? (
                    showDigits ? (
                      <span className="animate-in fade-in zoom-in-75 duration-150">{digitVal}</span>
                    ) : (
                      <span className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-rose-400 animate-in zoom-in-50 duration-150 shadow-sm shadow-rose-400" />
                    )
                  ) : isCurrent ? (
                    <span className="w-1.5 h-4 bg-indigo-400 rounded-full animate-pulse" />
                  ) : (
                    <span className="text-slate-700 font-normal">·</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Controls below PIN slots: Show digits toggle & Clear */}
          <div className="w-full flex items-center justify-between px-2 mb-4 text-xs text-slate-400">
            <button
              type="button"
              onClick={() => setShowDigits(!showDigits)}
              className="inline-flex items-center gap-1.5 hover:text-slate-200 transition-colors py-1 cursor-pointer"
            >
              {showDigits ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                  <span>Mask Digits</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  <span>Show Digits</span>
                </>
              )}
            </button>

            <span className="text-[11px] text-slate-500">
              {pin.length} / 8 digits
            </span>

            {pin.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="hover:text-rose-400 transition-colors py-1 cursor-pointer font-medium"
              >
                Clear
              </button>
            )}
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full mb-4 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-medium flex items-center justify-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </motion.div>
          )}

          {isLockedOut && (
            <div className="w-full mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-600/60 text-rose-300 text-xs text-center font-medium">
              <p className="font-bold text-rose-200">Security Cooldown Active</p>
              <p className="mt-1">
                Please wait <span className="font-mono font-bold text-white text-sm">{lockoutSeconds}s</span> before retrying.
              </p>
            </div>
          )}

          {!isLockedOut && attemptsRemaining < 5 && (
            <div className="text-[11px] text-amber-400/90 mb-3">
              ⚠️ {attemptsRemaining} attempt{attemptsRemaining === 1 ? '' : 's'} remaining before security cooldown
            </div>
          )}

          {/* Virtual Tactile Numeric Keypad (Optimized for mobile thumbs & touchscreen) */}
          <div className="w-full grid grid-cols-3 gap-2 sm:gap-3 max-w-xs mt-1 mb-4 select-none">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigitClick(digit)}
                disabled={isLockedOut || isSubmitting}
                className="h-13 sm:h-15 rounded-2xl bg-slate-800/60 hover:bg-slate-700/80 active:bg-rose-500/30 active:scale-95 border border-slate-700/60 text-xl sm:text-2xl font-bold font-mono text-white transition-all duration-100 flex items-center justify-center cursor-pointer shadow-sm disabled:opacity-40 disabled:pointer-events-none"
              >
                {digit}
              </button>
            ))}

            {/* Clear Button */}
            <button
              type="button"
              onClick={handleClear}
              disabled={isLockedOut || isSubmitting || pin.length === 0}
              className="h-13 sm:h-15 rounded-2xl bg-slate-800/40 hover:bg-slate-800 active:scale-95 border border-slate-800 text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-all duration-100 flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
            >
              Clear
            </button>

            {/* Zero Button */}
            <button
              type="button"
              onClick={() => handleDigitClick('0')}
              disabled={isLockedOut || isSubmitting}
              className="h-13 sm:h-15 rounded-2xl bg-slate-800/60 hover:bg-slate-700/80 active:bg-rose-500/30 active:scale-95 border border-slate-700/60 text-xl sm:text-2xl font-bold font-mono text-white transition-all duration-100 flex items-center justify-center cursor-pointer shadow-sm disabled:opacity-40 disabled:pointer-events-none"
            >
              0
            </button>

            {/* Backspace Button */}
            <button
              type="button"
              onClick={handleBackspace}
              disabled={isLockedOut || isSubmitting || pin.length === 0}
              className="h-13 sm:h-15 rounded-2xl bg-slate-800/40 hover:bg-slate-800 active:scale-95 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all duration-100 flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
              aria-label="Backspace"
            >
              <Delete className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Action unlock button for manual trigger if needed */}
          <button
            type="button"
            onClick={() => handleUnlock()}
            disabled={pin.length !== 8 || isLockedOut || isSubmitting}
            className="w-full max-w-xs py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-rose-900/40 cursor-pointer disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Verifying Password...</span>
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                <span>Unlock Command Center</span>
              </>
            )}
          </button>

            <div className="w-full mt-5 pt-4 border-t border-slate-800/80 text-left">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-300">Default 8-Digit Password:</span>
                <button
                  type="button"
                  onClick={handleFillDefault}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/25 hover:bg-rose-500/35 text-rose-300 font-mono text-xs font-bold border border-rose-500/40 transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Instant Unlock (12345678)</span>
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400 leading-normal">
                Default password is <code className="text-rose-400 font-mono font-bold">12345678</code>. Tap above to unlock instantly with zero typing.
              </p>
            </div>
        </motion.div>

        {/* Security badge footer */}
        <div className="mt-5 flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Server-Side Password Authentication Active · Central Database Sync Guard</span>
        </div>
      </div>
    </div>
  );
};

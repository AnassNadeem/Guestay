import { useLogout } from "@refinedev/core";
import { useCallback, useEffect, useRef, useState } from "react";

/** Quiet period before the inactivity warning starts. */
const IDLE_MS = 5 * 60 * 1000;
/** Countdown after idle before forced logout. */
const WARN_MS = 60 * 1000;

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "pointerdown",
  "wheel",
];

/**
 * After 5 minutes with no input, shows a warning with a 60s continue window.
 * Continue resets the idle clock; expiry logs out to /login.
 */
export function IdleSessionGuard() {
  const { mutate: logout } = useLogout();
  const [warningOpen, setWarningOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);

  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const warnDeadline = useRef<number>(0);
  const warningOpenRef = useRef(false);

  const clearIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = null;
  }, []);

  const clearWarn = useCallback(() => {
    if (warnTimer.current) clearInterval(warnTimer.current);
    warnTimer.current = null;
  }, []);

  const forceLogout = useCallback(() => {
    clearIdle();
    clearWarn();
    warningOpenRef.current = false;
    setWarningOpen(false);
    logout();
  }, [clearIdle, clearWarn, logout]);

  const startWarn = useCallback(() => {
    if (warningOpenRef.current) return;
    warningOpenRef.current = true;
    setWarningOpen(true);
    warnDeadline.current = Date.now() + WARN_MS;
    setSecondsLeft(Math.ceil(WARN_MS / 1000));
    clearWarn();
    warnTimer.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((warnDeadline.current - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) forceLogout();
    }, 250);
  }, [clearWarn, forceLogout]);

  const armIdle = useCallback(() => {
    clearIdle();
    if (warningOpenRef.current) return;
    idleTimer.current = setTimeout(startWarn, IDLE_MS);
  }, [clearIdle, startWarn]);

  const continueSession = useCallback(() => {
    clearWarn();
    warningOpenRef.current = false;
    setWarningOpen(false);
    setSecondsLeft(60);
    armIdle();
  }, [armIdle, clearWarn]);

  useEffect(() => {
    const onActivity = () => {
      if (warningOpenRef.current) return;
      armIdle();
    };

    armIdle();
    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, onActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", onActivity);

    return () => {
      clearIdle();
      clearWarn();
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, onActivity);
      }
      document.removeEventListener("visibilitychange", onActivity);
    };
  }, [armIdle, clearIdle, clearWarn]);

  if (!warningOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="idle-title">
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <h2 id="idle-title" style={{ margin: 0 }}>
          Session inactive
        </h2>
        <p style={{ marginTop: 12, color: "#6b6b60", fontSize: 14, lineHeight: 1.5 }}>
          You have been inactive for more than 5 minutes. Click continue to keep
          your session, or you will be signed out in{" "}
          <strong style={{ color: "var(--olive)" }}>{secondsLeft}s</strong>.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <button type="button" className="btn secondary" onClick={forceLogout}>
            Sign out
          </button>
          <button type="button" className="btn" onClick={continueSession}>
            Continue session
          </button>
        </div>
      </div>
    </div>
  );
}

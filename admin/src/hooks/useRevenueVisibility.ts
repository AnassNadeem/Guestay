import { useCallback, useEffect, useState } from "react";

const KEY = "guestay_show_revenue";

/**
 * Session-only revenue mask. Defaults to masked (hidden) at the start of every
 * new browser session because sessionStorage is cleared when the tab closes.
 * Multiple components share the same value via a lightweight event bus.
 */
export function useRevenueVisibility() {
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(KEY) === "1";
  });

  useEffect(() => {
    function sync() {
      setVisible(sessionStorage.getItem(KEY) === "1");
    }
    window.addEventListener("guestay-revenue-visibility", sync);
    return () => window.removeEventListener("guestay-revenue-visibility", sync);
  }, []);

  const toggle = useCallback(() => {
    const next = sessionStorage.getItem(KEY) === "1" ? "0" : "1";
    sessionStorage.setItem(KEY, next);
    window.dispatchEvent(new Event("guestay-revenue-visibility"));
    setVisible(next === "1");
  }, []);

  const format = useCallback(
    (amount: number) =>
      visible ? `Rs ${amount.toLocaleString()}` : "Rs •••••",
    [visible],
  );

  return { visible, toggle, format };
}

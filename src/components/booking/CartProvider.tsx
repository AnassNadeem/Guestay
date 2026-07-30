"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { BookingMode } from "@/types";

export type CartItem = {
  id: string;
  roomId: string;
  roomSlug: string;
  roomName: string;
  coverImage: string;
  bookingMode: BookingMode;
  checkIn: string;
  checkOut: string;
  guests: number;
  bedsBooked: number;
  nights: number;
  ratePerNightPkr: number;
  subtotalPkr: number;
  effectivePerNightPkr: number;
  /** Server hold id (Supabase or local) — source of truth for expiry */
  bookingId?: string;
  holdExpiresAt?: string | null;
  reference?: string;
};

type AddItemInput = Omit<
  CartItem,
  "id" | "bookingId" | "holdExpiresAt" | "reference"
>;

type CartContextValue = {
  items: CartItem[];
  addItem: (item: AddItemInput) => Promise<CartItem | null>;
  removeItem: (id: string) => void;
  updateItem: (id: string, patch: Partial<CartItem>) => void;
  clear: () => void;
  count: number;
  totalPkr: number;
  justAdded: boolean;
  soonestHoldExpiresAt: string | null;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "guestay_cart_v2";

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem("guestay_cart_v1");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    setItems(loadCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = useCallback(async (item: AddItemInput) => {
    const id = `${item.roomId}-${item.checkIn}-${item.checkOut}-${Date.now()}`;
    const optimistic: CartItem = { ...item, id };

    setItems((prev) => [...prev, optimistic]);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 400);

    try {
      const res = await fetch("/api/bookings/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomSlug: item.roomSlug,
          mode: item.bookingMode,
          checkIn: item.checkIn,
          checkOut: item.checkOut,
          guests: item.guests,
          cartItemId: id,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not hold room");
      }
      const hold = await res.json();
      const patched: CartItem = {
        ...optimistic,
        bookingId: hold.bookingId,
        holdExpiresAt: hold.holdExpiresAt,
        reference: hold.reference,
        nights: hold.nights ?? optimistic.nights,
        ratePerNightPkr: hold.ratePerNightPkr ?? optimistic.ratePerNightPkr,
        subtotalPkr: hold.subtotalPkr ?? optimistic.subtotalPkr,
        effectivePerNightPkr:
          hold.effectivePerNightPkr ?? optimistic.effectivePerNightPkr,
        bedsBooked: hold.bedsBooked ?? optimistic.bedsBooked,
      };
      setItems((prev) => prev.map((i) => (i.id === id ? patched : i)));
      return patched;
    } catch {
      // Keep optimistic line — hold may still succeed via local-store on retry
      return optimistic;
    }
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.bookingId) {
        void fetch("/api/bookings/extend-hold", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: target.bookingId, release: true }),
        }).catch(() => undefined);
      }
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const updateItem = useCallback((id: string, patch: Partial<CartItem>) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const soonestHoldExpiresAt = useMemo(() => {
    const times = items
      .map((i) => i.holdExpiresAt)
      .filter((t): t is string => Boolean(t))
      .map((t) => new Date(t).getTime())
      .filter((t) => !Number.isNaN(t));
    if (times.length === 0) return null;
    return new Date(Math.min(...times)).toISOString();
  }, [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      addItem,
      removeItem,
      updateItem,
      clear,
      count: items.length,
      totalPkr: items.reduce((s, i) => s + i.subtotalPkr, 0),
      justAdded,
      soonestHoldExpiresAt,
    }),
    [
      items,
      addItem,
      removeItem,
      updateItem,
      clear,
      justAdded,
      soonestHoldExpiresAt,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

export function useCartOptional() {
  return useContext(CartContext);
}

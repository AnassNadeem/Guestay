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
  /** Set only after checkout starts a real inventory hold */
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
  /** Drop checkout holds from saved items without removing the saves */
  clearHoldMeta: () => void;
  isSaved: (roomId: string, checkIn?: string, checkOut?: string) => boolean;
  count: number;
  totalPkr: number;
  justAdded: boolean;
  soonestHoldExpiresAt: string | null;
  hydrated: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "guestay_saved_v1";
const LEGACY_KEYS = ["guestay_cart_v2", "guestay_cart_v1"];

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      for (const key of LEGACY_KEYS) {
        raw = localStorage.getItem(key);
        if (raw) break;
      }
    }
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(parsed)) return [];
    // Soft saves: strip expired / stale hold metadata from browse cart
    return parsed.map((item) => {
      const expired =
        item.holdExpiresAt &&
        new Date(item.holdExpiresAt).getTime() <= Date.now();
      if (!item.bookingId && !item.holdExpiresAt) return item;
      if (expired) {
        const { bookingId: _b, holdExpiresAt: _h, reference: _r, ...rest } =
          item;
        return rest;
      }
      return item;
    });
  } catch {
    return [];
  }
}

function releaseHold(bookingId: string) {
  void fetch("/api/bookings/extend-hold", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookingId, release: true }),
  }).catch(() => undefined);
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
    for (const key of LEGACY_KEYS) {
      localStorage.removeItem(key);
    }
  }, [items, hydrated]);

  const addItem = useCallback(async (item: AddItemInput) => {
    // Soft save only — no inventory hold until checkout
    const id = `${item.roomId}-${item.checkIn}-${item.checkOut}-${Date.now()}`;
    const saved: CartItem = { ...item, id };

    setItems((prev) => {
      const dup = prev.find(
        (i) =>
          i.roomId === item.roomId &&
          i.checkIn === item.checkIn &&
          i.checkOut === item.checkOut &&
          i.bookingMode === item.bookingMode,
      );
      if (dup) return prev;
      return [...prev, saved];
    });
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 400);
    return saved;
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.bookingId) releaseHold(target.bookingId);
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const updateItem = useCallback((id: string, patch: Partial<CartItem>) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    );
  }, []);

  const clear = useCallback(() => {
    setItems((prev) => {
      for (const item of prev) {
        if (item.bookingId) releaseHold(item.bookingId);
      }
      return [];
    });
  }, []);

  const clearHoldMeta = useCallback(() => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.bookingId) releaseHold(item.bookingId);
        const { bookingId: _b, holdExpiresAt: _h, reference: _r, ...rest } =
          item;
        return rest;
      }),
    );
  }, []);

  const isSaved = useCallback(
    (roomId: string, checkIn?: string, checkOut?: string) => {
      return items.some(
        (i) =>
          i.roomId === roomId &&
          (!checkIn || i.checkIn === checkIn) &&
          (!checkOut || i.checkOut === checkOut),
      );
    },
    [items],
  );

  const soonestHoldExpiresAt = useMemo(() => {
    const times = items
      .map((i) => i.holdExpiresAt)
      .filter((t): t is string => Boolean(t))
      .map((t) => new Date(t).getTime())
      .filter((t) => !Number.isNaN(t) && t > Date.now());
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
      clearHoldMeta,
      isSaved,
      count: items.length,
      totalPkr: items.reduce((s, i) => s + i.subtotalPkr, 0),
      justAdded,
      soonestHoldExpiresAt,
      hydrated,
    }),
    [
      items,
      addItem,
      removeItem,
      updateItem,
      clear,
      clearHoldMeta,
      isSaved,
      justAdded,
      soonestHoldExpiresAt,
      hydrated,
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

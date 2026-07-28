"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
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
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, patch: Partial<CartItem>) => void;
  clear: () => void;
  count: number;
  totalPkr: number;
  justAdded: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "guestay_cart_v1";

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
  const [hasEntered, setHasEntered] = useState(false);

  useEffect(() => {
    setItems(loadCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = useCallback((item: Omit<CartItem, "id">) => {
    const id = `${item.roomId}-${item.checkIn}-${item.checkOut}-${Date.now()}`;
    setItems((prev) => [...prev, { ...item, id }]);
    setJustAdded(true);
    setHasEntered(true);
    window.setTimeout(() => setJustAdded(false), 400);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateItem = useCallback((id: string, patch: Partial<CartItem>) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      addItem,
      removeItem,
      updateItem,
      clear,
      count: items.length,
      totalPkr: items.reduce((s, i) => s + i.subtotalPkr, 0),
      justAdded: justAdded || (hasEntered && items.length > 0 && justAdded),
    }),
    [items, addItem, removeItem, updateItem, clear, justAdded, hasEntered],
  );

  // Expose first-entrance separately via count
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

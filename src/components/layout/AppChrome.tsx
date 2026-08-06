"use client";

import { CartProvider } from "@/components/booking/CartProvider";
import { PromoPopout } from "@/components/home/PromoPopout";
import { Footer } from "@/components/layout/Footer";
import { Nav } from "@/components/layout/Nav";
import { ToastProvider } from "@/components/ui/Toast";

export function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <CartProvider>
        <Nav />
        <main className="min-h-screen">{children}</main>
        <Footer />
        <PromoPopout />
      </CartProvider>
    </ToastProvider>
  );
}

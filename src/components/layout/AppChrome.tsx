"use client";

import { BookingBadge } from "@/components/booking/BookingBadge";
import { CartProvider } from "@/components/booking/CartProvider";
import { PromoPopout } from "@/components/home/PromoPopout";
import { Footer } from "@/components/layout/Footer";
import { Nav } from "@/components/layout/Nav";
import { ToastProvider } from "@/components/ui/Toast";
import { usePathname } from "next/navigation";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <ToastProvider>
      <CartProvider>
        <Nav />
        <main className="min-h-screen">{children}</main>
        <Footer />
        <PromoPopout />
        <BookingBadge />
      </CartProvider>
    </ToastProvider>
  );
}

import { AuthHashHandler } from "@/components/auth/AuthHashHandler";
import { LoginForm } from "@/components/auth/LoginForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in or create a Guestay guest account.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-paper px-4 pb-16 pt-24 md:pt-28">
      <AuthHashHandler />
      <LoginForm />
    </div>
  );
}

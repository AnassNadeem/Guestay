import { LoginForm } from "@/components/auth/LoginForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in",
  description: "Magic-link login for Guestay guest accounts.",
};

export default function LoginPage() {
  return (
    <div className="bg-paper pt-24 md:pt-28">
      <div className="container-page max-w-narrow pb-20">
        <h1 className="font-display text-4xl text-ink">Log in</h1>
        <p className="mt-3 text-ink-muted">
          No password form. We email a magic link. Accounts are created
          automatically when you book.
        </p>
        <div className="mt-8">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}

import { useLogin } from "@refinedev/core";
import { useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { EyeIcon, EyeOffIcon } from "../components/icons";
import { usePageMeta } from "../hooks/usePageMeta";
import { SITE_URL } from "../lib/format";

type View = "login" | "forgot" | "contact";

export function LoginPage() {
  usePageMeta("Sign in", "Guestay Admin staff login");
  const { mutate: login, isLoading } = useLogin();
  const [params] = useSearchParams();
  const nextPath = useMemo(() => {
    const n = params.get("next") || "";
    return n.startsWith("/") && !n.startsWith("//") ? n : "/";
  }, [params]);

  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [helpMessage, setHelpMessage] = useState("");

  async function sendReset(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const trimmed = email.trim().toLowerCase();
      if (!trimmed) throw new Error("Enter your email");
      const res = await fetch(`${SITE_URL}/api/admin/staff/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!res.ok) throw new Error(data.error || "Could not send reset email");
      setMessage(
        data.message ||
          "If that email belongs to a staff account, a reset link has been sent.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email");
    } finally {
      setBusy(false);
    }
  }

  async function contactAdmin(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const trimmed = email.trim().toLowerCase();
      if (!trimmed) throw new Error("Enter your email so we can help");
      const res = await fetch(`${SITE_URL}/api/admin/staff/contact-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          message: helpMessage.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!res.ok) throw new Error(data.error || "Could not contact admin");
      setMessage(data.message || "Help request sent to the admin team.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not contact admin");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div className="card" style={{ width: "min(100%, 400px)" }}>
        {view === "login" && (
          <form
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              const trimmedEmail = email.trim().toLowerCase();
              if (!trimmedEmail) {
                setError("Enter your email");
                return;
              }
              if (!password) {
                setError("Enter your password");
                return;
              }
              login(
                { email: trimmedEmail, password, redirectTo: nextPath },
                {
                  onError: (err) =>
                    setError(
                      (err as { message?: string })?.message ||
                        "Invalid credentials",
                    ),
                },
              );
            }}
          >
            <h1>Guestay Admin</h1>
            <p style={{ color: "#6b6b60", fontSize: 14 }}>
              Admin and manager login
            </p>
            <label style={{ display: "block", marginTop: 16, fontSize: 14 }}>
              Email
              <input
                type="email"
                name="admin-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
                autoComplete="username"
                autoFocus
                required
                style={fieldStyle}
              />
            </label>
            <label style={{ display: "block", marginTop: 12, fontSize: 14 }}>
              Password
              <div style={{ position: "relative", marginTop: 6 }}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="admin-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                  style={{ ...fieldStyle, marginTop: 0, paddingRight: 44 }}
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                >
                  {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>
            </label>
            {error && (
              <p style={{ color: "#b42318", fontSize: 13, marginTop: 10 }}>{error}</p>
            )}
            <button
              type="submit"
              className="btn"
              style={{ width: "100%", marginTop: 16 }}
              disabled={isLoading}
            >
              {isLoading ? "Signing in…" : "Sign in"}
            </button>
            <button
              type="button"
              onClick={() => {
                setView("forgot");
                setError(null);
                setMessage(null);
              }}
              style={{
                display: "block",
                width: "100%",
                marginTop: 12,
                border: "none",
                background: "none",
                color: "var(--olive)",
                fontSize: 13,
                cursor: "pointer",
                textAlign: "center",
                textDecoration: "underline",
              }}
            >
              Forgot password?
            </button>
          </form>
        )}

        {view === "forgot" && (
          <form onSubmit={sendReset}>
            <h1 style={{ fontSize: "1.5rem" }}>Reset password</h1>
            <p style={{ color: "#6b6b60", fontSize: 14 }}>
              Enter your staff email and we will send a reset link.
            </p>
            <label style={{ display: "block", marginTop: 16, fontSize: 14 }}>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
                required
                style={fieldStyle}
              />
            </label>
            {error && (
              <p style={{ color: "#b42318", fontSize: 13, marginTop: 10 }}>{error}</p>
            )}
            {message && (
              <p style={{ color: "#1E6B3A", fontSize: 13, marginTop: 10 }}>{message}</p>
            )}
            <button
              type="submit"
              className="btn"
              style={{ width: "100%", marginTop: 16 }}
              disabled={busy}
            >
              {busy ? "Sending…" : "Send reset link"}
            </button>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                marginTop: 12,
                fontSize: 13,
              }}
            >
              <button
                type="button"
                className="btn secondary"
                style={{ flex: 1, height: 36, fontSize: 13 }}
                onClick={() => {
                  setView("login");
                  setError(null);
                  setMessage(null);
                }}
              >
                Back to sign in
              </button>
              <button
                type="button"
                className="btn secondary"
                style={{ flex: 1, height: 36, fontSize: 13 }}
                onClick={() => {
                  setView("contact");
                  setError(null);
                  setMessage(null);
                }}
              >
                Contact admin
              </button>
            </div>
          </form>
        )}

        {view === "contact" && (
          <form onSubmit={contactAdmin}>
            <h1 style={{ fontSize: "1.5rem" }}>Contact admin</h1>
            <p style={{ color: "#6b6b60", fontSize: 14 }}>
              Sends a high-priority request to hello@guestay.pk
            </p>
            <label style={{ display: "block", marginTop: 16, fontSize: 14 }}>
              Your email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
                required
                style={fieldStyle}
              />
            </label>
            <label style={{ display: "block", marginTop: 12, fontSize: 14 }}>
              Message (optional)
              <textarea
                value={helpMessage}
                onChange={(e) => setHelpMessage(e.target.value)}
                rows={3}
                placeholder="Briefly describe the issue"
                style={{
                  ...fieldStyle,
                  height: "auto",
                  padding: "10px 12px",
                  resize: "vertical",
                }}
              />
            </label>
            {error && (
              <p style={{ color: "#b42318", fontSize: 13, marginTop: 10 }}>{error}</p>
            )}
            {message && (
              <p style={{ color: "#1E6B3A", fontSize: 13, marginTop: 10 }}>{message}</p>
            )}
            <button
              type="submit"
              className="btn"
              style={{ width: "100%", marginTop: 16 }}
              disabled={busy}
            >
              {busy ? "Sending…" : "Send help request"}
            </button>
            <button
              type="button"
              className="btn secondary"
              style={{ width: "100%", marginTop: 8 }}
              onClick={() => {
                setView("forgot");
                setError(null);
                setMessage(null);
              }}
            >
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const fieldStyle: CSSProperties = {
  display: "block",
  width: "100%",
  height: 42,
  marginTop: 6,
  borderRadius: 10,
  border: "1px solid rgba(59,68,48,0.15)",
  padding: "0 12px",
  fontFamily: "inherit",
  fontSize: 14,
  boxSizing: "border-box",
};

import { useLogin } from "@refinedev/core";
import { useState } from "react";

export function LoginPage() {
  const { mutate: login, isLoading } = useLogin();
  const [email, setEmail] = useState("owner@guestay.test");
  const [password, setPassword] = useState("OwnerDemo#2026");
  const [error, setError] = useState<string | null>(null);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <form
        className="card"
        style={{ width: "min(100%, 400px)" }}
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          login(
            { email, password },
            {
              onError: () => setError("Invalid credentials"),
            },
          );
        }}
      >
        <h1>Guestay Admin</h1>
        <p style={{ color: "#6b6b60", fontSize: 14 }}>
          Owner / Manager login · admin.guestay.pk
        </p>
        <label style={{ display: "block", marginTop: 16, fontSize: 14 }}>
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              display: "block",
              width: "100%",
              height: 42,
              marginTop: 6,
              borderRadius: 10,
              border: "1px solid rgba(59,68,48,0.15)",
              padding: "0 12px",
            }}
          />
        </label>
        <label style={{ display: "block", marginTop: 12, fontSize: 14 }}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              display: "block",
              width: "100%",
              height: 42,
              marginTop: 6,
              borderRadius: 10,
              border: "1px solid rgba(59,68,48,0.15)",
              padding: "0 12px",
            }}
          />
        </label>
        {error && (
          <p style={{ color: "#b42318", fontSize: 13, marginTop: 10 }}>{error}</p>
        )}
        <button type="submit" className="btn" style={{ width: "100%", marginTop: 16 }} disabled={isLoading}>
          {isLoading ? "Signing in…" : "Sign in"}
        </button>
        <p style={{ fontSize: 12, color: "#6b6b60", marginTop: 12 }}>
          Dev seeds: owner@guestay.test / OwnerDemo#2026 · manager@guestay.test /
          ManagerDemo#2026
        </p>
      </form>
    </div>
  );
}

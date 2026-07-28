import { useGetIdentity, useLogout } from "@refinedev/core";
import { useState } from "react";

export function SettingsPage() {
  const { data: identity } = useGetIdentity<{ name?: string; email?: string }>();
  const { mutate: logout } = useLogout();
  const [name, setName] = useState(identity?.name || "");

  return (
    <div>
      <h1>Account settings</h1>
      <div className="card" style={{ maxWidth: 420, marginTop: 16 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "#A6AC7E",
            display: "grid",
            placeItems: "center",
            color: "#fff",
            fontSize: 28,
            marginBottom: 12,
          }}
        >
          {(identity?.name || "G")[0]}
        </div>
        <p style={{ fontSize: 13, color: "#6b6b60" }}>
          Photo upload → Supabase Storage `avatars` bucket (same as guest profile).
        </p>
        <label style={{ display: "block", marginTop: 12, fontSize: 14 }}>
          Display name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              display: "block",
              width: "100%",
              height: 40,
              marginTop: 4,
              borderRadius: 8,
              border: "1px solid #ccc",
              padding: "0 10px",
            }}
          />
        </label>
        <p style={{ marginTop: 8, fontSize: 14 }}>{identity?.email}</p>
        <button type="button" className="btn" style={{ marginTop: 16 }}>
          Save
        </button>
        <button
          type="button"
          className="btn secondary"
          style={{ marginTop: 8, marginLeft: 8 }}
          onClick={() => logout()}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

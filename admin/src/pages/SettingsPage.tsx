import { useGetIdentity } from "@refinedev/core";
import { useState } from "react";

type Identity = {
  name?: string;
  email?: string;
  phone?: string;
  dob?: string;
  firstName?: string;
  lastName?: string;
};

function initials(name?: string, email?: string) {
  const source = name || email || "G";
  const parts = source.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  return (parts[0]?.[0] || "G").toUpperCase() + (parts[1]?.[0] || "").toUpperCase();
}

export function SettingsPage() {
  const { data: identity } = useGetIdentity<Identity>();
  const [name, setName] = useState(identity?.name || "");
  const [saved, setSaved] = useState(false);

  const firstLast =
    [identity?.firstName, identity?.lastName].filter(Boolean).join(" ") ||
    identity?.name ||
    "—";

  return (
    <div className="centered-page">
      <h1 style={{ textAlign: "center" }}>Account settings</h1>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 12 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "var(--sage)",
              display: "grid",
              placeItems: "center",
              color: "#fff",
              fontSize: 26,
              fontWeight: 600,
            }}
          >
            {initials(identity?.name, identity?.email)}
          </div>
          <p style={{ fontSize: 12, color: "#9a9a8c", marginTop: 8 }}>
            Initials avatar · profile photos aren’t used for admin accounts.
          </p>
        </div>

        <label className="field">
          Display name
          <input value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} />
        </label>

        <label className="field">
          Full name (first &amp; last)
          <input value={firstLast} readOnly />
        </label>

        <label className="field">
          Email
          <input value={identity?.email || "—"} readOnly />
        </label>

        <label className="field">
          Phone
          <input value={identity?.phone || "Not set"} readOnly />
        </label>

        <label className="field">
          Date of birth
          <input value={identity?.dob || "Not set"} readOnly />
        </label>

        <p style={{ fontSize: 12, color: "#9a9a8c" }}>
          Email, phone, date of birth, and legal name are managed in your account profile and are
          read-only here. Only your display name can be changed.
        </p>

        <button
          type="button"
          className="btn"
          style={{ width: "100%", marginTop: 4 }}
          onClick={() => setSaved(true)}
        >
          Save display name
        </button>
        {saved && (
          <p style={{ color: "#1E6B3A", fontSize: 13, textAlign: "center", marginTop: 8 }}>
            Display name saved.
          </p>
        )}
      </div>
    </div>
  );
}

"use client";

import { Modal } from "@/components/ui/Modal";
import { createBrowserSupabase, hasSupabase } from "@/lib/supabase/client";
import { getPhoneVerificationStatus } from "@/lib/verification/phone";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

type ProfileState = {
  email: string;
  emailVerified: boolean;
  displayName: string;
  legalName: string;
  phone: string;
  phoneVerifiedAt: string | null;
  role: string;
};

type NameChangeRequest = {
  id: string;
  requested_legal_name: string;
  reason: string;
  status: string;
  reviewer_note: string | null;
  created_at: string;
};

const fieldClass =
  "mt-1 h-11 w-full rounded-soft border border-olive/15 bg-white px-3 text-ink outline-none focus:border-olive/40";

export function AccountSettings() {
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [newLegalName, setNewLegalName] = useState("");
  const [nameReason, setNameReason] = useState("");
  const [pendingRequest, setPendingRequest] = useState<NameChangeRequest | null>(
    null,
  );
  const [ownerConfirmOpen, setOwnerConfirmOpen] = useState(false);
  const [ownerLegalName, setOwnerLegalName] = useState("");

  useEffect(() => {
    async function load() {
      if (!hasSupabase()) {
        setProfile({
          email: "",
          emailVerified: false,
          displayName: "",
          legalName: "",
          phone: "",
          phoneVerifiedAt: null,
          role: "guest",
        });
        return;
      }
      const sb = createBrowserSupabase();
      const { data: auth } = await sb.auth.getUser();
      const user = auth.user;
      if (!user) return;

      // profiles + name_change_requests in parallel (were sequential before)
      const [{ data: row }, { data: reqs }] = await Promise.all([
        sb
          .from("profiles")
          .select(
            "email, display_name, legal_name, full_name, phone, phone_verified_at, role",
          )
          .eq("id", user.id)
          .maybeSingle(),
        sb
          .from("name_change_requests")
          .select(
            "id, requested_legal_name, reason, status, reviewer_note, created_at",
          )
          .eq("user_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      const legal =
        row?.legal_name ||
        row?.full_name ||
        (user.user_metadata?.full_name as string) ||
        "";
      const display =
        row?.display_name ||
        (user.user_metadata?.display_name as string) ||
        legal;
      const phoneVal =
        row?.phone || (user.user_metadata?.phone as string) || "";

      setProfile({
        email: user.email || row?.email || "",
        emailVerified: Boolean(user.email_confirmed_at),
        displayName: display,
        legalName: legal,
        phone: phoneVal,
        phoneVerifiedAt: row?.phone_verified_at ?? null,
        role: row?.role || "guest",
      });
      setDisplayName(display);
      setPhone(phoneVal);
      setOwnerLegalName(legal);
      setPendingRequest((reqs?.[0] as NameChangeRequest) || null);
    }
    void load();
  }, []);

  async function saveDisplayAndPhone(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (!hasSupabase()) {
        setMessage("Saved locally (Supabase not configured).");
        return;
      }
      const sb = createBrowserSupabase();
      const { data: auth } = await sb.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");

      await sb.auth.updateUser({
        data: { display_name: displayName.trim(), phone: phone.trim() },
      });

      const { error: err } = await sb
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          phone: phone.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", auth.user.id);
      if (err) throw err;
      setMessage("Settings saved.");
      setProfile((p) =>
        p
          ? { ...p, displayName: displayName.trim(), phone: phone.trim() }
          : p,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function submitNameChange() {
    if (!newLegalName.trim() || !nameReason.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (!hasSupabase() || !profile) {
        setPendingRequest({
          id: "local",
          requested_legal_name: newLegalName.trim(),
          reason: nameReason.trim(),
          status: "pending",
          reviewer_note: null,
          created_at: new Date().toISOString(),
        });
        setNameOpen(false);
        setMessage("Name change request submitted.");
        return;
      }
      const sb = createBrowserSupabase();
      const { data: auth } = await sb.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");

      const { data, error: err } = await sb
        .from("name_change_requests")
        .insert({
          user_id: auth.user.id,
          current_legal_name: profile.legalName,
          requested_legal_name: newLegalName.trim(),
          reason: nameReason.trim(),
          status: "pending",
        })
        .select(
          "id, requested_legal_name, reason, status, reviewer_note, created_at",
        )
        .single();
      if (err) throw err;
      setPendingRequest(data as NameChangeRequest);
      setNameOpen(false);
      setNewLegalName("");
      setNameReason("");
      setMessage("Name change request submitted — Pending Review.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit request");
    } finally {
      setSaving(false);
    }
  }

  async function ownerUpdateLegalName() {
    if (!ownerLegalName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (!hasSupabase()) {
        setProfile((p) =>
          p ? { ...p, legalName: ownerLegalName.trim() } : p,
        );
        setOwnerConfirmOpen(false);
        setMessage("Legal name updated.");
        return;
      }
      const sb = createBrowserSupabase();
      const { data: auth } = await sb.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");
      const name = ownerLegalName.trim();
      const { error: err } = await sb
        .from("profiles")
        .update({
          legal_name: name,
          full_name: name,
          updated_at: new Date().toISOString(),
        })
        .eq("id", auth.user.id);
      if (err) throw err;
      await sb.auth.updateUser({ data: { full_name: name } });
      setProfile((p) => (p ? { ...p, legalName: name } : p));
      setOwnerConfirmOpen(false);
      setMessage("Legal name updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update name");
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return (
      <div className="mt-8 max-w-md space-y-4" aria-busy aria-label="Loading settings">
        <div className="h-11 animate-pulse rounded-soft bg-olive/10" />
        <div className="h-11 animate-pulse rounded-soft bg-olive/10" />
        <div className="h-11 animate-pulse rounded-soft bg-olive/10" />
        <div className="h-11 w-24 animate-pulse rounded-soft bg-olive/10" />
        <div className="mt-6 h-16 animate-pulse rounded-soft bg-olive/10" />
      </div>
    );
  }

  const phoneStatus = getPhoneVerificationStatus(profile.phoneVerifiedAt);
  const isOwner = profile.role === "owner";

  return (
    <div className="mt-8 max-w-md space-y-6">
      {message && (
        <p className="rounded-soft bg-sage/20 px-3 py-2 text-sm text-olive">
          {message}
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <form onSubmit={saveDisplayAndPhone} className="space-y-4">
        <label className="block text-sm">
          <span className="text-ink-muted">Display name</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={fieldClass}
          />
        </label>

        <div className="block text-sm">
          <span className="text-ink-muted">Email</span>
          <div className="mt-1 flex items-center gap-2">
            <input
              value={profile.email}
              readOnly
              disabled
              className={`${fieldClass} cursor-not-allowed bg-cream-100 text-ink-muted`}
            />
            {profile.emailVerified ? (
              <CheckCircle2
                className="h-5 w-5 shrink-0 text-emerald-600"
                aria-label="Email verified"
              />
            ) : (
              <AlertCircle
                className="h-5 w-5 shrink-0 text-amber-600"
                aria-label="Email not verified"
              />
            )}
          </div>
          {!profile.emailVerified && (
            <p className="mt-1 text-xs text-ink-soft">
              Check your inbox for a verification link.
            </p>
          )}
        </div>

        <div className="block text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-ink-muted">Phone</span>
            <span className="inline-flex items-center gap-1 text-xs text-ink-soft">
              {phoneStatus.status === "verified" ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Verified
                </>
              ) : (
                <>
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                  Unverified
                </>
              )}
            </span>
          </div>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={fieldClass}
            placeholder="+92…"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              disabled
              title="Coming soon"
              className="inline-flex h-9 items-center rounded-soft border border-olive/15 px-3 text-xs font-medium text-ink-soft opacity-60"
            >
              Verify Now
            </button>
            <span className="text-xs text-ink-soft">Coming soon</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-11 items-center rounded-soft bg-olive px-6 text-sm font-medium text-cream-50 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </form>

      <div className="border-t border-olive/10 pt-6">
        <p className="text-sm text-ink-muted">Legal name</p>
        <p className="mt-1 font-medium text-ink">
          {profile.legalName || "—"}
        </p>

        {isOwner ? (
          <button
            type="button"
            onClick={() => {
              setOwnerLegalName(profile.legalName);
              setOwnerConfirmOpen(true);
            }}
            className="mt-3 text-sm font-medium text-olive underline"
          >
            Edit legal name
          </button>
        ) : pendingRequest ? (
          <p className="mt-3 rounded-soft bg-cream-100 px-3 py-2 text-sm text-ink-muted">
            Pending name change to{" "}
            <strong className="text-ink">
              {pendingRequest.requested_legal_name}
            </strong>
          </p>
        ) : (
          <button
            type="button"
            onClick={() => setNameOpen(true)}
            className="mt-3 inline-flex h-10 items-center rounded-soft border border-olive/20 px-4 text-sm font-medium text-olive"
          >
            Request Name Change
          </button>
        )}
      </div>

      <Modal
        open={nameOpen}
        onClose={() => setNameOpen(false)}
        title="Request Name Change"
        labelledBy="name-change-title"
      >
        <label className="mt-2 block text-sm">
          <span className="text-ink-muted">New legal name</span>
          <input
            value={newLegalName}
            onChange={(e) => setNewLegalName(e.target.value)}
            className={fieldClass}
            required
          />
        </label>
        <label className="mt-3 block text-sm">
          <span className="text-ink-muted">Reason</span>
          <textarea
            value={nameReason}
            onChange={(e) => setNameReason(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-soft border border-olive/15 bg-white px-3 py-2"
            required
          />
        </label>
        <button
          type="button"
          onClick={submitNameChange}
          disabled={saving}
          className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-soft bg-olive text-sm font-medium text-cream-50 disabled:opacity-50"
        >
          Submit request
        </button>
      </Modal>

      <Modal
        open={ownerConfirmOpen}
        onClose={() => setOwnerConfirmOpen(false)}
        title="Confirm legal name"
        labelledBy="owner-name-title"
      >
        <label className="mt-2 block text-sm">
          <span className="text-ink-muted">Legal name</span>
          <input
            value={ownerLegalName}
            onChange={(e) => setOwnerLegalName(e.target.value)}
            className={fieldClass}
          />
        </label>
        <button
          type="button"
          onClick={ownerUpdateLegalName}
          disabled={saving}
          className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-soft bg-olive text-sm font-medium text-cream-50 disabled:opacity-50"
        >
          Confirm
        </button>
      </Modal>
    </div>
  );
}

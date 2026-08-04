import { useCreate, useList, useUpdate } from "@refinedev/core";
import { Navigate } from "react-router-dom";
import { useRef, useState } from "react";
import { useRole } from "../hooks/useRole";
import { usePageMeta } from "../hooks/usePageMeta";
import { PlusIcon, XIcon } from "../components/icons";
import { truncateName } from "../lib/dateRange";
import { supabase } from "../supabase";

type Photo = { id: string; name: string; thumbnail: boolean; url?: string };

type Room = {
  id: string;
  name: string;
  type: string;
  status: string;
  description?: string;
  capacity: number;
  beds?: number;
  amenities?: string[];
  tier1: number;
  tier2: number;
  tier3: number;
  tier4: number;
  breakpoint1?: number;
  breakpoint2?: number;
  breakpoint3?: number;
  breakpoint4?: number;
  photos?: Photo[];
};

type Draft = Omit<Room, "id" | "status">;

const EMPTY: Draft = {
  name: "",
  type: "private_room",
  description: "",
  capacity: 2,
  beds: 1,
  amenities: [],
  tier1: 0,
  tier2: 0,
  tier3: 0,
  tier4: 0,
  breakpoint1: 1,
  breakpoint2: 3,
  breakpoint3: 7,
  breakpoint4: 30,
  photos: [],
};

const TIERS = [1, 2, 3, 4] as const;

export function RoomsPage() {
  usePageMeta("Rooms", "Manage Guestay rooms and photos");
  const { data, refetch } = useList({ resource: "rooms" });
  const { mutate: update } = useUpdate();
  const { mutate: create } = useCreate();
  const { canManageRooms, canViewRooms, ready } = useRole();
  const [modal, setModal] = useState<null | { mode: "create" | "edit"; room?: Room }>(null);
  const [showArchived, setShowArchived] = useState(false);

  if (!ready) {
    return <p style={{ color: "#9a9a8c" }}>Loading…</p>;
  }
  if (!canViewRooms) return <Navigate to="/" replace />;

  const rooms = (data?.data || []) as Room[];
  const activeRooms = rooms.filter((r) => r.status !== "archived");
  const archivedRooms = rooms.filter((r) => r.status === "archived");
  const list = showArchived ? archivedRooms : activeRooms;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>Rooms</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className={`btn secondary${showArchived ? "" : ""}`}
            style={showArchived ? { background: "#EAECE4" } : undefined}
            onClick={() => setShowArchived((v) => !v)}
          >
            {showArchived ? "Active rooms" : `Archived (${archivedRooms.length})`}
          </button>
          {canManageRooms && !showArchived && (
            <button type="button" className="btn" style={{ gap: 6 }} onClick={() => setModal({ mode: "create" })}>
              <PlusIcon size={16} /> New Room
            </button>
          )}
        </div>
      </div>
      <p style={{ color: "#6b6b60" }}>
        {showArchived
          ? "Soft-deleted rooms. Restore to make them available again."
          : canManageRooms
            ? "Archive a room to hide it from the storefront without losing booking history."
            : "View-only. Ask an admin to add or edit rooms."}
      </p>

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        {list.length === 0 && (
          <div className="card">
            <p style={{ margin: 0, color: "#9a9a8c" }}>
              {showArchived ? "No archived rooms." : "No active rooms yet."}
            </p>
          </div>
        )}
        {list.map((r) => (
          <div key={r.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", gap: 12, minWidth: 0, flex: 1 }}>
                {r.photos?.[0]?.url ? (
                  <img
                    src={r.photos[0].url}
                    alt=""
                    style={{
                      width: 72,
                      height: 72,
                      objectFit: "cover",
                      borderRadius: 8,
                      flexShrink: 0,
                      background: "#EAECE4",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 8,
                      background: "#EAECE4",
                      flexShrink: 0,
                    }}
                    aria-hidden
                  />
                )}
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ margin: 0 }}>{r.name}</h2>
                  <p style={{ margin: "4px 0", color: "#6b6b60" }}>
                    {r.type.replace(/_/g, " ")} · sleeps {r.capacity} · {r.beds ?? "-"} bed(s) · {r.status}
                  </p>
                  {r.description && <p style={{ margin: "4px 0", fontSize: 13 }}>{r.description}</p>}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                    {(r.amenities || []).map((a) => (
                      <span key={a} className="badge" style={{ background: "#EAECE4", color: "#3B4430" }}>
                        {a}
                      </span>
                    ))}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 13, color: "#6b6b60" }}>
                    Pricing: Rs {r.tier1} / {r.tier2} / {r.tier3} / {r.tier4} · photos: {(r.photos || []).length}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, height: "fit-content" }}>
                {canManageRooms && (
                  <>
                    {!showArchived && (
                      <button type="button" className="btn secondary" onClick={() => setModal({ mode: "edit", room: r })}>
                        Edit
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() =>
                        update(
                          {
                            resource: "rooms",
                            id: r.id,
                            values: { status: r.status === "archived" ? "active" : "archived" },
                          },
                          { onSuccess: () => refetch() },
                        )
                      }
                    >
                      {r.status === "archived" ? "Restore" : "Archive"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <RoomForm
          initial={modal.mode === "edit" ? modal.room! : undefined}
          onClose={() => setModal(null)}
          onSave={(draft) => {
            if (modal.mode === "edit" && modal.room) {
              update(
                { resource: "rooms", id: modal.room.id, values: draft },
                {
                  onSuccess: () => {
                    setModal(null);
                    refetch();
                  },
                },
              );
            } else {
              create(
                { resource: "rooms", values: { ...draft, status: "active" } },
                {
                  onSuccess: () => {
                    setModal(null);
                    refetch();
                  },
                },
              );
            }
          }}
        />
      )}
    </div>
  );
}

function RoomForm({
  initial,
  onClose,
  onSave,
}: {
  initial?: Room;
  onClose: () => void;
  onSave: (draft: Draft) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() =>
    initial
      ? {
          name: initial.name,
          type: initial.type,
          description: initial.description || "",
          capacity: initial.capacity,
          beds: initial.beds ?? 1,
          amenities: initial.amenities || [],
          tier1: initial.tier1,
          tier2: initial.tier2,
          tier3: initial.tier3,
          tier4: initial.tier4,
          breakpoint1: initial.breakpoint1 ?? 1,
          breakpoint2: initial.breakpoint2 ?? 3,
          breakpoint3: initial.breakpoint3 ?? 7,
          breakpoint4: initial.breakpoint4 ?? 30,
          photos: initial.photos || [],
        }
      : { ...EMPTY },
  );
  const [amenityInput, setAmenityInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function addAmenity() {
    const val = amenityInput.trim();
    if (!val) return;
    set("amenities", [...(draft.amenities || []), val]);
    setAmenityInput("");
  }

  async function addPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (!supabase) {
      setUploadError("Supabase is not configured - cannot upload photos.");
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      const uploaded: Photo[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i]!;
        const ext = f.name.split(".").pop() || "jpg";
        const path = `uploads/${Date.now()}_${i}.${ext}`;
        const { error } = await supabase.storage
          .from("room-images")
          .upload(path, f, { cacheControl: "3600", upsert: false });
        if (error) throw new Error(error.message);
        const { data: pub } = supabase.storage.from("room-images").getPublicUrl(path);
        uploaded.push({
          id: `p_${Date.now()}_${i}`,
          name: f.name,
          thumbnail: false,
          url: pub.publicUrl,
        });
      }
      const combined = [...(draft.photos || []), ...uploaded];
      if (!combined.some((p) => p.thumbnail) && combined[0]) {
        combined[0] = { ...combined[0], thumbnail: true };
      }
      set("photos", combined);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function setThumbnail(id: string) {
    set(
      "photos",
      (draft.photos || []).map((p) => ({ ...p, thumbnail: p.id === id })),
    );
  }

  function removePhoto(id: string) {
    const next = (draft.photos || []).filter((p) => p.id !== id);
    if (next.length && !next.some((p) => p.thumbnail)) {
      next[0] = { ...next[0]!, thumbnail: true };
    }
    set("photos", next);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 style={{ margin: 0 }}>{initial ? "Edit room" : "New room"}</h2>
          <button type="button" className="btn secondary icon-btn" onClick={onClose} aria-label="Close">
            <XIcon size={18} />
          </button>
        </div>

        <label className="field">
          Name
          <input value={draft.name} onChange={(e) => set("name", e.target.value)} />
        </label>
        <label className="field">
          Description
          <textarea rows={2} value={draft.description} onChange={(e) => set("description", e.target.value)} />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <label className="field">
            Type
            <select value={draft.type} onChange={(e) => set("type", e.target.value)}>
              <option value="private_room">Private room</option>
              <option value="shared_bedroom">Shared bedroom</option>
              <option value="flat">Entire place / Flat</option>
            </select>
          </label>
          <label className="field">
            Capacity
            <input type="number" min={1} value={draft.capacity} onChange={(e) => set("capacity", Number(e.target.value))} />
          </label>
          <label className="field">
            Beds
            <input type="number" min={1} value={draft.beds} onChange={(e) => set("beds", Number(e.target.value))} />
          </label>
        </div>

        <h4 style={{ margin: "8px 0" }}>Pricing tiers &amp; breakpoints</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {TIERS.map((n) => (
            <div key={n}>
              <label className="field" style={{ marginBottom: 6 }}>
                Tier {n} (Rs)
                <input
                  type="number"
                  value={draft[`tier${n}` as keyof Draft] as number}
                  onChange={(e) => set(`tier${n}` as keyof Draft, Number(e.target.value) as never)}
                />
              </label>
              <label className="field" style={{ fontSize: 12 }}>
                ≥ nights
                <input
                  type="number"
                  value={draft[`breakpoint${n}` as keyof Draft] as number}
                  onChange={(e) => set(`breakpoint${n}` as keyof Draft, Number(e.target.value) as never)}
                />
              </label>
            </div>
          ))}
        </div>

        <h4 style={{ margin: "8px 0" }}>Amenities</h4>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {(draft.amenities || []).map((a) => (
            <span key={a} className="badge" style={{ background: "#EAECE4", color: "#3B4430" }}>
              {a}
              <button
                type="button"
                onClick={() => set("amenities", (draft.amenities || []).filter((x) => x !== a))}
                style={{ border: "none", background: "none", cursor: "pointer", color: "#b42318", padding: 0 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={amenityInput}
            placeholder="Add amenity (e.g. Wi-Fi)"
            onChange={(e) => setAmenityInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAmenity())}
            style={{ flex: 1, height: 38, borderRadius: 8, border: "1px solid rgba(59,68,48,0.2)", padding: "0 10px" }}
          />
          <button type="button" className="btn secondary" onClick={addAmenity}>
            Add
          </button>
        </div>

        <h4 style={{ margin: "14px 0 8px" }}>Photos</h4>
        <p style={{ fontSize: 12, color: "#6b6b60", marginTop: 0 }}>
          Choose a thumbnail for the cover image. Long file names are shortened so actions stay inside the card.
        </p>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => void addPhotos(e.target.files)}
        />
        <button
          type="button"
          className="btn secondary"
          style={{ gap: 6 }}
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          <PlusIcon size={15} /> {uploading ? "Uploading…" : "Add photos"}
        </button>
        {uploadError && (
          <p style={{ color: "#b42318", fontSize: 13, marginTop: 8 }}>{uploadError}</p>
        )}
        <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
          {(draft.photos || []).map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                border: "1px solid rgba(59,68,48,0.12)",
                borderRadius: 8,
                padding: "6px 8px",
                minWidth: 0,
              }}
            >
              {p.url ? (
                <img
                  src={p.url}
                  alt=""
                  style={{
                    width: 48,
                    height: 48,
                    objectFit: "cover",
                    borderRadius: 6,
                    background: "#EAECE4",
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{ width: 48, height: 48, borderRadius: 6, background: "#EAECE4", flexShrink: 0 }}
                  aria-hidden
                />
              )}
              <span className="photo-name" title={p.name}>
                {truncateName(p.name, 24)}
              </span>
              {p.thumbnail ? (
                <span className="badge" style={{ background: "#E4F3E8", color: "#1E6B3A", flexShrink: 0 }}>
                  Thumbnail
                </span>
              ) : (
                <button
                  type="button"
                  className="btn secondary"
                  style={{ height: 32, fontSize: 12, padding: "0 10px", flexShrink: 0, whiteSpace: "nowrap" }}
                  onClick={() => setThumbnail(p.id)}
                >
                  Select as Thumbnail
                </button>
              )}
              <button
                type="button"
                className="btn secondary icon-btn"
                onClick={() => removePhoto(p.id)}
                aria-label="Remove photo"
                title="Remove"
              >
                <XIcon size={15} />
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <button type="button" className="btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn" onClick={() => onSave(draft)} disabled={!draft.name.trim()}>
            {initial ? "Save changes" : "Create room"}
          </button>
        </div>
      </div>
    </div>
  );
}

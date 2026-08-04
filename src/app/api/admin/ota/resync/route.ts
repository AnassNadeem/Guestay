import { requireStaffRole } from "@/lib/auth/requireStaffRole";
import {
  adminCorsPreflight,
  applyAdminCors,
  jsonWithAdminCors,
} from "@/lib/auth/adminCors";

export async function OPTIONS(req: Request) {
  return adminCorsPreflight(req);
}

export async function POST(req: Request) {
  const auth = await requireStaffRole(req, ["owner", "manager"]);
  if (!auth.ok) return applyAdminCors(req, auth.response);

  const body = await req.json().catch(() => ({}));
  const worker = process.env.ICAL_WORKER_BASE_URL;
  if (!worker) {
    return jsonWithAdminCors(req, {
      ok: true,
      note: "OTA Worker not deployed yet — marked as local stub success.",
      feedId: body.feedId,
    });
  }
  try {
    const res = await fetch(`${worker}/resync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return jsonWithAdminCors(req, { ok: res.ok, ...data });
  } catch (e) {
    return jsonWithAdminCors(req, {
      ok: false,
      error: e instanceof Error ? e.message : "resync failed",
    });
  }
}

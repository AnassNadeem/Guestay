import { requireStaffRole } from "@/lib/auth/requireStaffRole";
import {
  adminCorsPreflight,
  applyAdminCors,
  jsonWithAdminCors,
} from "@/lib/auth/adminCors";
import { createServiceSupabase, hasSupabase } from "@/lib/supabase/client";

export async function OPTIONS(req: Request) {
  return adminCorsPreflight(req);
}

type Body = {
  ticketId?: string;
  ownerNote?: string;
  status?: string;
  amountPkr?: number;
  reason?: string;
  changeNote?: string;
};

/**
 * Owner: edit an archived (already decided) refund and write an audit log entry.
 */
export async function PATCH(req: Request) {
  const auth = await requireStaffRole(req, ["owner"]);
  if (!auth.ok) return applyAdminCors(req, auth.response);

  if (!hasSupabase()) {
    return jsonWithAdminCors(
      req,
      { error: "Supabase is not configured" },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return jsonWithAdminCors(req, { error: "Invalid JSON" }, { status: 400 });
  }

  const ticketId = body.ticketId?.trim();
  if (!ticketId) {
    return jsonWithAdminCors(
      req,
      { error: "ticketId is required" },
      { status: 400 },
    );
  }

  const sb = createServiceSupabase();
  const { data: before, error: loadErr } = await sb
    .from("refund_requests")
    .select("id, status, owner_note, amount_pkr, reason")
    .eq("id", ticketId)
    .maybeSingle();

  if (loadErr || !before) {
    return jsonWithAdminCors(
      req,
      { error: loadErr?.message || "Refund not found" },
      { status: 404 },
    );
  }

  const patch: Record<string, unknown> = {};
  if (body.ownerNote !== undefined) patch.owner_note = body.ownerNote;
  if (body.status !== undefined) patch.status = body.status;
  if (body.amountPkr !== undefined) patch.amount_pkr = body.amountPkr;
  if (body.reason !== undefined) patch.reason = body.reason;

  if (Object.keys(patch).length === 0) {
    return jsonWithAdminCors(
      req,
      { error: "No changes provided" },
      { status: 400 },
    );
  }

  const { data: after, error: updErr } = await sb
    .from("refund_requests")
    .update(patch)
    .eq("id", ticketId)
    .select("id, status, owner_note, amount_pkr, reason")
    .single();

  if (updErr || !after) {
    return jsonWithAdminCors(
      req,
      { error: updErr?.message || "Update failed" },
      { status: 500 },
    );
  }

  await sb.from("audit_log").insert({
    action: "refund_updated",
    table_name: "refund_requests",
    row_id: ticketId,
    actor_id: auth.userId,
    before: {
      status: before.status,
      owner_note: before.owner_note,
      amount_pkr: before.amount_pkr,
      reason: before.reason,
    },
    after: {
      status: after.status,
      owner_note: after.owner_note,
      amount_pkr: after.amount_pkr,
      reason: after.reason,
      changeNote: body.changeNote || null,
    },
  });

  return jsonWithAdminCors(req, {
    ok: true,
    refund: after,
  });
}

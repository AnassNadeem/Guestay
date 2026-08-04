import { requireStaffRole } from "@/lib/auth/requireStaffRole";
import {
  adminCorsPreflight,
  applyAdminCors,
  jsonWithAdminCors,
} from "@/lib/auth/adminCors";
import { createWalkInBooking } from "@/lib/bookings/local-store";
import { getRoomBySlug } from "@/lib/mock";
import type { BookingMode } from "@/types";

export async function OPTIONS(req: Request) {
  return adminCorsPreflight(req);
}

export async function POST(req: Request) {
  const auth = await requireStaffRole(req, ["owner", "manager"]);
  if (!auth.ok) return applyAdminCors(req, auth.response);

  try {
    const body = await req.json();
    const room = await getRoomBySlug(body.roomSlug);
    if (!room) {
      return jsonWithAdminCors(req, { error: "Room not found" }, { status: 404 });
    }
    const booking = await createWalkInBooking({
      roomSlug: room.slug,
      roomName: room.name,
      mode: (body.mode || "exclusive") as BookingMode,
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      guests: Number(body.guests) || 1,
      guestName: body.guestName,
      guestPhone: body.guestPhone,
      guestEmail: body.guestEmail,
      amountCollectedPkr: Number(body.amountCollectedPkr) || 0,
      notes: body.notes,
    });
    return jsonWithAdminCors(req, { booking });
  } catch (e) {
    return jsonWithAdminCors(
      req,
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}

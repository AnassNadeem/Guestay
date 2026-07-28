import { listLocalBookings } from "@/lib/bookings/local-store";
import { NextResponse } from "next/server";

export async function GET() {
  const bookings = listLocalBookings();
  return NextResponse.json({ bookings });
}

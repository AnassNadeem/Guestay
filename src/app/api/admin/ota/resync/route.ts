import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const worker = process.env.ICAL_WORKER_BASE_URL;
  if (!worker) {
    return NextResponse.json({
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
    return NextResponse.json({ ok: res.ok, ...data });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : "resync failed",
    });
  }
}

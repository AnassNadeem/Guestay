import { NextResponse } from "next/server";

const DEFAULT_ALLOWED = [
  "https://admin.guestay.pk",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
];

function allowedOrigins(): Set<string> {
  const fromEnv = (process.env.NEXT_PUBLIC_ADMIN_URL || "")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);
  return new Set([...DEFAULT_ALLOWED, ...fromEnv]);
}

/** Apply CORS for the Refine admin SPA calling guestay.pk APIs. */
export function applyAdminCors(req: Request, res: NextResponse): NextResponse {
  const origin = req.headers.get("origin");
  if (origin && allowedOrigins().has(origin.replace(/\/$/, ""))) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Vary", "Origin");
    res.headers.set(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type",
    );
    res.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    );
    res.headers.set("Access-Control-Max-Age", "86400");
  }
  return res;
}

export function adminCorsPreflight(req: Request): NextResponse {
  return applyAdminCors(req, new NextResponse(null, { status: 204 }));
}

export function jsonWithAdminCors(
  req: Request,
  body: unknown,
  init?: ResponseInit,
): NextResponse {
  return applyAdminCors(req, NextResponse.json(body, init));
}

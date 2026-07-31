import {
  hashSetPasswordToken,
  isSetPasswordExpired,
} from "@/lib/auth/set-password-token";
import { NextResponse } from "next/server";

type Body = {
  email?: string;
  token?: string;
  password?: string;
};

/**
 * Completes account claim: validates 24h set-password token, sets password via
 * admin API, clears unclaimed flag. Does NOT create a browser session — caller
 * must sign in normally afterwards.
 */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const token = body.token?.trim() ?? "";
  const password = body.password ?? "";

  if (!email || !token) {
    return NextResponse.json(
      { error: "Email and token are required." },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  try {
    const { hasSupabase, createServiceSupabase } = await import(
      "@/lib/supabase/client"
    );
    if (!hasSupabase()) {
      return NextResponse.json(
        { error: "Auth is not configured." },
        { status: 503 },
      );
    }

    const sb = createServiceSupabase();
    const { data: listed } = await sb.auth.admin.listUsers({ perPage: 1000 });
    const user = listed?.users?.find((u) => u.email?.toLowerCase() === email);

    if (!user) {
      return NextResponse.json(
        { error: "This link is invalid or has expired." },
        { status: 400 },
      );
    }

    const meta = user.user_metadata ?? {};
    const storedHash = meta.guestay_set_password_hash as string | undefined;
    const expiresAt = meta.guestay_set_password_expires as string | undefined;

    if (!storedHash || isSetPasswordExpired(expiresAt)) {
      return NextResponse.json(
        { error: "This link is invalid or has expired." },
        { status: 400 },
      );
    }

    const incoming = hashSetPasswordToken(token);
    if (incoming !== storedHash) {
      return NextResponse.json(
        { error: "This link is invalid or has expired." },
        { status: 400 },
      );
    }

    const { error } = await sb.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: {
        ...meta,
        guestay_unclaimed: false,
        guestay_set_password_hash: null,
        guestay_set_password_expires: null,
      },
    });

    if (error) {
      console.error("[set-password] updateUser failed", error);
      return NextResponse.json(
        { error: error.message || "Could not set password." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[set-password] unexpected", err);
    return NextResponse.json(
      { error: "Could not set password." },
      { status: 500 },
    );
  }
}

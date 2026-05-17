// supabase/functions/send-notification/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "noreply@sureshopph.site";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: CORS_HEADERS });
  }

  // ── 1. Verify caller is an authenticated admin ──────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  // Validate the JWT against Supabase Auth — never trust caller-supplied identity
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  const role =
    (user.app_metadata?.role as string | undefined) ??
    (user.user_metadata?.role as string | undefined);
  if (role !== "admin") {
    return Response.json({ error: "Forbidden: admins only" }, { status: 403, headers: CORS_HEADERS });
  }

  // ── 2. Parse and validate body ──────────────────────────────────────────
  let body: { target?: unknown; subject?: unknown; html?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400, headers: CORS_HEADERS });
  }

  const { target, subject, html } = body;

  if (!target || !["all", "active", "admins"].includes(target as string)) {
    return Response.json(
      { error: "target must be 'all', 'active', or 'admins'" },
      { status: 400, headers: CORS_HEADERS }
    );
  }
  if (
    typeof subject !== "string" ||
    subject.trim().length === 0 ||
    subject.length > 200
  ) {
    return Response.json(
      { error: "subject is required and must be ≤ 200 characters" },
      { status: 400, headers: CORS_HEADERS }
    );
  }
  if (
    typeof html !== "string" ||
    html.trim().length === 0 ||
    html.length > 100_000
  ) {
    return Response.json(
      { error: "html is required and must be ≤ 100,000 characters" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // ── 3. Resolve recipient list server-side (never from the client) ────────
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  type AuthUser = {
    email?: string;
    last_sign_in_at?: string;
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
  };

  let allUsers: AuthUser[] = [];
  let page = 1;
  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error || !data?.users?.length) break;
    allUsers = allUsers.concat(data.users as AuthUser[]);
    if (data.users.length < 1000) break;
    page++;
  }

  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  let recipients: string[];
  if (target === "all") {
    recipients = allUsers.map((u) => u.email!).filter(Boolean);
  } else if (target === "active") {
    recipients = allUsers
      .filter(
        (u) => u.last_sign_in_at && u.last_sign_in_at >= thirtyDaysAgo
      )
      .map((u) => u.email!)
      .filter(Boolean);
  } else {
    // admins
    recipients = allUsers
      .filter(
        (u) =>
          u.app_metadata?.role === "admin" ||
          u.user_metadata?.role === "admin"
      )
      .map((u) => u.email!)
      .filter(Boolean);
  }

  if (recipients.length === 0) {
    return Response.json(
      { error: "No recipients found for the selected target" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // ── 4. Send via Resend (max 50 per request) ──────────────────────────────
  const BATCH_SIZE = 50;
  let totalSent = 0;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: batch,
        subject: (subject as string).trim(),
        html,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return Response.json(
        {
          error: "Resend API error",
          details: errData,
          sentSoFar: totalSent,
          remaining: recipients.length - totalSent,
        },
        { status: 502, headers: CORS_HEADERS }
      );
    }

    totalSent += batch.length;
  }

  return Response.json(
    { success: true, recipientCount: totalSent },
    { status: 200, headers: CORS_HEADERS }
  );
});

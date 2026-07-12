/**
 * Edge Function `guest-access` — spec 005-setlists-sync T6, plan.md "Modo
 * Convidado".
 *
 * Two routes:
 *  - POST .../generate (authenticated band member): mints a signed guest
 *    token scoped to one live session.
 *  - GET .../state?token=... (public, no Supabase session): returns the
 *    session's current song + tabs only — read-only, and strictly the
 *    scope encoded in the token (PRD §5: minimal security surface, no
 *    temporary RLS, no guest account).
 *
 * /generate leans on RLS: it forwards the caller's own Authorization
 * header to PostgREST, so "is this session in a band I belong to" is
 * answered by the exact same "members read live session" policy the rest
 * of the app already relies on — no separate membership check to get
 * wrong. /state has no caller identity at all (the guest never logs in),
 * so it uses the service role and manually scopes every query to the
 * band_id/session_id verified inside the signed token — never anything
 * the request itself supplies unverified.
 */
import { signGuestToken, verifyGuestToken } from "../_shared/guestJwt.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  GUEST_JWT_SECRET: string;
}

function envFromDeno(): Env {
  return {
    SUPABASE_URL: Deno.env.get("SUPABASE_URL") ?? "",
    SUPABASE_ANON_KEY: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    GUEST_JWT_SECRET: Deno.env.get("GUEST_JWT_SECRET") ?? "",
  };
}

type ErrorCode =
  | "INVALID_REQUEST"
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "LOOKUP_FAILED"
  | "INVALID_TOKEN"
  | "SESSION_ENDED"
  | "NOT_ALLOWED";

function errorResponse(code: ErrorCode, message: string, status: number) {
  return new Response(
    JSON.stringify({ success: false, error: { code, message } }),
    {
      status,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    },
  );
}

function successResponse(data: unknown) {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function handleGenerate(req: Request, env: Env): Promise<Response> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return errorResponse(
      "UNAUTHENTICATED",
      "Missing Authorization header.",
      401,
    );
  }

  let sessionId: string;
  try {
    const body = await req.json();
    sessionId = body?.session_id;
    if (typeof sessionId !== "string" || sessionId.length === 0) {
      throw new Error("missing session_id");
    }
  } catch {
    return errorResponse(
      "INVALID_REQUEST",
      'Request body must be JSON with a non-empty "session_id" field.',
      400,
    );
  }

  const lookup = await fetch(
    `${env.SUPABASE_URL}/rest/v1/live_sessions?id=eq.${
      encodeURIComponent(sessionId)
    }&select=id,band_id`,
    {
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        authorization: authHeader,
      },
    },
  );

  if (!lookup.ok) {
    return errorResponse(
      "LOOKUP_FAILED",
      "Não foi possível verificar a sessão.",
      502,
    );
  }

  const rows = await lookup.json();
  const row = rows[0];

  // RLS ("members read live session") already filtered this to nothing if
  // the caller isn't a member of the session's band, or if the session
  // doesn't exist — either way, same generic response either way.
  if (!row) {
    return errorResponse(
      "NOT_FOUND",
      "Sessão não encontrada ou você não é membro desta banda.",
      404,
    );
  }

  const token = await signGuestToken(
    { session_id: row.id, band_id: row.band_id },
    env.GUEST_JWT_SECRET,
  );

  return successResponse({ token });
}

async function handleState(req: Request, env: Env): Promise<Response> {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) {
    return errorResponse("INVALID_REQUEST", "Missing token.", 400);
  }

  const claims = await verifyGuestToken(token, env.GUEST_JWT_SECRET);
  if (!claims) {
    return errorResponse(
      "INVALID_TOKEN",
      "Convite inválido ou expirado.",
      401,
    );
  }

  const serviceHeaders = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  };

  const sessionRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/live_sessions?id=eq.${
      encodeURIComponent(claims.session_id)
    }&band_id=eq.${
      encodeURIComponent(claims.band_id)
    }&select=id,current_song_id`,
    { headers: serviceHeaders },
  );

  if (!sessionRes.ok) {
    return errorResponse(
      "LOOKUP_FAILED",
      "Não foi possível carregar a sessão.",
      502,
    );
  }

  const sessionRows = await sessionRes.json();
  const session = sessionRows[0];

  if (!session) {
    return errorResponse(
      "SESSION_ENDED",
      "Essa sessão ao vivo já terminou.",
      404,
    );
  }

  if (!session.current_song_id) {
    return successResponse({ band_id: claims.band_id, song: null, tabs: [] });
  }

  const [songRes, tabsRes] = await Promise.all([
    fetch(
      `${env.SUPABASE_URL}/rest/v1/songs?id=eq.${
        encodeURIComponent(session.current_song_id)
      }&band_id=eq.${
        encodeURIComponent(claims.band_id)
      }&select=id,title,artist,original_key,preferred_key,capo`,
      { headers: serviceHeaders },
    ),
    fetch(
      `${env.SUPABASE_URL}/rest/v1/song_tabs?song_id=eq.${
        encodeURIComponent(session.current_song_id)
      }&select=id,instrument,content_type,content,content_url`,
      { headers: serviceHeaders },
    ),
  ]);

  const songRows = songRes.ok ? await songRes.json() : [];
  const tabs = tabsRes.ok ? await tabsRes.json() : [];

  return successResponse({
    band_id: claims.band_id,
    song: songRows[0] ?? null,
    tabs,
  });
}

export function handleRequest(
  req: Request,
  env: Env = envFromDeno(),
): Promise<Response> {
  if (req.method === "OPTIONS") {
    return Promise.resolve(new Response("ok", { headers: CORS_HEADERS }));
  }

  const pathname = new URL(req.url).pathname;

  if (pathname.endsWith("/generate") && req.method === "POST") {
    return handleGenerate(req, env);
  }

  if (pathname.endsWith("/state") && req.method === "GET") {
    return handleState(req, env);
  }

  return Promise.resolve(errorResponse("NOT_FOUND", "Unknown route.", 404));
}

if (import.meta.main) {
  Deno.serve((req) => handleRequest(req));
}

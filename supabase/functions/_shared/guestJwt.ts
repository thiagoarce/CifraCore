/**
 * Minimal HMAC-SHA256 JWT for the Modo Convidado (spec 005-setlists-sync
 * T6, plan.md "Modo Convidado"). Deliberately NOT a real Supabase auth
 * token and signed with its own dedicated secret (GUEST_JWT_SECRET, an
 * Edge Function secret, never the project's main JWT secret) — a guest
 * link can never be swapped for real session access, and this token never
 * passes through RLS (the /state endpoint uses the service role and
 * manually scopes every query to the claims below).
 *
 * No external dependency: Web Crypto (available in the Deno Edge Function
 * runtime) is enough for HS256 sign/verify, matching this codebase's
 * zero-dependency style for Edge Functions so far.
 */

export interface GuestTokenClaims {
  session_id: string;
  band_id: string;
}

interface GuestTokenPayload extends GuestTokenClaims {
  exp: number; // epoch seconds
}

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(
    /=+$/,
    "",
  );
}

function base64urlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padLength = (4 - (value.length % 4)) % 4;
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat(padLength);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Signs a guest token, valid for `ttlSeconds` from now (default 24h, spec R8). */
export async function signGuestToken(
  claims: GuestTokenClaims,
  secret: string,
  ttlSeconds = 24 * 60 * 60,
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const payload: GuestTokenPayload = {
    ...claims,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };

  const encHeader = base64url(
    new TextEncoder().encode(JSON.stringify(header)),
  );
  const encPayload = base64url(
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const signingInput = `${encHeader}.${encPayload}`;

  const key = await hmacKey(secret);
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(signingInput),
    ),
  );

  return `${signingInput}.${base64url(signature)}`;
}

/**
 * Verifies signature, structure and expiration. Never throws — any
 * malformed/tampered/expired token just returns null (constitution Lei 4:
 * the guest screen degrades to "convite inválido/expirado", it doesn't crash).
 */
export async function verifyGuestToken(
  token: string,
  secret: string,
): Promise<GuestTokenClaims | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [encHeader, encPayload, encSignature] = parts;

  try {
    const key = await hmacKey(secret);
    const signatureValid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64urlToBytes(encSignature),
      new TextEncoder().encode(`${encHeader}.${encPayload}`),
    );
    if (!signatureValid) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(base64urlToBytes(encPayload)),
    ) as Partial<GuestTokenPayload>;

    if (
      typeof payload.session_id !== "string" ||
      typeof payload.band_id !== "string" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }

    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return { session_id: payload.session_id, band_id: payload.band_id };
  } catch {
    return null;
  }
}

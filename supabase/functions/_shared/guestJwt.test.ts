import { strict as assert } from "node:assert";
import { signGuestToken, verifyGuestToken } from "./guestJwt.ts";

const SECRET = "test-secret-do-not-use-in-prod";
const CLAIMS = { session_id: "session-1", band_id: "band-1" };

Deno.test("round-trip: a token signed with the right secret verifies and returns the claims", async () => {
  const token = await signGuestToken(CLAIMS, SECRET);
  const claims = await verifyGuestToken(token, SECRET);
  assert.deepEqual(claims, CLAIMS);
});

Deno.test("rejects a token signed with a different secret", async () => {
  const token = await signGuestToken(CLAIMS, SECRET);
  const claims = await verifyGuestToken(token, "a-completely-different-secret");
  assert.equal(claims, null);
});

Deno.test("rejects a tampered payload (signature no longer matches)", async () => {
  const token = await signGuestToken(CLAIMS, SECRET);
  const [header, payload, signature] = token.split(".");
  const tamperedPayload = payload.slice(0, -2) + "xx";
  const tampered = `${header}.${tamperedPayload}.${signature}`;

  const claims = await verifyGuestToken(tampered, SECRET);
  assert.equal(claims, null);
});

Deno.test("rejects an expired token", async () => {
  const token = await signGuestToken(CLAIMS, SECRET, -1);
  const claims = await verifyGuestToken(token, SECRET);
  assert.equal(claims, null);
});

Deno.test("rejects malformed tokens without throwing", async () => {
  assert.equal(await verifyGuestToken("", SECRET), null);
  assert.equal(await verifyGuestToken("not-a-jwt", SECRET), null);
  assert.equal(await verifyGuestToken("a.b", SECRET), null);
  assert.equal(await verifyGuestToken("a.b.c.d", SECRET), null);
});

Deno.test("rejects a validly-signed token whose payload is missing required claims", async () => {
  // Craft a token that IS signed correctly by this same module, but for a
  // payload shape that skips session_id — simulates a version-mismatch or a
  // secret shared with a differently-shaped token in the future.
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const base64url = (bytes: Uint8Array) => {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(
      /=+$/,
      "",
    );
  };
  const header = base64url(
    new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })),
  );
  const payload = base64url(
    new TextEncoder().encode(
      JSON.stringify({
        band_id: "band-1",
        exp: Math.floor(Date.now() / 1000) + 60,
      }),
    ),
  );
  const signingInput = `${header}.${payload}`;
  const signature = base64url(
    new Uint8Array(
      await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(signingInput),
      ),
    ),
  );
  const token = `${signingInput}.${signature}`;

  const claims = await verifyGuestToken(token, SECRET);
  assert.equal(claims, null);
});

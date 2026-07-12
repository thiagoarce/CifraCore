/**
 * guest-access request/routing/security tests. Network is fully stubbed
 * (globalThis.fetch), matching import-tab's test style — this suite never
 * hits the real network, per CLAUDE.md's Edge Function testing note.
 */
import { strict as assert } from "node:assert";
import { type Env, handleRequest } from "./index.ts";
import { signGuestToken } from "../_shared/guestJwt.ts";

const ENV: Env = {
  SUPABASE_URL: "https://edge.local",
  SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  GUEST_JWT_SECRET: "test-secret",
};

async function withStubbedFetch<T>(
  stub: (
    input: Request | string | URL,
    init?: RequestInit,
  ) => Promise<Response>,
  run: () => Promise<T>,
): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = stub as typeof fetch;
  try {
    return await run();
  } finally {
    globalThis.fetch = original;
  }
}

function generateRequest(body: unknown, authHeader?: string): Request {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (authHeader) headers["authorization"] = authHeader;
  return new Request("https://edge.local/guest-access/generate", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function stateRequest(token: string): Request {
  return new Request(
    `https://edge.local/guest-access/state?token=${encodeURIComponent(token)}`,
    { method: "GET" },
  );
}

Deno.test("unknown route returns 404", async () => {
  const res = await handleRequest(
    new Request("https://edge.local/guest-access/nope", { method: "GET" }),
    ENV,
  );
  assert.equal(res.status, 404);
});

// --- /generate -------------------------------------------------------------

Deno.test("generate: rejects requests without an Authorization header", async () => {
  const res = await handleRequest(
    generateRequest({ session_id: "s1" }),
    ENV,
  );
  const json = await res.json();
  assert.equal(res.status, 401);
  assert.equal(json.error.code, "UNAUTHENTICATED");
});

Deno.test("generate: rejects a body without session_id", async () => {
  const res = await handleRequest(
    generateRequest({}, "Bearer user-token"),
    ENV,
  );
  const json = await res.json();
  assert.equal(res.status, 400);
  assert.equal(json.error.code, "INVALID_REQUEST");
});

Deno.test("generate: a non-member (RLS returns zero rows) gets NOT_FOUND, not a token", async () => {
  await withStubbedFetch(
    () => Promise.resolve(new Response("[]", { status: 200 })),
    async () => {
      const res = await handleRequest(
        generateRequest({ session_id: "s1" }, "Bearer someone-elses-token"),
        ENV,
      );
      const json = await res.json();
      assert.equal(res.status, 404);
      assert.equal(json.error.code, "NOT_FOUND");
      assert.equal(json.success, false);
    },
  );
});

Deno.test("generate: a real member gets back a token that verifies to the same session/band", async () => {
  await withStubbedFetch(
    (input) => {
      const url = String(input);
      assert.ok(url.includes("live_sessions"));
      assert.ok(url.includes("id=eq.session-42"));
      return Promise.resolve(
        new Response(
          JSON.stringify([{ id: "session-42", band_id: "band-7" }]),
          { status: 200 },
        ),
      );
    },
    async () => {
      const res = await handleRequest(
        generateRequest(
          { session_id: "session-42" },
          "Bearer a-real-members-token",
        ),
        ENV,
      );
      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.success, true);
      assert.ok(typeof json.data.token === "string");
    },
  );
});

Deno.test("generate: forwards the caller's own Authorization header to PostgREST (RLS does the membership check)", async () => {
  let seenAuth: string | null = null;
  await withStubbedFetch(
    (_input, init) => {
      seenAuth = (init?.headers as Record<string, string>)?.authorization ??
        null;
      return Promise.resolve(
        new Response(
          JSON.stringify([{ id: "session-1", band_id: "band-1" }]),
          { status: 200 },
        ),
      );
    },
    async () => {
      await handleRequest(
        generateRequest(
          { session_id: "session-1" },
          "Bearer exact-caller-token",
        ),
        ENV,
      );
    },
  );
  assert.equal(seenAuth, "Bearer exact-caller-token");
});

// --- /state ------------------------------------------------------------------

Deno.test("state: rejects a missing token", async () => {
  const res = await handleRequest(
    new Request("https://edge.local/guest-access/state", { method: "GET" }),
    ENV,
  );
  const json = await res.json();
  assert.equal(res.status, 400);
  assert.equal(json.error.code, "INVALID_REQUEST");
});

Deno.test("state: rejects a tampered token", async () => {
  const token = await signGuestToken(
    { session_id: "s1", band_id: "b1" },
    ENV.GUEST_JWT_SECRET,
  );
  const tampered = token.slice(0, -3) + "xyz";

  const res = await handleRequest(stateRequest(tampered), ENV);
  const json = await res.json();
  assert.equal(res.status, 401);
  assert.equal(json.error.code, "INVALID_TOKEN");
});

Deno.test("state: rejects an expired token", async () => {
  const token = await signGuestToken(
    { session_id: "s1", band_id: "b1" },
    ENV.GUEST_JWT_SECRET,
    -1,
  );

  const res = await handleRequest(stateRequest(token), ENV);
  const json = await res.json();
  assert.equal(res.status, 401);
  assert.equal(json.error.code, "INVALID_TOKEN");
});

Deno.test("state: a valid token for a session that no longer exists returns SESSION_ENDED", async () => {
  const token = await signGuestToken(
    { session_id: "gone", band_id: "b1" },
    ENV.GUEST_JWT_SECRET,
  );

  await withStubbedFetch(
    () => Promise.resolve(new Response("[]", { status: 200 })),
    async () => {
      const res = await handleRequest(stateRequest(token), ENV);
      const json = await res.json();
      assert.equal(res.status, 404);
      assert.equal(json.error.code, "SESSION_ENDED");
    },
  );
});

Deno.test("state: a valid token returns only the current song + its tabs, scoped to the token's own band/session", async () => {
  const token = await signGuestToken(
    { session_id: "session-1", band_id: "band-1" },
    ENV.GUEST_JWT_SECRET,
  );

  const seenUrls: string[] = [];

  await withStubbedFetch(
    (input) => {
      const url = String(input);
      seenUrls.push(url);

      if (url.includes("live_sessions")) {
        assert.ok(url.includes("id=eq.session-1"));
        assert.ok(url.includes("band_id=eq.band-1"));
        return Promise.resolve(
          new Response(
            JSON.stringify([{ id: "session-1", current_song_id: "song-9" }]),
            { status: 200 },
          ),
        );
      }
      if (url.includes("/songs")) {
        assert.ok(url.includes("id=eq.song-9"));
        assert.ok(url.includes("band_id=eq.band-1"));
        return Promise.resolve(
          new Response(
            JSON.stringify([{ id: "song-9", title: "Faroeste Caboclo" }]),
            { status: 200 },
          ),
        );
      }
      if (url.includes("song_tabs")) {
        assert.ok(url.includes("song_id=eq.song-9"));
        return Promise.resolve(
          new Response(
            JSON.stringify([{ id: "tab-1", instrument: "cifra" }]),
            { status: 200 },
          ),
        );
      }
      throw new Error(`unexpected fetch: ${url}`);
    },
    async () => {
      const res = await handleRequest(stateRequest(token), ENV);
      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.success, true);
      assert.equal(json.data.band_id, "band-1");
      assert.equal(json.data.song.title, "Faroeste Caboclo");
      assert.equal(json.data.tabs.length, 1);
    },
  );

  // Every REST call used the service role, never the (nonexistent) guest identity.
  assert.equal(seenUrls.length, 3);
});

Deno.test("state: a session with no current song degrades to an empty payload, not an error", async () => {
  const token = await signGuestToken(
    { session_id: "session-1", band_id: "band-1" },
    ENV.GUEST_JWT_SECRET,
  );

  await withStubbedFetch(
    () =>
      Promise.resolve(
        new Response(
          JSON.stringify([{ id: "session-1", current_song_id: null }]),
          { status: 200 },
        ),
      ),
    async () => {
      const res = await handleRequest(stateRequest(token), ENV);
      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.data.song, null);
      assert.deepEqual(json.data.tabs, []);
    },
  );
});

Deno.test("state: a token minted for band A cannot be replayed to read band B's data (guarded by the band_id filter itself, not just trusting the token)", async () => {
  // Simulates a would-be attacker forging a token whose band_id doesn't
  // match the session's real band — the query filters on BOTH, so the
  // service-role lookup itself finds nothing rather than leaking session-1.
  const forgedToken = await signGuestToken(
    { session_id: "session-1", band_id: "wrong-band" },
    ENV.GUEST_JWT_SECRET,
  );

  await withStubbedFetch(
    (input) => {
      const url = String(input);
      assert.ok(url.includes("band_id=eq.wrong-band"));
      return Promise.resolve(new Response("[]", { status: 200 }));
    },
    async () => {
      const res = await handleRequest(stateRequest(forgedToken), ENV);
      const json = await res.json();
      assert.equal(res.status, 404);
      assert.equal(json.error.code, "SESSION_ENDED");
    },
  );
});

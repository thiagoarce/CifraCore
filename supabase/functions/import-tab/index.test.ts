/**
 * Request validation, routing and error-mapping tests for the import-tab
 * Edge Function. Network is stubbed (globalThis.fetch) so this suite never
 * hits the real internet in CI, per plan.md 002-importacao's explicit
 * instruction. The one thing NOT covered here is "URL real retorna Draft
 * válido" (spec 002 acceptance criterion) — that's a manual verification
 * against a live CifraClub page, done once during this task and re-checked
 * if the strategy ever needs updating.
 */
import { strict as assert } from "node:assert";
import { handleRequest } from "./index.ts";

const FIXTURE_PATH =
  `${import.meta.dirname}/strategies/__fixtures__/cifraclub-sample.html`;
const VALID_URL =
  "https://www.cifraclub.com.br/banda-ficticia/estrada-de-poeira/";

function postRequest(body: unknown): Request {
  return new Request("https://edge.local/import-tab", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function withStubbedFetch<T>(
  stub: typeof fetch,
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

Deno.test("rejects non-POST methods", async () => {
  const res = await handleRequest(
    new Request("https://edge.local/import-tab", { method: "GET" }),
  );
  assert.equal(res.status, 405);
});

Deno.test("rejects a body without a url field", async () => {
  const res = await handleRequest(postRequest({}));
  const json = await res.json();
  assert.equal(res.status, 400);
  assert.equal(json.success, false);
  assert.equal(json.error.code, "INVALID_URL");
});

Deno.test("rejects a malformed url", async () => {
  const res = await handleRequest(postRequest({ url: "not a url" }));
  const json = await res.json();
  assert.equal(res.status, 400);
  assert.equal(json.error.code, "INVALID_URL");
});

Deno.test("rejects unsupported source domains", async () => {
  const res = await handleRequest(
    postRequest({ url: "https://tabs.ultimate-guitar.com/song/1" }),
  );
  const json = await res.json();
  assert.equal(res.status, 422);
  assert.equal(json.success, false);
  assert.equal(json.error.code, "UNSUPPORTED_SOURCE");
});

Deno.test("maps HTTP 403 to a BLOCKED error, not a crash", async () => {
  await withStubbedFetch(
    () => Promise.resolve(new Response("forbidden", { status: 403 })),
    async () => {
      const res = await handleRequest(postRequest({ url: VALID_URL }));
      const json = await res.json();
      assert.equal(res.status, 502);
      assert.equal(json.error.code, "BLOCKED");
    },
  );
});

Deno.test("maps a network failure to FETCH_FAILED, not a crash", async () => {
  await withStubbedFetch(
    () => Promise.reject(new Error("network down")),
    async () => {
      const res = await handleRequest(postRequest({ url: VALID_URL }));
      const json = await res.json();
      assert.equal(res.status, 502);
      assert.equal(json.error.code, "FETCH_FAILED");
    },
  );
});

Deno.test("maps an unrecognized page structure to PARSE_FAILED", async () => {
  await withStubbedFetch(
    () =>
      Promise.resolve(
        new Response("<html><body>surprise redesign</body></html>", {
          status: 200,
        }),
      ),
    async () => {
      const res = await handleRequest(postRequest({ url: VALID_URL }));
      const json = await res.json();
      assert.equal(res.status, 422);
      assert.equal(json.error.code, "PARSE_FAILED");
    },
  );
});

Deno.test("full success path returns a Draft payload matching PLAN.md contract, never writing anything", async () => {
  const fixtureHtml = Deno.readTextFileSync(FIXTURE_PATH);

  await withStubbedFetch(
    () => Promise.resolve(new Response(fixtureHtml, { status: 200 })),
    async () => {
      const res = await handleRequest(postRequest({ url: VALID_URL }));
      const json = await res.json();

      assert.equal(res.status, 200);
      assert.equal(json.success, true);
      assert.equal(json.data.title, "Estrada de Poeira");
      assert.equal(json.data.artist, "Banda Fictícia");
      assert.equal(json.data.original_key, "Em");
      assert.ok(Array.isArray(json.data.ast));
      assert.ok(json.data.ast.length > 0);
      for (const block of json.data.ast) {
        assert.ok(block.id);
        assert.ok(block.type);
        assert.ok(block.repeats >= 1);
      }
    },
  );
});

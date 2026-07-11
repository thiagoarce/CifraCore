/**
 * Edge Function `import-tab` — spec 002-importacao, contract in PLAN.md §4.
 *
 * Fetches a song page by URL, extracts it via a per-domain strategy
 * (Strategy Pattern; MVP only implements CifraClub), and returns a Draft
 * AST payload. Never writes to the database — the frontend always routes
 * the result through the Tela de Rascunho (HITL) before any INSERT
 * (constitution law 1 / spec R2).
 *
 * A real browser User-Agent is used because CifraClub blocks bare
 * server-side requests (PLAN.md risk R5). Any failure — network, HTTP
 * status, or unrecognized page structure — returns a structured error
 * instead of throwing, so the frontend can fall back to the Modo Avançado
 * (paste) flow.
 */
import { extractCifraClub } from "./strategies/cifraclub.ts";
import { parseChordSheet } from "../_shared/parser.ts";

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type ErrorCode =
  | "BLOCKED"
  | "PARSE_FAILED"
  | "UNSUPPORTED_SOURCE"
  | "FETCH_FAILED"
  | "INVALID_URL";

function errorResponse(
  code: ErrorCode,
  message: string,
  status: number,
): Response {
  return new Response(
    JSON.stringify({ success: false, error: { code, message } }),
    {
      status,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    },
  );
}

function successResponse(data: unknown): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

/** Maps a source URL's hostname to its extraction strategy. MVP: CifraClub only (spec R5 backlog: Ultimate Guitar). */
function resolveStrategy(hostname: string): typeof extractCifraClub | null {
  if (
    hostname === "cifraclub.com.br" || hostname.endsWith(".cifraclub.com.br")
  ) {
    return extractCifraClub;
  }
  return null;
}

export async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return errorResponse("INVALID_URL", "Only POST is supported.", 405);
  }

  let sourceUrl: string;
  try {
    const body = await req.json();
    sourceUrl = body?.url;
    if (typeof sourceUrl !== "string" || sourceUrl.length === 0) {
      throw new Error("missing url");
    }
  } catch {
    return errorResponse(
      "INVALID_URL",
      'Request body must be JSON with a non-empty "url" field.',
      400,
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(sourceUrl);
  } catch {
    return errorResponse(
      "INVALID_URL",
      "The provided url is not a valid URL.",
      400,
    );
  }

  const strategy = resolveStrategy(parsedUrl.hostname);
  if (!strategy) {
    return errorResponse(
      "UNSUPPORTED_SOURCE",
      `No import strategy for "${parsedUrl.hostname}". Use o Modo Avançado para colar a cifra manualmente.`,
      422,
    );
  }

  let html: string;
  try {
    const response = await fetch(parsedUrl, {
      headers: { "User-Agent": BROWSER_USER_AGENT },
    });

    if (response.status === 403 || response.status === 429) {
      return errorResponse(
        "BLOCKED",
        `A fonte bloqueou a requisição (HTTP ${response.status}). Use o Modo Avançado para colar a cifra manualmente.`,
        502,
      );
    }
    if (!response.ok) {
      return errorResponse(
        "FETCH_FAILED",
        `A fonte respondeu com HTTP ${response.status}.`,
        502,
      );
    }

    html = await response.text();
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "unknown fetch error";
    return errorResponse(
      "FETCH_FAILED",
      `Falha ao buscar a URL: ${message}`,
      502,
    );
  }

  const extraction = strategy(html, sourceUrl);
  if (!extraction) {
    return errorResponse(
      "PARSE_FAILED",
      "Não foi possível reconhecer a estrutura da página. Use o Modo Avançado para colar a cifra manualmente.",
      422,
    );
  }

  const ast = parseChordSheet(extraction.rawText);

  return successResponse({
    title: extraction.title,
    artist: extraction.artist,
    original_key: extraction.originalKey,
    ast,
  });
}

// Guarded so importing this module for tests doesn't bind a real port.
if (import.meta.main) {
  Deno.serve(handleRequest);
}

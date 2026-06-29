const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS"
};

const GAME_VERSION = "0.1.0";
const RULES_VERSION = "leaderboard-v1";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const submission = await request.json();
    const validationError = validateSubmission(submission);
    if (validationError) return json({ error: validationError }, 400);

    const payload = await verifySignedRunToken(submission.signedRunToken);
    if (!payload || payload.runId !== submission.runId) {
      return json({ error: "Invalid run token" }, 401);
    }

    if (payload.gameVersion !== submission.gameVersion || payload.rulesVersion !== submission.rulesVersion) {
      return json({ error: "Rules version mismatch" }, 409);
    }

    if (Date.now() > Date.parse(payload.expiresAt)) {
      return json({ error: "Run token expired" }, 410);
    }

    const runTokenHash = await sha256Hex(submission.signedRunToken);
    const run = await findRun(submission.runId, runTokenHash);
    if (!run) return json({ error: "Run not found" }, 404);
    if (run.submitted_at) return json({ error: "Run already submitted" }, 409);

    const ipHash = await sha256Hex(request.headers.get("x-forwarded-for") || "unknown");
    const inserted = await insertScore(submission, ipHash);
    if (!inserted) return json({ error: "Failed to submit score" }, 500);

    await markRunSubmitted(submission.runId);
    return json(inserted);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Invalid score request";
    const isConfigError = message.includes("missing");
    return json({ error: isConfigError ? "Leaderboard server is not configured" : message }, isConfigError ? 500 : 400);
  }
});

function validateSubmission(value: Record<string, unknown>): string | null {
  const playerName = String(value.playerName || "");
  const score = Number(value.score);
  const stage = Number(value.stage);
  const durationMs = Number(value.durationMs);

  if (!/^[\p{L}\p{N}_ -]{1,16}$/u.test(playerName)) return "Invalid player name";
  if (!Number.isInteger(score) || score < 0 || score > 5_000_000) return "Invalid score";
  if (!Number.isInteger(stage) || stage < 1 || stage > 99) return "Invalid stage";
  if (!Number.isFinite(durationMs) || durationMs < 0 || durationMs > 14_400_000) return "Invalid duration";
  if (score >= 10_000 && durationMs < 10_000) return "Score is too high for the run duration";

  const scoreCeiling = 100_000 + stage * 35_000 + Math.max(1, durationMs / 1000) * 7_500;
  if (score > scoreCeiling) return "Score velocity is implausible";

  if (value.gameVersion !== GAME_VERSION || value.rulesVersion !== RULES_VERSION) return "Unsupported rules version";
  if (typeof value.runId !== "string" || typeof value.signedRunToken !== "string") return "Missing run token";

  return null;
}

async function verifySignedRunToken(token: string): Promise<Record<string, string> | null> {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = await hmacHex(encodedPayload, getSigningSecret());
  if (!timingSafeEqual(signature, expected)) return null;

  try {
    return JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    return null;
  }
}

async function findRun(runId: string, runTokenHash: string): Promise<{ submitted_at: string | null } | null> {
  const params = new URLSearchParams({
    id: `eq.${runId}`,
    run_token_hash: `eq.${runTokenHash}`,
    select: "submitted_at"
  });

  const response = await serviceFetch(`/rest/v1/leaderboard_runs?${params.toString()}`, { method: "GET" });
  if (!response.ok) return null;

  const rows = await response.json();
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

async function insertScore(submission: Record<string, unknown>, ipHash: string): Promise<Record<string, unknown> | null> {
  const response = await serviceFetch("/rest/v1/leaderboard_scores", {
    method: "POST",
    headers: { "content-type": "application/json", prefer: "return=representation" },
    body: JSON.stringify({
      player_name: submission.playerName,
      score: submission.score,
      stage: submission.stage,
      ship_color: submission.shipColor,
      duration_ms: submission.durationMs,
      game_version: submission.gameVersion,
      rules_version: submission.rulesVersion,
      run_id: submission.runId,
      verified: true,
      ip_hash: ipHash
    })
  });

  if (!response.ok) return null;
  const rows = await response.json();
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

async function markRunSubmitted(runId: string): Promise<void> {
  await serviceFetch(`/rest/v1/leaderboard_runs?id=eq.${runId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", prefer: "return=minimal" },
    body: JSON.stringify({ submitted_at: new Date().toISOString() })
  });
}

async function hmacHex(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return bufferToHex(signature);
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bufferToHex(digest);
}

function bufferToHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function base64UrlDecode(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return atob(padded);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

function getSigningSecret(): string {
  const secret = Deno.env.get("RUN_SIGNING_SECRET");
  if (!secret) throw new Error("RUN_SIGNING_SECRET is missing");
  return secret;
}

function serviceFetch(path: string, init: RequestInit): Promise<Response> {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) throw new Error("Supabase service env is missing");

  return fetch(`${url}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`
    }
  });
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" }
  });
}

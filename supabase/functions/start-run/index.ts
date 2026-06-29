const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS"
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const gameVersion = String(body.gameVersion || "0.1.0");
    const rulesVersion = String(body.rulesVersion || "leaderboard-v1");
    const runId = crypto.randomUUID();
    const seed = crypto.randomUUID();
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + 4 * 60 * 60 * 1000);

    const tokenPayload = {
      runId,
      seed,
      startedAt: startedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      gameVersion,
      rulesVersion
    };
    const signedRunToken = await signPayload(tokenPayload);
    const runTokenHash = await sha256Hex(signedRunToken);
    const ipHash = await sha256Hex(request.headers.get("x-forwarded-for") || "unknown");

    const response = await serviceFetch("/rest/v1/leaderboard_runs", {
      method: "POST",
      headers: { "content-type": "application/json", prefer: "return=minimal" },
      body: JSON.stringify({
        id: runId,
        run_token_hash: runTokenHash,
        seed,
        game_version: gameVersion,
        rules_version: rulesVersion,
        started_at: startedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        ip_hash: ipHash
      })
    });

    if (!response.ok) {
      return json({ error: "Failed to create run" }, 500);
    }

    return json({
      runId,
      signedRunToken,
      seed,
      startedAt: startedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      gameVersion,
      rulesVersion
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Invalid run request";
    const isConfigError = message.includes("missing");
    return json({ error: isConfigError ? "Leaderboard server is not configured" : message }, isConfigError ? 500 : 400);
  }
});

async function signPayload(payload: Record<string, unknown>): Promise<string> {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await hmacHex(encodedPayload, getSigningSecret());
  return `${encodedPayload}.${signature}`;
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

function base64UrlEncode(value: string): string {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
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

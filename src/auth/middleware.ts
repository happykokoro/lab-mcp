import type { IncomingMessage, ServerResponse } from "node:http";
import { createHash } from "node:crypto";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

interface CachedAuth {
  authInfo: AuthInfo;
  expiresAt: number;
}

const cache = new Map<string, CachedAuth>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX_SIZE = 500;

function pruneCache() {
  if (cache.size <= CACHE_MAX_SIZE) return;
  const now = Date.now();
  for (const [k, v] of cache) {
    if (v.expiresAt <= now) cache.delete(k);
  }
  // If still over limit after expiring, evict oldest entries
  if (cache.size > CACHE_MAX_SIZE) {
    const sorted = [...cache.entries()].sort(
      (a, b) => a[1].expiresAt - b[1].expiresAt,
    );
    const toRemove = sorted.slice(0, cache.size - CACHE_MAX_SIZE);
    for (const [k] of toRemove) {
      cache.delete(k);
    }
  }
}

function extractToken(req: IncomingMessage): string | undefined {
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  const apiKey = req.headers["x-api-key"];
  if (typeof apiKey === "string") {
    return apiKey;
  }
  return undefined;
}

function getCacheKey(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function validateApiKey(
  token: string,
  platformUrl: string,
): Promise<AuthInfo | null> {
  const cacheKey = getCacheKey(token);
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.authInfo;
  }

  try {
    const res = await fetch(`${platformUrl}/api/auth/me`, {
      headers: { "X-API-Key": token },
    });
    if (!res.ok) return null;

    const user = (await res.json()) as {
      id: string;
      tier: string;
      scopes?: string[];
    };

    const authInfo: AuthInfo = {
      token,
      clientId: user.id,
      scopes: user.scopes ?? [],
      extra: {
        userId: user.id,
        tier: user.tier,
      },
    };

    pruneCache();
    cache.set(cacheKey, {
      authInfo,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return authInfo;
  } catch (err) {
    console.error("Platform auth check failed:", err);
    throw new Error("platform_unavailable");
  }
}

export function authMiddleware(platformUrl: string) {
  return async (
    req: IncomingMessage & { auth?: AuthInfo },
    res: ServerResponse,
    next: () => void,
  ) => {
    const token = extractToken(req);
    if (!token) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32001,
            message:
              "Authentication required. Include Authorization: Bearer kok_xxx or X-API-Key header.",
          },
          id: null,
        }),
      );
      return;
    }

    let authInfo: AuthInfo | null;
    try {
      authInfo = await validateApiKey(token, platformUrl);
    } catch (err) {
      if (err instanceof Error && err.message === "platform_unavailable") {
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: {
              code: -32002,
              message:
                "Authentication service unavailable. Please try again later.",
            },
            id: null,
          }),
        );
        return;
      }
      throw err;
    }

    if (!authInfo) {
      const helpUrl = process.env.UPGRADE_URL;
      const helpMsg = helpUrl
        ? `Invalid API key. Manage keys at ${helpUrl}.`
        : "Invalid API key.";
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32001,
            message: helpMsg,
          },
          id: null,
        }),
      );
      return;
    }

    req.auth = authInfo;
    next();
  };
}

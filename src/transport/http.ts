import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { createMcpServer, type ServerUrls } from "../server.js";
import { authMiddleware } from "../auth/middleware.js";

interface SessionEntry {
  transport: StreamableHTTPServerTransport;
  clientId: string;
  lastActivity: number;
}

export function startHttpServer(urls: ServerUrls, port: number) {
  const sessions = new Map<string, SessionEntry>();
  const auth = authMiddleware(urls.platformUrl);
  const corsOrigin = process.env.CORS_ORIGIN ?? "https://alpha.happykokoro.com";
  const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  // Periodically clean up idle sessions
  const sessionCleanupInterval = setInterval(
    () => {
      const now = Date.now();
      for (const [id, entry] of sessions) {
        if (now - entry.lastActivity > SESSION_IDLE_TIMEOUT_MS) {
          entry.transport.close();
          sessions.delete(id);
        }
      }
    },
    5 * 60 * 1000,
  ); // check every 5 minutes
  sessionCleanupInterval.unref();

  const httpServer = createServer(
    async (req: IncomingMessage & { auth?: AuthInfo }, res: ServerResponse) => {
      // CORS
      res.setHeader("Access-Control-Allow-Origin", corsOrigin);
      res.setHeader("Vary", "Origin");
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, DELETE, OPTIONS",
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-API-Key, Mcp-Session-Id",
      );
      res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      // Health check
      if (req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", sessions: sessions.size }));
        return;
      }

      // Only /mcp path
      if (req.url !== "/mcp" && !req.url?.startsWith("/mcp?")) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not found" }));
        return;
      }

      // Auth
      await new Promise<void>((resolve) => {
        auth(req, res, () => resolve());
      });
      if (res.writableEnded) return;

      // Parse body for POST
      let parsedBody: unknown;
      if (req.method === "POST") {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
        }
        try {
          parsedBody = JSON.parse(Buffer.concat(chunks).toString());
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON" }));
          return;
        }
      }

      // Check for existing session
      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      if (sessionId && sessions.has(sessionId)) {
        const entry = sessions.get(sessionId)!;
        if (entry.clientId !== req.auth?.clientId) {
          res.writeHead(403, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              error: "Session belongs to a different user.",
            }),
          );
          return;
        }
        entry.lastActivity = Date.now();
        await entry.transport.handleRequest(req, res, parsedBody);
        return;
      }

      // New session — only on POST with initialize
      if (req.method === "POST" && isInitializeRequest(parsedBody)) {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => {
            sessions.set(id, {
              transport,
              clientId: req.auth!.clientId,
              lastActivity: Date.now(),
            });
          },
        });

        transport.onclose = () => {
          if (transport.sessionId) {
            sessions.delete(transport.sessionId);
          }
        };

        const server = createMcpServer(urls);
        await server.connect(transport);
        await transport.handleRequest(req, res, parsedBody);
        return;
      }

      // Invalid request — no session ID on non-init request
      if (sessionId && !sessions.has(sessionId)) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "Session not found. Send an initialize request first.",
          }),
        );
        return;
      }

      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "Bad request. Send an initialize request first.",
        }),
      );
    },
  );

  httpServer.listen(port, () => {
    console.log(`MCP HTTP server listening on port ${port}`);
    console.log(`Health check: http://localhost:${port}/health`);
    console.log(`MCP endpoint: http://localhost:${port}/mcp`);
  });

  function shutdown() {
    console.log("Shutting down...");
    clearInterval(sessionCleanupInterval);
    for (const entry of sessions.values()) {
      entry.transport.close();
    }
    httpServer.close(() => process.exit(0));
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

function isInitializeRequest(body: unknown): boolean {
  if (Array.isArray(body)) {
    return body.some(
      (m) =>
        typeof m === "object" &&
        m !== null &&
        (m as Record<string, unknown>).method === "initialize",
    );
  }
  return (
    typeof body === "object" &&
    body !== null &&
    (body as Record<string, unknown>).method === "initialize"
  );
}

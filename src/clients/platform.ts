import { BaseClient } from "./base.js";
import type { Bot, ClusterHealth, User } from "../types/platform.js";

/** Typed client for Platform gateway (port 4000) — auth + engine + admin. */
export class PlatformClient extends BaseClient {
  constructor(baseUrl = "http://localhost:4000", token?: string) {
    super({
      baseUrl,
      serviceName: "platform",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }

  // ── Engine ────────────────────────────────────────────────

  deployBot(params: { artifact_id: string; config?: Record<string, unknown> }): Promise<{ bot: Bot }> {
    return this.post("/api/engine/deploy", params);
  }

  stopBot(botId: string): Promise<{ success: boolean }> {
    return this.post("/api/engine/stop", { bot_id: botId });
  }

  getBotStatus(botId: string): Promise<Bot> {
    return this.get(`/api/engine/status/${encodeURIComponent(botId)}`);
  }

  listBots(): Promise<{ bots: Bot[] }> {
    return this.get("/api/engine/bots");
  }

  getEngineHealth(): Promise<ClusterHealth> {
    return this.get("/api/engine/health");
  }

  // ── Admin ─────────────────────────────────────────────────

  listUsers(): Promise<{ users: User[] }> {
    return this.get("/api/admin/users");
  }

  updateUserTier(userId: string, tier: string): Promise<User> {
    return this.put(`/api/admin/users/${encodeURIComponent(userId)}/tier`, { tier });
  }

  systemHealth(): Promise<unknown> {
    return this.get("/api/admin/system");
  }

  getAuditLog(limit = 100): Promise<unknown> {
    return this.get(`/api/admin/audit?limit=${limit}`);
  }
}

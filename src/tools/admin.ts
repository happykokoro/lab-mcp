import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ServiceRegistry } from "../clients/registry.js";
import { McpServiceError } from "../types/errors.js";

export function registerAdminTools(server: McpServer, reg: ServiceRegistry) {
  server.registerTool(
    "list_users",
    {
      description: "List all users with tier level and usage statistics (admin only)",
    },
    async () => {
      try {
        reg.requirePlatform();
        const data = await reg.platform!.listUsers();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );

  server.registerTool(
    "update_user_tier",
    {
      description: "Change a user's subscription tier (admin only)",
      inputSchema: {
        user_id: z.string().describe("User ID to modify"),
        tier: z.enum(["free", "starter", "pro", "enterprise"]).describe("New tier level"),
      },
    },
    async ({ user_id, tier }) => {
      try {
        reg.requirePlatform();
        const data = await reg.platform!.updateUserTier(user_id, tier);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );

  server.registerTool(
    "system_health",
    {
      description: "System health dashboard: services, connections, resource utilization (admin only)",
    },
    async () => {
      try {
        reg.requirePlatform();
        const data = await reg.platform!.systemHealth();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );

  server.registerTool(
    "audit_log",
    {
      description: "View admin audit log (admin only)",
      inputSchema: { limit: z.number().optional().describe("Max entries (default: 100)") },
    },
    async ({ limit }) => {
      try {
        reg.requirePlatform();
        const data = await reg.platform!.getAuditLog(limit ?? 100);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );
}

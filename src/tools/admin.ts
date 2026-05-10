import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PlatformClient } from "../client/platform.js";
import { tierGatedTool } from "../auth/tierGate.js";

export function registerAdminTools(server: McpServer, platformUrl: string) {
  const client = new PlatformClient(platformUrl, process.env.API_KEY);

  server.tool(
    "admin_list_users",
    "List all users with their tier and usage statistics (tier-4 admin only).",
    {},
    tierGatedTool("tier-4", async () => ({
      content: [{ type: "text", text: await client.listUsers() }],
    })),
  );

  server.tool(
    "admin_change_user_tier",
    "Change a user's subscription tier (tier-4 admin only).",
    {
      user_id: z.string().describe("User ID to modify"),
      tier: z
        .enum(["tier-1", "tier-2", "tier-3", "tier-4"])
        .describe(
          "New tier label: 'tier-1', 'tier-2', 'tier-3', or 'tier-4'.",
        ),
    },
    tierGatedTool("tier-4", async ({ user_id, tier }) => ({
      content: [
        {
          type: "text",
          text: await client.changeUserTier(user_id as string, tier as string),
        },
      ],
    })),
  );

  server.tool(
    "admin_list_all_bots",
    "List all bots across all users with owner, state, and resource usage (tier-4 admin only).",
    {},
    tierGatedTool("tier-4", async () => ({
      content: [{ type: "text", text: await client.listAllBots() }],
    })),
  );

  server.tool(
    "admin_kill_bot",
    "Force-stop any bot by ID — emergency kill switch (tier-4 admin only).",
    {
      bot_id: z.string().describe("Bot ID to force-stop"),
    },
    tierGatedTool("tier-4", async ({ bot_id }) => ({
      content: [{ type: "text", text: await client.killBot(bot_id as string) }],
    })),
  );

  server.tool(
    "admin_system_health",
    "System health dashboard — services, queues, resource utilization (tier-4 admin only).",
    {},
    tierGatedTool("tier-4", async () => ({
      content: [{ type: "text", text: await client.getSystemHealth() }],
    })),
  );

  server.tool(
    "admin_audit_log",
    "View admin audit log — who did what and when (tier-4 admin only).",
    {
      limit: z
        .number()
        .optional()
        .describe("Maximum number of log entries to return (default: 50)"),
    },
    tierGatedTool("tier-4", async ({ limit }) => ({
      content: [
        { type: "text", text: await client.getAuditLog(limit as number) },
      ],
    })),
  );
}

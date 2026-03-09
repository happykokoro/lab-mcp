import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PlatformClient } from "../client/platform.js";
import { tierGatedTool } from "../auth/tierGate.js";

export function registerAdminTools(server: McpServer, platformUrl: string) {
  const client = new PlatformClient(platformUrl, process.env.API_KEY);

  server.tool(
    "admin_list_users",
    "List all users with their tier level and usage statistics (ProMax admin only)",
    {},
    tierGatedTool("pro_max", async () => ({
      content: [{ type: "text", text: await client.listUsers() }],
    })),
  );

  server.tool(
    "admin_change_user_tier",
    "Change a user's subscription tier (ProMax admin only)",
    {
      user_id: z.string().describe("User ID to modify"),
      tier: z
        .enum(["free", "level1", "level2", "dev_beta", "pro_max"])
        .describe(
          "New tier: 'free', 'level1', 'level2', 'dev_beta', or 'pro_max'",
        ),
    },
    tierGatedTool("pro_max", async ({ user_id, tier }) => ({
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
    "List all bots across all users with owner, state, and resource usage (ProMax admin only)",
    {},
    tierGatedTool("pro_max", async () => ({
      content: [{ type: "text", text: await client.listAllBots() }],
    })),
  );

  server.tool(
    "admin_kill_bot",
    "Force-stop any bot by ID — emergency kill switch (ProMax admin only)",
    {
      bot_id: z.string().describe("Bot ID to force-stop"),
    },
    tierGatedTool("pro_max", async ({ bot_id }) => ({
      content: [{ type: "text", text: await client.killBot(bot_id as string) }],
    })),
  );

  server.tool(
    "admin_system_health",
    "System health dashboard — services, queues, resource utilization (ProMax admin only)",
    {},
    tierGatedTool("pro_max", async () => ({
      content: [{ type: "text", text: await client.getSystemHealth() }],
    })),
  );

  server.tool(
    "admin_audit_log",
    "View admin audit log — who did what and when (ProMax admin only)",
    {
      limit: z
        .number()
        .optional()
        .describe("Maximum number of log entries to return (default: 50)"),
    },
    tierGatedTool("pro_max", async ({ limit }) => ({
      content: [
        { type: "text", text: await client.getAuditLog(limit as number) },
      ],
    })),
  );
}

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PlatformClient } from "../client/platform.js";
import { tierGatedTool } from "../auth/tierGate.js";

export function registerEngineTools(server: McpServer, platformUrl: string) {
  const client = new PlatformClient(platformUrl, process.env.API_KEY);

  server.tool(
    "engine_deploy_bot",
    "Deploy a strategy artifact as a live bot. Returns bot ID and initial status.",
    {
      artifact_id: z.string().describe("ID of the artifact to deploy"),
      config: z
        .record(z.unknown())
        .optional()
        .describe("Optional deployment configuration overrides"),
    },
    tierGatedTool("tier-3", async ({ artifact_id, config }) => ({
      content: [
        {
          type: "text",
          text: await client.deployBot({ artifact_id, config }),
        },
      ],
    })),
  );

  server.tool(
    "engine_stop_bot",
    "Stop a running bot by ID. Gracefully closes positions before shutdown.",
    {
      bot_id: z.string().describe("The bot ID to stop"),
    },
    tierGatedTool("tier-3", async ({ bot_id }) => ({
      content: [{ type: "text", text: await client.stopBot(bot_id as string) }],
    })),
  );

  server.tool(
    "engine_bot_status",
    "Get the current status of a deployed bot (state, uptime, positions, PnL)",
    {
      bot_id: z.string().describe("The bot ID to query"),
    },
    tierGatedTool("tier-3", async ({ bot_id }) => ({
      content: [
        { type: "text", text: await client.getBotStatus(bot_id as string) },
      ],
    })),
  );

  server.tool(
    "engine_list_bots",
    "List all deployed bots with their current state and summary metrics",
    {},
    tierGatedTool("tier-3", async () => ({
      content: [{ type: "text", text: await client.listBots() }],
    })),
  );

  server.tool(
    "engine_cluster_health",
    "Check engine cluster health — node count, capacity, and resource usage",
    {},
    tierGatedTool("tier-3", async () => ({
      content: [{ type: "text", text: await client.getClusterHealth() }],
    })),
  );

  server.tool(
    "engine_positions",
    "Get real-time positions across all running bots (polling snapshot)",
    {},
    tierGatedTool("tier-3", async () => ({
      content: [{ type: "text", text: await client.getPositionsStream() }],
    })),
  );

  server.tool(
    "engine_trades",
    "Get recent trades across all running bots (polling snapshot)",
    {},
    tierGatedTool("tier-3", async () => ({
      content: [{ type: "text", text: await client.getTradesStream() }],
    })),
  );
}

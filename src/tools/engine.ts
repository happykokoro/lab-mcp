import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ServiceRegistry } from "../clients/registry.js";
import { McpServiceError } from "../types/errors.js";

export function registerEngineTools(server: McpServer, reg: ServiceRegistry) {
  server.registerTool(
    "deploy_bot",
    {
      description: "Deploy a strategy artifact as a live bot on the Engine. Returns bot ID and initial status. Requires Platform auth.",
      inputSchema: {
        artifact_id: z.string().describe("ID of the artifact to deploy"),
        config: z.record(z.unknown()).optional().describe("Optional deployment config overrides"),
      },
    },
    async ({ artifact_id, config }) => {
      try {
        reg.requirePlatform();
        const data = await reg.platform!.deployBot({ artifact_id, config });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );

  server.registerTool(
    "stop_bot",
    {
      description: "Stop a running bot. Gracefully closes positions before shutdown.",
      inputSchema: { bot_id: z.string().describe("The bot ID to stop") },
    },
    async ({ bot_id }) => {
      try {
        reg.requirePlatform();
        const data = await reg.platform!.stopBot(bot_id);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );

  server.registerTool(
    "get_bot_status",
    {
      description: "Get current status of a deployed bot (state, uptime, positions, PnL, trades)",
      inputSchema: { bot_id: z.string().describe("The bot ID to query") },
    },
    async ({ bot_id }) => {
      try {
        reg.requirePlatform();
        const data = await reg.platform!.getBotStatus(bot_id);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );

  server.registerTool(
    "list_bots",
    {
      description: "List all deployed bots with current state and summary metrics",
    },
    async () => {
      try {
        reg.requirePlatform();
        const data = await reg.platform!.listBots();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );

  server.registerTool(
    "engine_health",
    {
      description: "Check Engine cluster health: active bots, capacity, resource usage",
    },
    async () => {
      try {
        reg.requirePlatform();
        const data = await reg.platform!.getEngineHealth();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );
}

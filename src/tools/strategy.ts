import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceRegistry } from "../clients/registry.js";
import { McpServiceError } from "../types/errors.js";

export function registerStrategyTools(server: McpServer, reg: ServiceRegistry) {
  server.registerTool(
    "get_strategy",
    {
      description: "Get the currently loaded strategy configuration (factors, roles, weights, risk limits)",
    },
    async () => {
      try {
        const data = await reg.lab.getStrategy();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );

  server.registerTool(
    "reload_strategy",
    {
      description: "Hot-reload strategy TOML from disk. Use after editing strategy files. Lab mode only.",
    },
    async () => {
      try {
        const data = await reg.lab.reloadStrategy();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );

  server.registerTool(
    "get_tracked_wallets",
    {
      description: "List all wallets being monitored for swap activity with per-wallet signal stats",
    },
    async () => {
      try {
        const data = await reg.lab.getTrackedWallets();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );
}

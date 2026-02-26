import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceRegistry } from "../clients/registry.js";
import { McpServiceError } from "../types/errors.js";

export function registerPositionTools(server: McpServer, reg: ServiceRegistry) {
  server.registerTool(
    "get_positions",
    {
      description: "List all positions (open and closed) with entry price, current price, PnL, and status",
    },
    async () => {
      try {
        const data = await reg.lab.getPositions();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );

  server.registerTool(
    "get_positions_summary",
    {
      description: "Get portfolio summary: open/closed count, total PnL, win rate, deployed SOL",
    },
    async () => {
      try {
        const data = await reg.lab.getPositionsSummary();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );
}

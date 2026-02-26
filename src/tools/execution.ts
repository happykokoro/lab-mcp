import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ServiceRegistry } from "../clients/registry.js";
import { McpServiceError } from "../types/errors.js";

export function registerExecutionTools(server: McpServer, reg: ServiceRegistry) {
  server.registerTool(
    "get_execution_config",
    {
      description: "Get execution pipeline config: backend, sizer strategy, slippage model, thresholds",
    },
    async () => {
      try {
        const data = await reg.lab.getExecutionConfig();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );

  server.registerTool(
    "reload_execution",
    {
      description: "Hot-reload execution configuration from TOML. Lab mode only.",
    },
    async () => {
      try {
        const data = await reg.lab.reloadExecution();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );

  server.registerTool(
    "get_execution_history",
    {
      description: "Get execution history: recent orders with fill price, slippage, latency, and quality metrics",
      inputSchema: { limit: z.number().optional().describe("Max entries to return (default: 50)") },
    },
    async ({ limit }) => {
      try {
        const data = await reg.lab.getExecutionHistory(limit ?? 50);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );
}

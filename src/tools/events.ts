import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ServiceRegistry } from "../clients/registry.js";
import { McpServiceError } from "../types/errors.js";

export function registerEventTools(server: McpServer, reg: ServiceRegistry) {
  server.registerTool(
    "get_events",
    {
      description: "Get recent events: signals, compositions, risk decisions, trade executions, strategy reloads",
      inputSchema: {
        type: z.string().optional().describe("Filter by event type (e.g. 'signal', 'trade_execution')"),
        limit: z.number().optional().describe("Max events to return (default: 100)"),
      },
    },
    async ({ type, limit }) => {
      try {
        const data = await reg.lab.getEvents({ type, limit });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );

  server.registerTool(
    "get_traces",
    {
      description: "Get the 50 most recent decision traces: factor signals, composition result, risk verdict, execution outcome",
    },
    async () => {
      try {
        const data = await reg.lab.getTraces();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );

  server.registerTool(
    "get_correlation",
    {
      description: "Get pairwise factor correlation matrices. Warns when correlation exceeds threshold.",
    },
    async () => {
      try {
        const data = await reg.lab.getCorrelation();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );
}

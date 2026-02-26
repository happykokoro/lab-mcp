import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ServiceRegistry } from "../clients/registry.js";
import { McpServiceError } from "../types/errors.js";

export function registerBacktestTools(server: McpServer, reg: ServiceRegistry) {
  server.registerTool(
    "run_backtest",
    {
      description: "Run a backtest through the factor pipeline. Returns trades, PnL, win rate, max drawdown, per-factor scores.",
      inputSchema: {
        scenario: z.string().optional().describe("Scenario: 'crash', 'ramp', or 'sideways'"),
        file_path: z.string().optional().describe("Path to JSONL replay file"),
        token_mint: z.string().optional().describe("Token mint address (default: synthetic)"),
        steps: z.number().optional().describe("Steps for scenario generation (default: 120)"),
      },
    },
    async (params) => {
      try {
        const data = await reg.lab.runBacktest(params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );

  server.registerTool(
    "list_backtest_scenarios",
    {
      description: "List available backtest scenarios with descriptions and default parameters",
    },
    async () => {
      try {
        const data = await reg.lab.listScenarios();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );
}

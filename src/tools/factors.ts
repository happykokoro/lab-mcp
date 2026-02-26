import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ServiceRegistry } from "../clients/registry.js";
import { McpServiceError } from "../types/errors.js";

export function registerFactorTools(server: McpServer, reg: ServiceRegistry) {
  server.registerTool(
    "get_factors",
    {
      description: "List all configured factors with enabled status, role, weight, win rate, and attribution scorecard",
    },
    async () => {
      try {
        const data = await reg.lab.getFactors();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );

  server.registerTool(
    "get_factor_scorecard",
    {
      description: "Get attribution scorecard for a specific factor (win rate, PnL, signal count, consecutive losses)",
      inputSchema: { factor_name: z.string().describe("Factor name (e.g. 'swap-momentum', 'hierarchical-filters')") },
    },
    async ({ factor_name }) => {
      try {
        const data = await reg.lab.getFactorScorecard(factor_name);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );

  server.registerTool(
    "get_factor_accuracy",
    {
      description: "Get prediction accuracy for a factor (MAE, RMSE, directional accuracy, calibration)",
      inputSchema: { factor_name: z.string().describe("Factor name") },
    },
    async ({ factor_name }) => {
      try {
        const data = await reg.lab.getFactorAccuracy(factor_name);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );
}

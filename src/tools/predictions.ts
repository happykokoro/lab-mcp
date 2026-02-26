import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceRegistry } from "../clients/registry.js";
import { McpServiceError } from "../types/errors.js";

export function registerPredictionTools(server: McpServer, reg: ServiceRegistry) {
  server.registerTool(
    "get_predictions",
    {
      description: "List pending predictions awaiting resolution against actual prices",
    },
    async () => {
      try {
        const data = await reg.lab.getPredictions();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );

  server.registerTool(
    "get_prediction_results",
    {
      description: "Get per-factor prediction accuracy results (MAE, RMSE, directional accuracy)",
    },
    async () => {
      try {
        const data = await reg.lab.getPredictionResults();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );

  server.registerTool(
    "get_expert_weights",
    {
      description: "Get the expert aggregator's learned weights for each factor — shows which factors the system trusts most",
    },
    async () => {
      try {
        const data = await reg.lab.getExpertWeights();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );
}

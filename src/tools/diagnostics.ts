import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceRegistry } from "../clients/registry.js";
import { McpServiceError } from "../types/errors.js";

export function registerDiagnosticTools(server: McpServer, reg: ServiceRegistry) {
  server.registerTool(
    "get_filter_state",
    {
      description: "Get H-infinity filter internals: 3 layers (fast/medium/slow) with state vectors, P-matrix, innovation, gain, gating status",
    },
    async () => {
      try {
        const data = await reg.lab.getFilterState();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );

  server.registerTool(
    "get_confidence",
    {
      description: "Get 11-component confidence breakdown (innovation quality, velocity freshness, filter agreement, etc.)",
    },
    async () => {
      try {
        const data = await reg.lab.getConfidence();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );

  server.registerTool(
    "get_prediction_diagnostics",
    {
      description: "Get per-horizon prediction internals (300s/1800s/3600s): drift, mean-reversion, damping, conformal bands, Hurst exponent",
    },
    async () => {
      try {
        const data = await reg.lab.getPredictionDiagnostics();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );

  server.registerTool(
    "get_convergence_history",
    {
      description: "Get convergence gate timeline: model stress events, spectral event magnitude, signal suppression",
    },
    async () => {
      try {
        const data = await reg.lab.getConvergenceHistory();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );
}

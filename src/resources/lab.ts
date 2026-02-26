import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceRegistry } from "../clients/registry.js";

export function registerLabResources(server: McpServer, reg: ServiceRegistry) {
  // ── Static resources ──────────────────────────────────────────────

  server.registerResource(
    "lab-health",
    "lab://health",
    { description: "Lab service health status" },
    async (uri) => {
      const data = await reg.lab.getHealth();
      return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerResource(
    "lab-mode",
    "lab://mode",
    { description: "Current Lab operating mode (paper/live) and tracked tokens" },
    async (uri) => {
      const data = await reg.lab.getMode();
      return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerResource(
    "lab-metrics",
    "lab://metrics",
    { description: "Lab performance metrics: win rate, PnL, Sharpe, drawdown, trade count" },
    async (uri) => {
      const data = await reg.lab.getMetrics();
      return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerResource(
    "lab-signals",
    "lab://signals",
    { description: "All trading signals with factor breakdown, confidence, and status" },
    async (uri) => {
      const data = await reg.lab.getSignals();
      return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerResource(
    "lab-positions-summary",
    "lab://positions/summary",
    { description: "Aggregated position summary: total PnL, open count, win rate" },
    async (uri) => {
      const data = await reg.lab.getPositionsSummary();
      return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerResource(
    "lab-factors",
    "lab://factors",
    { description: "All active factors with roles, weights, and current signal values" },
    async (uri) => {
      const data = await reg.lab.getFactors();
      return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerResource(
    "lab-strategy",
    "lab://strategy",
    { description: "Active strategy configuration: factors, composition, risk parameters" },
    async (uri) => {
      const data = await reg.lab.getStrategy();
      return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerResource(
    "lab-tracked-wallets",
    "lab://tracked-wallets",
    { description: "Tracked wallet addresses with labels and activity stats" },
    async (uri) => {
      const data = await reg.lab.getTrackedWallets();
      return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerResource(
    "lab-correlation",
    "lab://correlation",
    { description: "Pairwise factor correlation matrix with threshold warnings" },
    async (uri) => {
      const data = await reg.lab.getCorrelation();
      return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerResource(
    "lab-execution-config",
    "lab://execution/config",
    { description: "Current execution pipeline configuration: sizer, slippage, venue settings" },
    async (uri) => {
      const data = await reg.lab.getExecutionConfig();
      return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerResource(
    "lab-diagnostics-filter-state",
    "lab://diagnostics/filter-state",
    { description: "H-infinity filter internal state: state vector, covariance, innovation stats" },
    async (uri) => {
      const data = await reg.lab.getFilterState();
      return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerResource(
    "lab-diagnostics-confidence",
    "lab://diagnostics/confidence",
    { description: "Signal confidence breakdown: filter health, prediction agreement, microstructure quality" },
    async (uri) => {
      const data = await reg.lab.getConfidence();
      return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerResource(
    "lab-diagnostics-predictions",
    "lab://diagnostics/predictions",
    { description: "Prediction engine diagnostics: expert weights, accuracy per horizon, calibration" },
    async (uri) => {
      const data = await reg.lab.getPredictionDiagnostics();
      return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerResource(
    "lab-diagnostics-convergence",
    "lab://diagnostics/convergence",
    { description: "Filter convergence history: innovation sequence, covariance trace over time" },
    async (uri) => {
      const data = await reg.lab.getConvergenceHistory();
      return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerResource(
    "lab-microstructure",
    "lab://microstructure",
    { description: "Real-time microstructure state: spread, depth, order flow imbalance, toxicity" },
    async (uri) => {
      const data = await reg.lab.getMicrostructureState();
      return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
    },
  );

  // ── Resource templates ────────────────────────────────────────────

  server.registerResource(
    "factor-scorecard",
    new ResourceTemplate("lab://factors/{name}/scorecard", { list: undefined }),
    { description: "Detailed scorecard for a specific factor: accuracy, hit rate, avg return, recent signals" },
    async (uri, variables) => {
      const name = String(variables.name);
      const data = await reg.lab.getFactorScorecard(name);
      return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerResource(
    "factor-accuracy",
    new ResourceTemplate("lab://factors/{name}/accuracy", { list: undefined }),
    { description: "Prediction accuracy breakdown for a specific factor over multiple horizons" },
    async (uri, variables) => {
      const name = String(variables.name);
      const data = await reg.lab.getFactorAccuracy(name);
      return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
    },
  );
}

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ServiceRegistry } from "../clients/registry.js";

function textMsg(role: "user" | "assistant", text: string) {
  return { role, content: { type: "text" as const, text } };
}

export function registerAnalysisPrompts(server: McpServer, reg: ServiceRegistry) {
  // ── 1. Signal Analysis ────────────────────────────────────────────

  server.registerPrompt(
    "signal-analysis",
    {
      description: "Analyze current signal quality: factors, confidence, composition, and actionability",
    },
    async () => {
      const [signals, factors, confidence] = await Promise.all([
        reg.lab.getSignals(),
        reg.lab.getFactors(),
        reg.lab.getConfidence(),
      ]);

      return {
        messages: [
          textMsg("user", [
            "Analyze the current trading signals. Here is the live data:\n",
            "## Signals",
            "```json",
            JSON.stringify(signals, null, 2),
            "```\n",
            "## Factors",
            "```json",
            JSON.stringify(factors, null, 2),
            "```\n",
            "## Confidence Breakdown",
            "```json",
            JSON.stringify(confidence, null, 2),
            "```\n",
            "Please analyze:",
            "1. Which signals are actionable and why?",
            "2. Factor agreement — are primary and confirmation factors aligned?",
            "3. Confidence quality — is the confidence score well-supported?",
            "4. Any red flags (low confidence, factor divergence, filter warnings)?",
          ].join("\n")),
        ],
      };
    },
  );

  // ── 2. Factor Performance ─────────────────────────────────────────

  server.registerPrompt(
    "factor-performance",
    {
      description: "Assess factor health: scorecards, prediction accuracy, and cross-correlation",
      argsSchema: {
        factor_name: z.string().optional().describe("Specific factor to focus on (optional, analyzes all if omitted)"),
      },
    },
    async ({ factor_name }) => {
      const [factors, predictions, correlation] = await Promise.all([
        reg.lab.getFactors(),
        reg.lab.getPredictionResults(),
        reg.lab.getCorrelation(),
      ]);

      let scorecardSection = "";
      if (factor_name) {
        const scorecard = await reg.lab.getFactorScorecard(factor_name);
        scorecardSection = `## Scorecard: ${factor_name}\n\`\`\`json\n${JSON.stringify(scorecard, null, 2)}\n\`\`\`\n`;
      }

      return {
        messages: [
          textMsg("user", [
            "Assess factor pipeline health. Here is the live data:\n",
            "## Active Factors",
            "```json",
            JSON.stringify(factors, null, 2),
            "```\n",
            scorecardSection,
            "## Prediction Results",
            "```json",
            JSON.stringify(predictions, null, 2),
            "```\n",
            "## Correlation Matrix",
            "```json",
            JSON.stringify(correlation, null, 2),
            "```\n",
            "Please analyze:",
            "1. Factor accuracy — which factors are performing well/poorly?",
            "2. Prediction calibration — are predictions well-calibrated?",
            "3. Correlation risks — are any factor pairs too correlated (>0.7)?",
            "4. Recommendations for factor weight adjustments",
          ].join("\n")),
        ],
      };
    },
  );

  // ── 3. Position Review ────────────────────────────────────────────

  server.registerPrompt(
    "position-review",
    {
      description: "Review portfolio: open positions, equity curve, execution history, and risk exposure",
    },
    async () => {
      const [positions, summary, equity, history] = await Promise.all([
        reg.lab.getPositions(),
        reg.lab.getPositionsSummary(),
        reg.lab.getEquityCurve(),
        reg.lab.getExecutionHistory(),
      ]);

      return {
        messages: [
          textMsg("user", [
            "Review the current portfolio. Here is the live data:\n",
            "## Position Summary",
            "```json",
            JSON.stringify(summary, null, 2),
            "```\n",
            "## Open Positions",
            "```json",
            JSON.stringify(positions, null, 2),
            "```\n",
            "## Equity Curve",
            "```json",
            JSON.stringify(equity, null, 2),
            "```\n",
            "## Recent Execution History",
            "```json",
            JSON.stringify(history, null, 2),
            "```\n",
            "Please analyze:",
            "1. Portfolio health — total PnL, win rate, drawdown status",
            "2. Position concentration — any over-exposure to a single token?",
            "3. Execution quality — slippage, fill rates, timing",
            "4. Risk assessment — current drawdown relative to limits",
          ].join("\n")),
        ],
      };
    },
  );

  // ── 4. Filter Diagnosis ───────────────────────────────────────────

  server.registerPrompt(
    "filter-diagnosis",
    {
      description: "Deep diagnostic of H-infinity filter: state, convergence, predictions, and confidence",
    },
    async () => {
      const [filterState, confidence, predictions, convergence] = await Promise.all([
        reg.lab.getFilterState(),
        reg.lab.getConfidence(),
        reg.lab.getPredictionDiagnostics(),
        reg.lab.getConvergenceHistory(),
      ]);

      return {
        messages: [
          textMsg("user", [
            "Diagnose the signal filter pipeline. Here is the live data:\n",
            "## Filter State",
            "```json",
            JSON.stringify(filterState, null, 2),
            "```\n",
            "## Confidence Breakdown",
            "```json",
            JSON.stringify(confidence, null, 2),
            "```\n",
            "## Prediction Diagnostics",
            "```json",
            JSON.stringify(predictions, null, 2),
            "```\n",
            "## Convergence History",
            "```json",
            JSON.stringify(convergence, null, 2),
            "```\n",
            "Please analyze:",
            "1. Filter convergence — is the H-infinity filter converged? Innovation sequence healthy?",
            "2. Covariance trace — is it stable, growing, or shrinking?",
            "3. Prediction engine — expert weights distribution, accuracy per horizon",
            "4. Confidence decomposition — which components are strong/weak?",
            "5. Any anomalies requiring attention?",
          ].join("\n")),
        ],
      };
    },
  );

  // ── 5. Confidence Audit ───────────────────────────────────────────

  server.registerPrompt(
    "confidence-audit",
    {
      description: "Audit signal confidence: confidence breakdown, filter health, microstructure quality",
    },
    async () => {
      const [confidence, filterState, microstructure] = await Promise.all([
        reg.lab.getConfidence(),
        reg.lab.getFilterState(),
        reg.lab.getMicrostructureState(),
      ]);

      return {
        messages: [
          textMsg("user", [
            "Audit the signal confidence pipeline. Here is the live data:\n",
            "## Confidence Breakdown",
            "```json",
            JSON.stringify(confidence, null, 2),
            "```\n",
            "## Filter State",
            "```json",
            JSON.stringify(filterState, null, 2),
            "```\n",
            "## Microstructure State",
            "```json",
            JSON.stringify(microstructure, null, 2),
            "```\n",
            "Please analyze:",
            "1. Confidence score reliability — are component scores well-calibrated?",
            "2. Filter health contribution — how much does filter state affect confidence?",
            "3. Microstructure quality — spread, depth, toxicity impact on confidence",
            "4. Should the current confidence level be trusted for trade execution?",
          ].join("\n")),
        ],
      };
    },
  );

  // ── 6. System Health ──────────────────────────────────────────────

  server.registerPrompt(
    "system-health",
    {
      description: "Full system health check: service status, metrics, mode, execution config",
    },
    async () => {
      const [health, mode, metrics, execConfig] = await Promise.all([
        reg.lab.getHealth(),
        reg.lab.getMode(),
        reg.lab.getMetrics(),
        reg.lab.getExecutionConfig(),
      ]);

      return {
        messages: [
          textMsg("user", [
            "Perform a full system health check. Here is the live data:\n",
            "## Health Status",
            "```json",
            JSON.stringify(health, null, 2),
            "```\n",
            "## Operating Mode",
            "```json",
            JSON.stringify(mode, null, 2),
            "```\n",
            "## Performance Metrics",
            "```json",
            JSON.stringify(metrics, null, 2),
            "```\n",
            "## Execution Config",
            "```json",
            JSON.stringify(execConfig, null, 2),
            "```\n",
            "Please analyze:",
            "1. Service health — are all services operational?",
            "2. Mode check — is the system in the expected mode (paper/live)?",
            "3. Performance metrics — win rate, PnL, Sharpe, drawdown trending",
            "4. Execution config — are parameters reasonable for current conditions?",
            "5. Any warnings or configuration issues?",
          ].join("\n")),
        ],
      };
    },
  );

  // ── 7. Strategy Review ────────────────────────────────────────────

  server.registerPrompt(
    "strategy-review",
    {
      description: "Review active strategy: composition, factor weights, predictions, correlation risks",
    },
    async () => {
      const [strategy, factors, predictions, correlation] = await Promise.all([
        reg.lab.getStrategy(),
        reg.lab.getFactors(),
        reg.lab.getPredictionResults(),
        reg.lab.getCorrelation(),
      ]);

      return {
        messages: [
          textMsg("user", [
            "Review the active trading strategy. Here is the live data:\n",
            "## Strategy Configuration",
            "```json",
            JSON.stringify(strategy, null, 2),
            "```\n",
            "## Active Factors",
            "```json",
            JSON.stringify(factors, null, 2),
            "```\n",
            "## Prediction Results",
            "```json",
            JSON.stringify(predictions, null, 2),
            "```\n",
            "## Factor Correlations",
            "```json",
            JSON.stringify(correlation, null, 2),
            "```\n",
            "Please analyze:",
            "1. Strategy composition — are roles (primary, confirmation, filter) well-balanced?",
            "2. Factor weights — do weights reflect actual performance?",
            "3. Prediction alignment — do predictions support the strategy thesis?",
            "4. Correlation risk — any redundant factors that should be removed?",
            "5. Suggested improvements to factor allocation or composition",
          ].join("\n")),
        ],
      };
    },
  );
}

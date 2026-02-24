import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

async function labFetch(
  labUrl: string,
  path: string,
  method = "GET",
): Promise<string> {
  const res = await fetch(`${labUrl}${path}`, { method });
  if (!res.ok) {
    const body = await res.text().catch((e) => {
      console.error("Failed to read error body:", e);
      return "";
    });
    return JSON.stringify({ error: `${res.status} ${res.statusText}`, body });
  }
  return JSON.stringify(await res.json(), null, 2);
}

async function labFetchWithBody(
  labUrl: string,
  path: string,
  method: string,
  body: unknown,
): Promise<string> {
  const res = await fetch(`${labUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch((e) => {
      console.error("Failed to read error body:", e);
      return "";
    });
    return JSON.stringify({
      error: `${res.status} ${res.statusText}`,
      body: text,
    });
  }
  return JSON.stringify(await res.json(), null, 2);
}

async function pricingFetch(pricingUrl: string, path: string): Promise<string> {
  const res = await fetch(`${pricingUrl}${path}`);
  if (!res.ok) {
    const body = await res.text().catch((e) => {
      console.error("Failed to read error body:", e);
      return "";
    });
    return JSON.stringify({ error: `${res.status} ${res.statusText}`, body });
  }
  return JSON.stringify(await res.json(), null, 2);
}

export function registerLabTools(
  server: McpServer,
  labUrl: string,
  pricingUrl: string,
) {
  // ── Health / Mode ──────────────────────────────────────────────

  server.tool(
    "lab_health",
    "Check if the lab service is running",
    {},
    async () => ({
      content: [{ type: "text", text: await labFetch(labUrl, "/health") }],
    }),
  );

  server.tool(
    "lab_mode",
    "Get the lab's current operating mode",
    {},
    async () => ({
      content: [{ type: "text", text: await labFetch(labUrl, "/api/mode") }],
    }),
  );

  // ── Signals ────────────────────────────────────────────────────

  server.tool(
    "lab_signals",
    "List all active factor signals with direction, confidence, and token",
    {},
    async () => ({
      content: [{ type: "text", text: await labFetch(labUrl, "/api/signals") }],
    }),
  );

  server.tool(
    "lab_pending_signals",
    "List signals awaiting manual approval before execution",
    {},
    async () => ({
      content: [
        { type: "text", text: await labFetch(labUrl, "/api/signals/pending") },
      ],
    }),
  );

  server.tool(
    "lab_approve_signal",
    "Approve a pending signal for paper execution",
    {
      signal_id: z.string().describe("The ID of the pending signal to approve"),
    },
    async ({ signal_id }) => ({
      content: [
        {
          type: "text",
          text: await labFetch(
            labUrl,
            `/api/signals/${signal_id}/approve`,
            "POST",
          ),
        },
      ],
    }),
  );

  // ── Positions ──────────────────────────────────────────────────

  server.tool(
    "lab_positions",
    "List all positions (open and closed) with entry price, PnL, and status",
    {},
    async () => ({
      content: [
        { type: "text", text: await labFetch(labUrl, "/api/positions") },
      ],
    }),
  );

  server.tool(
    "lab_positions_summary",
    "Get a summary of open position count and total PnL in SOL",
    {},
    async () => ({
      content: [
        {
          type: "text",
          text: await labFetch(labUrl, "/api/positions/summary"),
        },
      ],
    }),
  );

  // ── Metrics ────────────────────────────────────────────────────

  server.tool(
    "lab_metrics",
    "Get system metrics: signal count, pending count, position count, event count, trace count",
    {},
    async () => ({
      content: [{ type: "text", text: await labFetch(labUrl, "/api/metrics") }],
    }),
  );

  // ── Factors ────────────────────────────────────────────────────

  server.tool(
    "lab_factors",
    "List all configured factors with enabled status, role, weight, and attribution scorecard",
    {},
    async () => ({
      content: [{ type: "text", text: await labFetch(labUrl, "/api/factors") }],
    }),
  );

  server.tool(
    "lab_factor_scorecard",
    "Get the attribution scorecard for a specific factor (win rate, PnL, signal count)",
    {
      factor_name: z
        .string()
        .describe("Factor name (e.g. 'swap-momentum', 'price-trend')"),
    },
    async ({ factor_name }) => ({
      content: [
        {
          type: "text",
          text: await labFetch(labUrl, `/api/factors/${factor_name}/scorecard`),
        },
      ],
    }),
  );

  server.tool(
    "lab_factor_accuracy",
    "Get detailed prediction accuracy for a specific factor (MAE, RMSE, directional accuracy, calibration)",
    {
      factor_name: z
        .string()
        .describe("Factor name (e.g. 'swap-momentum', 'price-trend')"),
    },
    async ({ factor_name }) => ({
      content: [
        {
          type: "text",
          text: await labFetch(labUrl, `/api/factors/${factor_name}/accuracy`),
        },
      ],
    }),
  );

  // ── Predictions ──────────────────────────────────────────────

  server.tool(
    "lab_predictions",
    "List pending predictions awaiting validation (predictions not yet resolved against actual prices)",
    {},
    async () => ({
      content: [
        { type: "text", text: await labFetch(labUrl, "/api/predictions") },
      ],
    }),
  );

  server.tool(
    "lab_prediction_results",
    "Get per-factor prediction accuracy results (MAE, RMSE, directional accuracy) for all factors with predictions",
    {},
    async () => ({
      content: [
        {
          type: "text",
          text: await labFetch(labUrl, "/api/predictions/results"),
        },
      ],
    }),
  );

  // ── Expert Weights ───────────────────────────────────────────

  server.tool(
    "lab_expert_weights",
    "Get the expert aggregator's learned weights for each factor — shows which factors the system trusts most",
    {},
    async () => ({
      content: [
        { type: "text", text: await labFetch(labUrl, "/api/experts/weights") },
      ],
    }),
  );

  // ── Correlation ────────────────────────────────────────────────

  server.tool(
    "lab_correlation",
    "Get pairwise factor correlation matrices for all tracked tokens. Warns when correlation exceeds threshold.",
    {},
    async () => ({
      content: [
        { type: "text", text: await labFetch(labUrl, "/api/correlation") },
      ],
    }),
  );

  // ── Decision Traces ────────────────────────────────────────────

  server.tool(
    "lab_traces",
    "Get the 50 most recent decision traces showing factor signals, composition, risk verdict, and execution outcome",
    {},
    async () => ({
      content: [{ type: "text", text: await labFetch(labUrl, "/api/traces") }],
    }),
  );

  // ── Strategy ───────────────────────────────────────────────────

  server.tool(
    "lab_strategy",
    "Get the currently loaded strategy configuration (factors, roles, thresholds)",
    {},
    async () => ({
      content: [
        { type: "text", text: await labFetch(labUrl, "/api/strategy") },
      ],
    }),
  );

  server.tool(
    "lab_strategy_reload",
    "Hot-reload the strategy TOML from disk. Use after editing strategy files.",
    {},
    async () => ({
      content: [
        {
          type: "text",
          text: await labFetch(labUrl, "/api/strategy/reload", "POST"),
        },
      ],
    }),
  );

  // ── Events ─────────────────────────────────────────────────────

  server.tool(
    "lab_events",
    "Get the 100 most recent events (signals, compositions, risk decisions, trade executions, reloads)",
    {},
    async () => ({
      content: [{ type: "text", text: await labFetch(labUrl, "/api/events") }],
    }),
  );

  // ── Wallets ────────────────────────────────────────────────────

  server.tool(
    "lab_tracked_wallets",
    "List all wallets being monitored for swap activity",
    {},
    async () => ({
      content: [
        { type: "text", text: await labFetch(labUrl, "/api/tracked-wallets") },
      ],
    }),
  );

  // ── Backtesting ───────────────────────────────────────────────

  server.tool(
    "lab_backtest",
    "Run a backtest through the full factor pipeline. Provide a scenario name (crash/ramp/sideways) or a file_path to a JSONL replay file. Returns trade summary, per-factor scorecards, positions, and expert weights.",
    {
      scenario: z
        .string()
        .optional()
        .describe("Scenario name: 'crash', 'ramp', or 'sideways'"),
      file_path: z
        .string()
        .optional()
        .describe(
          "Absolute path to a JSONL replay file (must be within /tmp/lab-replay/)",
        ),
      token_mint: z
        .string()
        .optional()
        .describe("Token mint address (default: synthetic)"),
      steps: z
        .number()
        .optional()
        .describe("Number of steps for scenario generation (default: 120)"),
    },
    async ({ scenario, file_path, token_mint, steps }) => {
      const body: Record<string, unknown> = {};
      if (scenario) body.scenario = scenario;
      if (file_path) body.file_path = file_path;
      if (token_mint) body.token_mint = token_mint;
      if (steps) body.steps = steps;
      return {
        content: [
          {
            type: "text",
            text: await labFetchWithBody(labUrl, "/api/backtest", "POST", body),
          },
        ],
      };
    },
  );

  server.tool(
    "lab_backtest_scenarios",
    "List available backtest scenarios with their default parameters and descriptions",
    {},
    async () => ({
      content: [
        {
          type: "text",
          text: await labFetch(labUrl, "/api/backtest/scenarios"),
        },
      ],
    }),
  );

  // ── Candles (Pricing Service) ─────────────────────────────────

  server.tool(
    "lab_candles",
    "Get OHLCV candle data for a token from the pricing service",
    {
      symbol: z.string().describe("Token symbol (e.g. 'SOL', 'BONK')"),
      timeframe: z
        .string()
        .optional()
        .describe("Candle timeframe (e.g. '1m', '5m', '1h'). Default: '1m'"),
    },
    async ({ symbol, timeframe }) => {
      const tf = timeframe ?? "1m";
      return {
        content: [
          {
            type: "text",
            text: await pricingFetch(
              pricingUrl,
              `/api/market/candles/${encodeURIComponent(symbol)}?timeframe=${encodeURIComponent(tf)}`,
            ),
          },
        ],
      };
    },
  );
}

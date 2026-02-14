import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const LAB_URL = process.env.LAB_URL ?? "http://localhost:4000";

async function labFetch(path: string, method = "GET"): Promise<string> {
  const res = await fetch(`${LAB_URL}${path}`, { method });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return JSON.stringify({ error: `${res.status} ${res.statusText}`, body });
  }
  return JSON.stringify(await res.json(), null, 2);
}

const server = new McpServer({
  name: "lab-mcp",
  version: "0.1.0",
});

// ── Health / Mode ──────────────────────────────────────────────

server.tool(
  "lab_health",
  "Check if the lab service is running",
  {},
  async () => ({
    content: [{ type: "text", text: await labFetch("/health") }],
  }),
);

server.tool(
  "lab_mode",
  "Get the lab's current operating mode",
  {},
  async () => ({
    content: [{ type: "text", text: await labFetch("/api/mode") }],
  }),
);

// ── Signals ────────────────────────────────────────────────────

server.tool(
  "lab_signals",
  "List all active factor signals with direction, confidence, and token",
  {},
  async () => ({
    content: [{ type: "text", text: await labFetch("/api/signals") }],
  }),
);

server.tool(
  "lab_pending_signals",
  "List signals awaiting manual approval before execution",
  {},
  async () => ({
    content: [{ type: "text", text: await labFetch("/api/signals/pending") }],
  }),
);

server.tool(
  "lab_approve_signal",
  "Approve a pending signal for paper execution",
  { signal_id: z.string().describe("The ID of the pending signal to approve") },
  async ({ signal_id }) => ({
    content: [
      {
        type: "text",
        text: await labFetch(`/api/signals/${signal_id}/approve`, "POST"),
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
    content: [{ type: "text", text: await labFetch("/api/positions") }],
  }),
);

server.tool(
  "lab_positions_summary",
  "Get a summary of open position count and total PnL in SOL",
  {},
  async () => ({
    content: [{ type: "text", text: await labFetch("/api/positions/summary") }],
  }),
);

// ── Metrics ────────────────────────────────────────────────────

server.tool(
  "lab_metrics",
  "Get system metrics: signal count, pending count, position count, event count, trace count",
  {},
  async () => ({
    content: [{ type: "text", text: await labFetch("/api/metrics") }],
  }),
);

// ── Factors ────────────────────────────────────────────────────

server.tool(
  "lab_factors",
  "List all configured factors with enabled status, role, weight, and attribution scorecard",
  {},
  async () => ({
    content: [{ type: "text", text: await labFetch("/api/factors") }],
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
        text: await labFetch(`/api/factors/${factor_name}/scorecard`),
      },
    ],
  }),
);

// ── Correlation ────────────────────────────────────────────────

server.tool(
  "lab_correlation",
  "Get pairwise factor correlation matrices for all tracked tokens. Warns when correlation exceeds threshold.",
  {},
  async () => ({
    content: [{ type: "text", text: await labFetch("/api/correlation") }],
  }),
);

// ── Decision Traces ────────────────────────────────────────────

server.tool(
  "lab_traces",
  "Get the 50 most recent decision traces showing factor signals, composition, risk verdict, and execution outcome",
  {},
  async () => ({
    content: [{ type: "text", text: await labFetch("/api/traces") }],
  }),
);

// ── Strategy ───────────────────────────────────────────────────

server.tool(
  "lab_strategy",
  "Get the currently loaded strategy configuration (factors, roles, thresholds)",
  {},
  async () => ({
    content: [{ type: "text", text: await labFetch("/api/strategy") }],
  }),
);

server.tool(
  "lab_strategy_reload",
  "Hot-reload the strategy TOML from disk. Use after editing strategy files.",
  {},
  async () => ({
    content: [
      { type: "text", text: await labFetch("/api/strategy/reload", "POST") },
    ],
  }),
);

// ── Events ─────────────────────────────────────────────────────

server.tool(
  "lab_events",
  "Get the 100 most recent events (signals, compositions, risk decisions, trade executions, reloads)",
  {},
  async () => ({
    content: [{ type: "text", text: await labFetch("/api/events") }],
  }),
);

// ── Wallets ────────────────────────────────────────────────────

server.tool(
  "lab_tracked_wallets",
  "List all wallets being monitored for swap activity",
  {},
  async () => ({
    content: [{ type: "text", text: await labFetch("/api/tracked-wallets") }],
  }),
);

// ── Start ──────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

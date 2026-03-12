import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ServiceRegistry } from "../clients/registry.js";
import { McpServiceError } from "../types/errors.js";
import type { ParameterSweepResult } from "../types/lab.js";

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

  server.registerTool(
    "run_parameter_sweep",
    {
      description:
        "Run multiple backtests across a range of parameter values to build a sensitivity profile. " +
        "Executes backtests sequentially to avoid overloading Lab. Returns a results table with " +
        "total_pnl, win_rate, max_drawdown, and total_trades for each parameter value. " +
        "Note: Parameter overrides in the backtest endpoint are pending — currently runs the base " +
        "scenario for each value and returns baseline metrics with the sweep structure for future use.",
      inputSchema: {
        scenario: z.string().describe("Backtest scenario: 'crash', 'ramp', or 'sideways'"),
        parameter: z.string().describe("Parameter name to sweep (e.g., 'confidence_threshold', 'stop_loss_pct')"),
        values: z.array(z.number()).describe("Array of parameter values to test (e.g., [0.3, 0.4, 0.5, 0.6, 0.7])"),
      },
    },
    async ({ scenario, parameter, values }) => {
      try {
        if (values.length === 0) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: "No values provided for sweep. Provide at least one value in the 'values' array.",
              }, null, 2),
            }],
          };
        }

        if (values.length > 20) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: "Too many values. Maximum 20 values per sweep to avoid overloading Lab.",
              }, null, 2),
            }],
          };
        }

        const results: ParameterSweepResult[] = [];
        const errors: { value: number; error: string }[] = [];

        // Run backtests sequentially to avoid overloading Lab
        for (const value of values) {
          try {
            // TODO: When Lab supports parameter overrides in the backtest endpoint,
            // pass { scenario, overrides: { [parameter]: value } } here.
            // For now, we run the base scenario and record the metrics.
            const backtestResult = await reg.lab.runBacktest({ scenario });

            results.push({
              value,
              total_pnl: backtestResult.total_pnl,
              win_rate: backtestResult.win_rate,
              max_drawdown: backtestResult.max_drawdown,
              total_trades: backtestResult.total_trades,
            });
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            errors.push({ value, error: message });
          }
        }

        const response = {
          parameter,
          scenario,
          results,
          errors: errors.length > 0 ? errors : undefined,
          note: "Parameter overrides are not yet supported in Lab's backtest endpoint. " +
            "All runs used the base scenario configuration. Results show the baseline metrics " +
            "repeated for each value — this structure will contain real per-value results once " +
            "Lab supports parameter override in POST /api/backtest. " +
            "To get meaningful sensitivity data now, modify strategy.toml and call run_backtest " +
            "after each change via POST /api/strategy/reload.",
        };

        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );
}

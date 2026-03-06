import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { tierGatedTool } from "../auth/tierGate.js";

async function btFetch(
  labUrl: string,
  path: string,
  method = "GET",
): Promise<string> {
  try {
    const res = await fetch(`${labUrl}${path}`, { method });
    if (!res.ok) {
      const body = await res.text().catch((e) => {
        console.error("Failed to read error body:", e);
        return "";
      });
      return JSON.stringify({ error: `${res.status} ${res.statusText}`, body });
    }
    return JSON.stringify(await res.json(), null, 2);
  } catch (err) {
    return JSON.stringify({
      error: "service_unavailable",
      message: String(err),
    });
  }
}

async function btFetchWithBody(
  labUrl: string,
  path: string,
  method: string,
  body: unknown,
): Promise<string> {
  try {
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
  } catch (err) {
    return JSON.stringify({
      error: "service_unavailable",
      message: String(err),
    });
  }
}

export function registerBacktestJobTools(server: McpServer, labUrl: string) {
  server.tool(
    "lab_backtest_submit",
    "Submit a backtest job for async execution. Returns a job ID for tracking.",
    {
      scenario: z
        .string()
        .optional()
        .describe("Scenario name: 'crash', 'ramp', or 'sideways'"),
      file_path: z
        .string()
        .optional()
        .describe("Absolute path to a JSONL replay file"),
      token_mint: z
        .string()
        .optional()
        .describe("Token mint address (default: synthetic)"),
      steps: z
        .number()
        .optional()
        .describe("Number of steps for scenario generation (default: 120)"),
    },
    tierGatedTool(
      "level2",
      async ({ scenario, file_path, token_mint, steps }) => {
        const body: Record<string, unknown> = {};
        if (scenario !== undefined) body.scenario = scenario;
        if (file_path !== undefined) body.file_path = file_path;
        if (token_mint !== undefined) body.token_mint = token_mint;
        if (steps !== undefined) body.steps = steps;
        return {
          content: [
            {
              type: "text",
              text: await btFetchWithBody(
                labUrl,
                "/api/backtest/submit",
                "POST",
                body,
              ),
            },
          ],
        };
      },
    ),
  );

  server.tool(
    "lab_backtest_jobs",
    "List all backtest jobs with status, progress, and summary",
    {},
    tierGatedTool("level1", async () => ({
      content: [
        {
          type: "text",
          text: await btFetch(labUrl, "/api/backtest/jobs"),
        },
      ],
    })),
  );

  server.tool(
    "lab_backtest_job",
    "Get details for a specific backtest job by ID",
    {
      job_id: z.string().describe("The backtest job ID to look up"),
    },
    tierGatedTool("level1", async ({ job_id }) => ({
      content: [
        {
          type: "text",
          text: await btFetch(
            labUrl,
            `/api/backtest/jobs/${encodeURIComponent(job_id as string)}`,
          ),
        },
      ],
    })),
  );

  server.tool(
    "lab_backtest_cancel",
    "Cancel a running backtest job",
    {
      job_id: z.string().describe("The backtest job ID to cancel"),
    },
    tierGatedTool("level2", async ({ job_id }) => ({
      content: [
        {
          type: "text",
          text: await btFetch(
            labUrl,
            `/api/backtest/jobs/${encodeURIComponent(job_id as string)}`,
            "DELETE",
          ),
        },
      ],
    })),
  );

  server.tool(
    "lab_backtest_monte_carlo",
    "Run Monte Carlo backtest simulation with multiple random paths",
    {
      scenario: z
        .string()
        .optional()
        .describe("Scenario name: 'crash', 'ramp', or 'sideways'"),
      steps: z.number().optional().describe("Number of steps per path"),
      num_paths: z
        .number()
        .optional()
        .describe("Number of Monte Carlo paths to simulate"),
    },
    tierGatedTool("level2", async ({ scenario, steps, num_paths }) => {
      const body: Record<string, unknown> = {};
      if (scenario !== undefined) body.scenario = scenario;
      if (steps !== undefined) body.steps = steps;
      if (num_paths !== undefined) body.num_paths = num_paths;
      return {
        content: [
          {
            type: "text",
            text: await btFetchWithBody(
              labUrl,
              "/api/backtest/monte-carlo",
              "POST",
              body,
            ),
          },
        ],
      };
    }),
  );

  server.tool(
    "lab_backtest_optimize",
    "Run parameter optimization backtest to find optimal factor weights",
    {
      scenario: z
        .string()
        .optional()
        .describe("Scenario name: 'crash', 'ramp', or 'sideways'"),
      steps: z.number().optional().describe("Number of steps per trial"),
      params: z
        .record(z.unknown())
        .optional()
        .describe("Parameter ranges to optimize"),
    },
    tierGatedTool("level2", async ({ scenario, steps, params }) => {
      const body: Record<string, unknown> = {};
      if (scenario !== undefined) body.scenario = scenario;
      if (steps !== undefined) body.steps = steps;
      if (params !== undefined) body.params = params;
      return {
        content: [
          {
            type: "text",
            text: await btFetchWithBody(
              labUrl,
              "/api/backtest/optimize",
              "POST",
              body,
            ),
          },
        ],
      };
    }),
  );

  server.tool(
    "lab_backtest_walk_forward",
    "Run walk-forward backtest with rolling in-sample/out-of-sample windows",
    {
      scenario: z
        .string()
        .optional()
        .describe("Scenario name: 'crash', 'ramp', or 'sideways'"),
      steps: z.number().optional().describe("Total number of steps"),
      window_size: z.number().optional().describe("Size of the rolling window"),
    },
    tierGatedTool("level2", async ({ scenario, steps, window_size }) => {
      const body: Record<string, unknown> = {};
      if (scenario !== undefined) body.scenario = scenario;
      if (steps !== undefined) body.steps = steps;
      if (window_size !== undefined) body.window_size = window_size;
      return {
        content: [
          {
            type: "text",
            text: await btFetchWithBody(
              labUrl,
              "/api/backtest/walk-forward",
              "POST",
              body,
            ),
          },
        ],
      };
    }),
  );
}

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { tierGatedTool } from "../auth/tierGate.js";

async function rebalanceFetch(
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

async function rebalanceFetchWithBody(
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

export function registerRebalanceTools(server: McpServer, labUrl: string) {
  server.tool(
    "lab_rebalance_drift",
    "Get current portfolio drift from target allocations",
    {},
    tierGatedTool("level1", async () => ({
      content: [
        {
          type: "text",
          text: await rebalanceFetch(labUrl, "/api/rebalance/drift"),
        },
      ],
    })),
  );

  server.tool(
    "lab_rebalance_plan",
    "Generate a rebalance plan to bring portfolio back to target allocations",
    {
      dry_run: z
        .boolean()
        .optional()
        .describe("If true, return the plan without executing trades"),
    },
    tierGatedTool("level2", async ({ dry_run }) => {
      const body: Record<string, unknown> = {};
      if (dry_run !== undefined) body.dry_run = dry_run;
      return {
        content: [
          {
            type: "text",
            text: await rebalanceFetchWithBody(
              labUrl,
              "/api/rebalance/plan",
              "POST",
              body,
            ),
          },
        ],
      };
    }),
  );

  server.tool(
    "lab_rebalance_targets",
    "Get current rebalance target allocations",
    {},
    tierGatedTool("level1", async () => ({
      content: [
        {
          type: "text",
          text: await rebalanceFetch(labUrl, "/api/rebalance/targets"),
        },
      ],
    })),
  );
}

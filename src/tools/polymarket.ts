import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { tierGatedTool } from "../auth/tierGate.js";

async function polyFetch(
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

async function polyFetchWithBody(
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

export function registerPolymarketTools(server: McpServer, labUrl: string) {
  // ── Markets ──────────────────────────────────────────────────

  server.tool(
    "poly_markets",
    "List active Polymarket prediction markets with outcome prices and liquidity",
    {},
    tierGatedTool("free", async () => ({
      content: [
        {
          type: "text",
          text: await polyFetch(labUrl, "/api/polymarket/markets"),
        },
      ],
    })),
  );

  server.tool(
    "poly_market_detail",
    "Get details for a specific Polymarket market by condition ID",
    {
      condition_id: z.string().describe("The market condition ID to look up"),
    },
    tierGatedTool("level1", async ({ condition_id }) => ({
      content: [
        {
          type: "text",
          text: await polyFetch(
            labUrl,
            `/api/polymarket/markets/${encodeURIComponent(condition_id as string)}`,
          ),
        },
      ],
    })),
  );

  // ── Arbitrage ────────────────────────────────────────────────

  server.tool(
    "poly_arbitrage",
    "List detected Polymarket arbitrage opportunities with direction and confidence",
    {},
    tierGatedTool("level1", async () => ({
      content: [
        {
          type: "text",
          text: await polyFetch(labUrl, "/api/polymarket/arbitrage"),
        },
      ],
    })),
  );

  // ── Copula ───────────────────────────────────────────────────

  server.tool(
    "poly_copula",
    "Get copula correlation analysis for Polymarket market pairs",
    {},
    tierGatedTool("level1", async () => ({
      content: [
        {
          type: "text",
          text: await polyFetch(labUrl, "/api/polymarket/copula"),
        },
      ],
    })),
  );

  // ── Positions ────────────────────────────────────────────────

  server.tool(
    "poly_positions",
    "List all Polymarket positions (open and closed) with entry price and PnL",
    {},
    tierGatedTool("level1", async () => ({
      content: [
        {
          type: "text",
          text: await polyFetch(labUrl, "/api/polymarket/positions"),
        },
      ],
    })),
  );

  // ── Monte Carlo Simulation ──────────────────────────────────

  server.tool(
    "poly_simulate",
    "Run Monte Carlo simulation for a Polymarket market. Returns mean, std_dev, confidence interval, and path count.",
    {
      market_id: z.string().describe("The market condition ID to simulate"),
      probability: z
        .number()
        .describe("Current probability estimate (0.0 to 1.0)"),
      num_paths: z
        .number()
        .optional()
        .describe("Number of Monte Carlo paths to simulate (default: 10000)"),
    },
    tierGatedTool("level2", async ({ market_id, probability, num_paths }) => {
      const body: Record<string, unknown> = {
        market_id,
        probability,
      };
      if (num_paths) body.num_paths = num_paths;
      return {
        content: [
          {
            type: "text",
            text: await polyFetchWithBody(
              labUrl,
              "/api/polymarket/simulate",
              "POST",
              body,
            ),
          },
        ],
      };
    }),
  );

  // ── Quotes ───────────────────────────────────────────────────

  server.tool(
    "poly_quotes",
    "Get the latest market-making quote for a Polymarket market",
    {
      market_id: z
        .string()
        .describe("The market condition ID to get quotes for"),
    },
    tierGatedTool("level1", async ({ market_id }) => ({
      content: [
        {
          type: "text",
          text: await polyFetch(
            labUrl,
            `/api/polymarket/quotes/${encodeURIComponent(market_id as string)}`,
          ),
        },
      ],
    })),
  );
}

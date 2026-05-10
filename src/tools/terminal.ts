import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { tierGatedTool } from "../auth/tierGate.js";

async function terminalFetch(
  terminalUrl: string,
  path: string,
  method = "GET",
): Promise<string> {
  try {
    const res = await fetch(`${terminalUrl}${path}`, { method });
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

async function terminalFetchWithBody(
  terminalUrl: string,
  path: string,
  method: string,
  body: unknown,
): Promise<string> {
  try {
    const res = await fetch(`${terminalUrl}${path}`, {
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

export function registerTerminalTools(server: McpServer, terminalUrl: string) {
  // ── Markets ──────────────────────────────────────────────────

  server.tool(
    "terminal_markets",
    "List all available exchanges and their symbols on the trading terminal",
    {},
    tierGatedTool("tier-1", async () => ({
      content: [
        {
          type: "text",
          text: await terminalFetch(terminalUrl, "/api/v1/markets"),
        },
      ],
    })),
  );

  // ── Candles ──────────────────────────────────────────────────

  server.tool(
    "terminal_candles",
    "Get historical OHLCV candle data for a symbol",
    {
      exchange: z.string().describe("Exchange name (e.g. 'binance', 'bybit')"),
      symbol: z.string().describe("Trading pair symbol (e.g. 'BTC/USDT')"),
      timeframe: z
        .string()
        .default("1m")
        .describe("Candle timeframe (e.g. '1m', '5m', '1h', '1d')"),
      limit: z
        .number()
        .default(100)
        .describe("Number of candles to return (default 100)"),
    },
    tierGatedTool("tier-1", async ({ exchange, symbol, timeframe, limit }) => {
      const params = new URLSearchParams({
        exchange: exchange as string,
        symbol: symbol as string,
        timeframe: (timeframe as string) ?? "1m",
        limit: String((limit as number) ?? 100),
      });
      return {
        content: [
          {
            type: "text",
            text: await terminalFetch(terminalUrl, `/api/v1/candles?${params}`),
          },
        ],
      };
    }),
  );

  // ── Orderbook ────────────────────────────────────────────────

  server.tool(
    "terminal_orderbook",
    "Get current orderbook (bids and asks) for a symbol",
    {
      exchange: z.string().describe("Exchange name (e.g. 'binance', 'bybit')"),
      symbol: z.string().describe("Trading pair symbol (e.g. 'BTC/USDT')"),
      depth: z
        .number()
        .default(20)
        .describe("Number of price levels per side (default 20)"),
    },
    tierGatedTool("tier-1", async ({ exchange, symbol, depth }) => {
      const params = new URLSearchParams({
        exchange: exchange as string,
        symbol: symbol as string,
        depth: String((depth as number) ?? 20),
      });
      return {
        content: [
          {
            type: "text",
            text: await terminalFetch(
              terminalUrl,
              `/api/v1/orderbook?${params}`,
            ),
          },
        ],
      };
    }),
  );

  // ── Signals ──────────────────────────────────────────────────

  server.tool(
    "terminal_signals",
    "Get recent alpha signals from the factor pipeline",
    {
      limit: z
        .number()
        .default(50)
        .describe("Maximum number of signals to return (default 50)"),
    },
    tierGatedTool("tier-2", async ({ limit }) => {
      const params = new URLSearchParams({
        limit: String((limit as number) ?? 50),
      });
      return {
        content: [
          {
            type: "text",
            text: await terminalFetch(terminalUrl, `/api/v1/signals?${params}`),
          },
        ],
      };
    }),
  );

  // ── Whales ───────────────────────────────────────────────────

  server.tool(
    "terminal_whales",
    "Get recent whale/large trade activity",
    {
      min_usd: z
        .number()
        .default(50000)
        .describe("Minimum trade size in USD (default 50000)"),
      limit: z
        .number()
        .default(50)
        .describe("Maximum number of events to return (default 50)"),
    },
    tierGatedTool("tier-2", async ({ min_usd, limit }) => {
      const params = new URLSearchParams({
        min_usd: String((min_usd as number) ?? 50000),
        limit: String((limit as number) ?? 50),
      });
      return {
        content: [
          {
            type: "text",
            text: await terminalFetch(terminalUrl, `/api/v1/whales?${params}`),
          },
        ],
      };
    }),
  );

  // ── Backtest ─────────────────────────────────────────────────

  server.tool(
    "terminal_backtest",
    "Run a strategy backtest on historical data",
    {
      exchange: z.string().describe("Exchange name (e.g. 'binance', 'bybit')"),
      symbol: z.string().describe("Trading pair symbol (e.g. 'BTC/USDT')"),
      timeframe: z
        .string()
        .describe("Candle timeframe (e.g. '1m', '5m', '1h')"),
      strategy: z
        .enum(["sma_crossover", "rsi", "bollinger"])
        .describe("Strategy type to backtest"),
      params: z
        .record(z.unknown())
        .optional()
        .describe("Strategy-specific parameters (e.g. { fast: 10, slow: 30 })"),
      from: z.number().optional().describe("Start timestamp in milliseconds"),
      to: z.number().optional().describe("End timestamp in milliseconds"),
    },
    tierGatedTool(
      "tier-3",
      async ({ exchange, symbol, timeframe, strategy, params, from, to }) => {
        const body: Record<string, unknown> = {
          exchange,
          symbol,
          timeframe,
          strategy,
        };
        if (params !== undefined) body.params = params;
        if (from !== undefined) body.from = from;
        if (to !== undefined) body.to = to;
        return {
          content: [
            {
              type: "text",
              text: await terminalFetchWithBody(
                terminalUrl,
                "/api/v1/backtest",
                "POST",
                body,
              ),
            },
          ],
        };
      },
    ),
  );

  // ── Polymarket ───────────────────────────────────────────────

  server.tool(
    "terminal_polymarket",
    "List active Polymarket prediction markets",
    {},
    tierGatedTool("tier-1", async () => ({
      content: [
        {
          type: "text",
          text: await terminalFetch(terminalUrl, "/api/v1/polymarket/markets"),
        },
      ],
    })),
  );

  // ── Performance ──────────────────────────────────────────────

  server.tool(
    "terminal_performance",
    "Get trading performance analytics from order history",
    {},
    tierGatedTool("tier-2", async () => ({
      content: [
        {
          type: "text",
          text: await terminalFetch(terminalUrl, "/api/v1/performance"),
        },
      ],
    })),
  );
}

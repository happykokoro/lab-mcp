import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ServiceRegistry } from "../clients/registry.js";
import { McpServiceError } from "../types/errors.js";

export function registerMarketTools(server: McpServer, reg: ServiceRegistry) {
  server.registerTool(
    "get_price_history",
    {
      description: "Get OHLCV price history for tracked tokens from the Lab's internal buffer",
    },
    async () => {
      try {
        const data = await reg.lab.getPriceHistory();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );

  server.registerTool(
    "get_equity_curve",
    {
      description: "Get equity curve: timestamped equity and drawdown series for the current session",
    },
    async () => {
      try {
        const data = await reg.lab.getEquityCurve();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );

  server.registerTool(
    "get_candles",
    {
      description: "Get OHLCV candle data for a token from the Pricing Service",
      inputSchema: {
        symbol: z.string().describe("Token symbol (e.g. 'SOL', 'BONK')"),
        timeframe: z.string().optional().describe("Candle timeframe: '1m', '5m', '1h'. Default: '1m'"),
      },
    },
    async ({ symbol, timeframe }) => {
      try {
        if (!reg.pricing) {
          return { isError: true, content: [{ type: "text" as const, text: "Pricing service not configured. Set PRICING_URL." }] };
        }
        const data = await reg.pricing.getCandles(symbol, timeframe ?? "1m");
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );
}

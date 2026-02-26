import { BaseClient } from "./base.js";

/** Typed client for Pricing Service (port 4002). */
export class PricingClient extends BaseClient {
  constructor(baseUrl = "http://localhost:4002") {
    super({ baseUrl, serviceName: "pricing" });
  }

  getCandles(symbol: string, timeframe = "1m"): Promise<unknown> {
    return this.get(
      `/api/market/candles/${encodeURIComponent(symbol)}?timeframe=${encodeURIComponent(timeframe)}`,
    );
  }
}

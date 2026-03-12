import { BaseClient } from "./base.js";

// ── Types ────────────────────────────────────────────────────────────

export interface CoinGeckoTokenInfo {
  id: string;
  symbol: string;
  name: string;
  market_data: {
    current_price: { usd: number };
    market_cap: { usd: number };
    fully_diluted_valuation: { usd: number } | null;
    total_volume: { usd: number };
    circulating_supply: number;
    total_supply: number | null;
    max_supply: number | null;
    price_change_percentage_24h: number;
    price_change_percentage_7d: number;
    price_change_percentage_30d: number;
  };
}

export interface CoinGeckoMarketData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  fully_diluted_valuation: number | null;
  total_volume: number;
  circulating_supply: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency: number | null;
  price_change_percentage_30d_in_currency: number | null;
}

interface PingResponse {
  gecko_says: string;
}

// ── Client ───────────────────────────────────────────────────────────

/** CoinGecko API v3 client for token fundamentals and market data. */
export class CoinGeckoClient extends BaseClient {
  constructor(apiKey?: string) {
    const baseUrl = apiKey
      ? "https://pro-api.coingecko.com/api/v3"
      : "https://api.coingecko.com/api/v3";
    super({
      baseUrl,
      serviceName: "coingecko",
      timeoutMs: 15_000,
      headers: apiKey ? { "x-cg-pro-api-key": apiKey } : {},
    });
  }

  /** Get simple price data for multiple tokens. */
  async getTokenPrice(
    ids: string[],
  ): Promise<Record<string, { usd: number; usd_24h_change: number }>> {
    const joined = ids.map(encodeURIComponent).join(",");
    return this.get(
      `/simple/price?ids=${joined}&vs_currencies=usd&include_24hr_change=true`,
    );
  }

  /** Get detailed token info including market data. */
  async getTokenInfo(id: string): Promise<CoinGeckoTokenInfo> {
    return this.get(
      `/coins/${encodeURIComponent(id)}?localization=false&tickers=false&community_data=false&developer_data=false`,
    );
  }

  /** Get market data for multiple tokens sorted by market cap. */
  async getMarketData(ids: string[]): Promise<CoinGeckoMarketData[]> {
    const joined = ids.map(encodeURIComponent).join(",");
    return this.get(
      `/coins/markets?vs_currency=usd&ids=${joined}&order=market_cap_desc`,
    );
  }

  /** Health check: ping endpoint. */
  override async health(): Promise<boolean> {
    try {
      const data = await this.get<PingResponse>("/ping");
      return typeof data.gecko_says === "string";
    } catch {
      return false;
    }
  }
}

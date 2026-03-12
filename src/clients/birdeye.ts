import { BaseClient } from "./base.js";

// ── Types ────────────────────────────────────────────────────────────

export interface BirdeyeTokenOverview {
  address: string;
  symbol: string;
  name: string;
  price: number;
  priceChange24hPercent: number;
  volume24hUSD: number;
  marketCap: number;
  liquidity: number;
  holder: number;
  trade24h: number;
  uniqueWallet24h: number;
}

export interface BirdeyeCandle {
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  unixTime: number;
}

export interface BirdeyeTraderStats {
  trade24h: number;
  trade24hChangePercent: number;
  buy24h: number;
  sell24h: number;
  uniqueWallet24h: number;
  uniqueWallet24hChangePercent: number;
}

interface BirdeyeApiResponse<T> {
  success: boolean;
  data: T;
}

// ── Client ───────────────────────────────────────────────────────────

/** SOL mint address used for health checks. */
const SOL_MINT = "So11111111111111111111111111111111111111112";

/** Birdeye Solana API client for on-chain token analytics. */
export class BirdeyeClient extends BaseClient {
  constructor(apiKey: string) {
    super({
      baseUrl: "https://public-api.birdeye.so",
      serviceName: "birdeye",
      timeoutMs: 15_000,
      headers: {
        "X-API-KEY": apiKey,
        "x-chain": "solana",
      },
    });
  }

  /** Get comprehensive token overview: price, volume, market cap, holders. */
  async getTokenOverview(address: string): Promise<BirdeyeTokenOverview> {
    const resp = await this.get<BirdeyeApiResponse<BirdeyeTokenOverview>>(
      `/defi/token_overview?address=${encodeURIComponent(address)}`,
    );
    return resp.data;
  }

  /** Get OHLCV candle data for a token. */
  async getOHLCV(
    address: string,
    type: string,
    timeFrom: number,
    timeTo: number,
  ): Promise<BirdeyeCandle[]> {
    const params = new URLSearchParams({
      address,
      type,
      time_from: String(timeFrom),
      time_to: String(timeTo),
    });
    const resp = await this.get<BirdeyeApiResponse<{ items: BirdeyeCandle[] }>>(
      `/defi/ohlcv?${params.toString()}`,
    );
    return resp.data.items ?? [];
  }

  /** Get trader statistics for a token: trade count, buy/sell, unique wallets. */
  async getTraderStats(address: string): Promise<BirdeyeTraderStats> {
    const resp = await this.get<BirdeyeApiResponse<BirdeyeTraderStats>>(
      `/defi/v3/token/trade-data/single?address=${encodeURIComponent(address)}`,
    );
    return resp.data;
  }

  /** Health check: try fetching SOL token overview. */
  override async health(): Promise<boolean> {
    try {
      await this.getTokenOverview(SOL_MINT);
      return true;
    } catch {
      return false;
    }
  }
}

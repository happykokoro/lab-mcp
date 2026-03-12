import { BaseClient } from "./base.js";

// ── Types ────────────────────────────────────────────────────────────

export interface DefiLlamaProtocol {
  id: string;
  name: string;
  symbol: string;
  tvl: { date: number; totalLiquidityUSD: number }[];
  currentChainTvls: Record<string, number>;
  mcap: number | null;
}

export interface DefiLlamaYield {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  apyBase: number | null;
  apyReward: number | null;
}

interface ChainTvlEntry {
  name: string;
  tvl: number;
}

// ── Client ───────────────────────────────────────────────────────────

/** DeFi Llama API client for protocol TVL, chain TVL, and yield data. */
export class DeFiLlamaClient extends BaseClient {
  constructor() {
    super({
      baseUrl: "https://api.llama.fi",
      serviceName: "defillama",
      timeoutMs: 15_000,
    });
  }

  /** Get protocol TVL details including chain breakdown and history. */
  async getProtocolTvl(slug: string): Promise<DefiLlamaProtocol> {
    return this.get(`/protocol/${encodeURIComponent(slug)}`);
  }

  /** Get historical TVL for a specific chain. */
  async getChainTvl(chain: string): Promise<{ date: number; tvl: number }[]> {
    return this.get(`/v2/historicalChainTvl/${encodeURIComponent(chain)}`);
  }

  /** Get current TVL for all chains, returned as chain name → TVL map. */
  async getCurrentTvl(): Promise<Record<string, number>> {
    const chains = await this.get<ChainTvlEntry[]>("/v2/chains");
    const result: Record<string, number> = {};
    for (const chain of chains) {
      result[chain.name] = chain.tvl;
    }
    return result;
  }

  /** Get DeFi yield pools from the yields subdomain. */
  async getYields(): Promise<DefiLlamaYield[]> {
    // Yields API lives on a different subdomain — use direct fetch.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15_000);
    try {
      const res = await fetch("https://yields.llama.fi/pools", {
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        throw new Error(`yields API returned ${res.status}`);
      }
      const json = (await res.json()) as { data: DefiLlamaYield[] };
      return json.data ?? [];
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  /** Health check: verify /v2/chains returns an array. */
  override async health(): Promise<boolean> {
    try {
      const chains = await this.get<unknown[]>("/v2/chains");
      return Array.isArray(chains);
    } catch {
      return false;
    }
  }
}

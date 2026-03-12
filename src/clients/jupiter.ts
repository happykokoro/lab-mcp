import { BaseClient } from "./base.js";

// ── Types ────────────────────────────────────────────────────────────

export interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  priceImpactPct: string;
  routePlan: {
    swapInfo: {
      ammKey: string;
      label: string;
      feeAmount: string;
    };
  }[];
  slippageBps: number;
}

export interface JupiterToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string | null;
}

interface JupiterPriceEntry {
  id: string;
  price: string;
}

// ── Client ───────────────────────────────────────────────────────────

/** SOL mint address used for health checks. */
const SOL_MINT = "So11111111111111111111111111111111111111112";

/** Jupiter aggregator API client for swap quotes and token pricing. */
export class JupiterClient extends BaseClient {
  constructor() {
    super({
      baseUrl: "https://api.jup.ag",
      serviceName: "jupiter",
      timeoutMs: 15_000,
    });
  }

  /** Get a swap quote between two tokens. Amount is in smallest unit (lamports). */
  async getQuote(
    inputMint: string,
    outputMint: string,
    amount: number,
    slippageBps?: number,
  ): Promise<JupiterQuote> {
    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount: String(amount),
    });
    if (slippageBps !== undefined) {
      params.set("slippageBps", String(slippageBps));
    }
    return this.get(`/quote?${params.toString()}`);
  }

  /** Get current prices for multiple token mints. */
  async getPrice(
    ids: string[],
  ): Promise<Record<string, JupiterPriceEntry>> {
    const joined = ids.join(",");
    const resp = await this.get<{ data: Record<string, JupiterPriceEntry> }>(
      `/price/v2?ids=${encodeURIComponent(joined)}`,
    );
    return resp.data;
  }

  /** Get the full Jupiter verified token list. */
  async getTokenList(): Promise<JupiterToken[]> {
    return this.get("/tokens");
  }

  /** Health check: try fetching SOL price. */
  override async health(): Promise<boolean> {
    try {
      const prices = await this.getPrice([SOL_MINT]);
      return SOL_MINT in prices;
    } catch {
      return false;
    }
  }
}

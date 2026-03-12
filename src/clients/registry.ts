import { LabClient } from "./lab.js";
import { PlatformClient } from "./platform.js";
import { PricingClient } from "./pricing.js";
import { CoinGeckoClient } from "./coingecko.js";
import { DeFiLlamaClient } from "./defillama.js";
import { BirdeyeClient } from "./birdeye.js";
import { JupiterClient } from "./jupiter.js";
import { McpServiceError, McpErrorCode } from "../types/errors.js";

export interface RegistryConfig {
  labUrl: string;
  platformUrl?: string;
  pricingUrl?: string;
  platformToken?: string;
  coingeckoApiKey?: string;
  birdeyeApiKey?: string;
  healthCheckIntervalMs?: number;
}

/**
 * Manages service clients with health awareness and dual-mode routing.
 * When Platform is available + authenticated, routes through it for tier-gated access.
 * Falls back to direct Lab access otherwise.
 *
 * External data connectors (CoinGecko, DeFiLlama, Birdeye, Jupiter) are
 * always instantiated when possible and checked alongside internal services.
 */
export class ServiceRegistry {
  readonly lab: LabClient;
  readonly platform: PlatformClient | null;
  readonly pricing: PricingClient | null;
  readonly coingecko: CoinGeckoClient;
  readonly defillama: DeFiLlamaClient;
  readonly birdeye: BirdeyeClient | null;
  readonly jupiter: JupiterClient;

  private labHealthy = false;
  private platformHealthy = false;
  private pricingHealthy = false;
  private coingeckoHealthy = false;
  private defillamaHealthy = false;
  private birdeyeHealthy = false;
  private jupiterHealthy = false;
  private healthInterval: ReturnType<typeof setInterval> | null = null;
  private readonly healthCheckIntervalMs: number;

  constructor(config: RegistryConfig) {
    this.lab = new LabClient(config.labUrl);
    this.platform = config.platformUrl
      ? new PlatformClient(config.platformUrl, config.platformToken)
      : null;
    this.pricing = config.pricingUrl
      ? new PricingClient(config.pricingUrl)
      : null;

    // External data connectors
    // CoinGecko: always available (free tier), optionally with Pro API key
    this.coingecko = new CoinGeckoClient(config.coingeckoApiKey);
    // DeFi Llama: always available (no auth required)
    this.defillama = new DeFiLlamaClient();
    // Birdeye: requires API key
    this.birdeye = config.birdeyeApiKey
      ? new BirdeyeClient(config.birdeyeApiKey)
      : null;
    // Jupiter: always available (no auth required)
    this.jupiter = new JupiterClient();

    this.healthCheckIntervalMs = config.healthCheckIntervalMs ?? 30_000;
  }

  async startHealthChecks(): Promise<void> {
    await this.checkHealth();
    this.healthInterval = setInterval(() => this.checkHealth(), this.healthCheckIntervalMs);
  }

  stopHealthChecks(): void {
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
      this.healthInterval = null;
    }
  }

  private async checkHealth(): Promise<void> {
    const checks = [
      this.lab.health().then((ok) => { this.labHealthy = ok; }),
      this.coingecko.health().then((ok) => { this.coingeckoHealthy = ok; }),
      this.defillama.health().then((ok) => { this.defillamaHealthy = ok; }),
      this.jupiter.health().then((ok) => { this.jupiterHealthy = ok; }),
    ];
    if (this.platform) {
      checks.push(this.platform.health().then((ok) => { this.platformHealthy = ok; }));
    }
    if (this.pricing) {
      checks.push(this.pricing.health().then((ok) => { this.pricingHealthy = ok; }));
    }
    if (this.birdeye) {
      checks.push(this.birdeye.health().then((ok) => { this.birdeyeHealthy = ok; }));
    }
    await Promise.allSettled(checks);
  }

  isLabAvailable(): boolean { return this.labHealthy; }
  isPlatformAvailable(): boolean { return this.platformHealthy; }
  isPricingAvailable(): boolean { return this.pricingHealthy; }
  isCoinGeckoAvailable(): boolean { return this.coingeckoHealthy; }
  isDeFiLlamaAvailable(): boolean { return this.defillamaHealthy; }
  isBirdeyeAvailable(): boolean { return this.birdeyeHealthy; }
  isJupiterAvailable(): boolean { return this.jupiterHealthy; }

  /** Require Lab to be available, throw actionable error if not. */
  requireLab(): void {
    if (!this.labHealthy) {
      throw new McpServiceError(
        McpErrorCode.SERVICE_UNAVAILABLE,
        "lab",
        "",
        null,
        "Lab service is not responding. Start it with: cargo run -p lab",
      );
    }
  }

  /** Require Platform to be available. */
  requirePlatform(): void {
    if (!this.platform || !this.platformHealthy) {
      throw new McpServiceError(
        McpErrorCode.SERVICE_UNAVAILABLE,
        "platform",
        "",
        null,
        "Platform service is not available. Configure PLATFORM_URL and PLATFORM_TOKEN.",
      );
    }
  }

  /** Require a named external connector to be available. */
  requireConnector(name: "coingecko" | "defillama" | "birdeye" | "jupiter"): void {
    const available: Record<string, boolean> = {
      coingecko: this.coingeckoHealthy,
      defillama: this.defillamaHealthy,
      birdeye: this.birdeyeHealthy,
      jupiter: this.jupiterHealthy,
    };
    const hints: Record<string, string> = {
      coingecko: "CoinGecko API may be rate-limited. Optionally set COINGECKO_API_KEY for Pro tier.",
      defillama: "DeFi Llama API is not responding. Check https://api.llama.fi",
      birdeye: "Birdeye requires an API key. Set BIRDEYE_API_KEY in environment.",
      jupiter: "Jupiter API is not responding. Check https://api.jup.ag",
    };

    if (!available[name]) {
      throw new McpServiceError(
        McpErrorCode.SERVICE_UNAVAILABLE,
        name,
        "",
        null,
        hints[name] ?? `${name} connector is not available.`,
      );
    }
  }
}

import { LabClient } from "./lab.js";
import { PlatformClient } from "./platform.js";
import { PricingClient } from "./pricing.js";
import { McpServiceError, McpErrorCode } from "../types/errors.js";

export interface RegistryConfig {
  labUrl: string;
  platformUrl?: string;
  pricingUrl?: string;
  platformToken?: string;
  healthCheckIntervalMs?: number;
}

/**
 * Manages service clients with health awareness and dual-mode routing.
 * When Platform is available + authenticated, routes through it for tier-gated access.
 * Falls back to direct Lab access otherwise.
 */
export class ServiceRegistry {
  readonly lab: LabClient;
  readonly platform: PlatformClient | null;
  readonly pricing: PricingClient | null;

  private labHealthy = false;
  private platformHealthy = false;
  private pricingHealthy = false;
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
    ];
    if (this.platform) {
      checks.push(this.platform.health().then((ok) => { this.platformHealthy = ok; }));
    }
    if (this.pricing) {
      checks.push(this.pricing.health().then((ok) => { this.pricingHealthy = ok; }));
    }
    await Promise.allSettled(checks);
  }

  isLabAvailable(): boolean { return this.labHealthy; }
  isPlatformAvailable(): boolean { return this.platformHealthy; }
  isPricingAvailable(): boolean { return this.pricingHealthy; }

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
}

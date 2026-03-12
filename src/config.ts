import type { RegistryConfig } from "./clients/registry.js";

export function loadConfig(): RegistryConfig {
  return {
    labUrl: process.env.LAB_URL ?? "http://localhost:4100",
    platformUrl: process.env.PLATFORM_URL ?? undefined,
    platformToken: process.env.PLATFORM_TOKEN ?? undefined,
    pricingUrl: process.env.PRICING_URL ?? undefined,
    coingeckoApiKey: process.env.COINGECKO_API_KEY ?? undefined,
    birdeyeApiKey: process.env.BIRDEYE_API_KEY ?? undefined,
    healthCheckIntervalMs: Number(process.env.HEALTH_CHECK_INTERVAL_MS) || 30_000,
  };
}

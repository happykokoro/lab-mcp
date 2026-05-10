import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

/**
 * Tier ladder.
 *
 * Tier names `tier-1` .. `tier-4` are placeholder values designed to map to
 * an operator's own subscription model. Operators may rename or restructure
 * tiers (e.g. basic/standard/pro/enterprise, bronze/silver/gold/platinum) by
 * editing this file plus the `tier` enum in `tools/admin.ts`. The numeric
 * level is what gates access — the string label is operator-defined.
 *
 * Tiers are validated against the value of `tier` returned by the operator's
 * own `/api/auth/me` endpoint (see `auth/middleware.ts`).
 */
export type Tier = "tier-1" | "tier-2" | "tier-3" | "tier-4";

const TIER_LEVELS: Record<Tier, number> = {
  "tier-1": 0,
  "tier-2": 1,
  "tier-3": 2,
  "tier-4": 3,
};

export function tierLevel(tier: string): number {
  return TIER_LEVELS[tier as Tier] ?? 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolHandler = (...args: any[]) => any;

export function tierGatedTool<T extends ToolHandler>(
  minTier: Tier,
  handler: T,
): T {
  return ((args: Record<string, unknown>, extra: { authInfo?: AuthInfo }) => {
    const authInfo = extra.authInfo;
    const userTier = (authInfo?.extra?.tier as string) ?? "tier-1";
    if (tierLevel(userTier) < tierLevel(minTier)) {
      const upgradeUrl = process.env.UPGRADE_URL;
      const upgradeHint = upgradeUrl
        ? `Upgrade at ${upgradeUrl}`
        : "Upgrade your tier to access this tool.";
      return Promise.resolve({
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error: "upgrade_required",
              message: `This tool requires ${minTier}. Current: ${userTier}. ${upgradeHint}`,
              required_tier: minTier,
              current_tier: userTier,
            }),
          },
        ],
      });
    }
    return handler(args, extra);
  }) as T;
}

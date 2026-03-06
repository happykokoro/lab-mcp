import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

export type Tier = "free" | "level1" | "level2" | "promax";

const TIER_LEVELS: Record<Tier, number> = {
  free: 0,
  level1: 1,
  level2: 2,
  promax: 3,
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
    const userTier = (authInfo?.extra?.tier as string) ?? "free";
    if (tierLevel(userTier) < tierLevel(minTier)) {
      return Promise.resolve({
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error: "upgrade_required",
              message: `This tool requires ${minTier} tier. Current: ${userTier}. Upgrade at https://alpha.happykokoro.com/settings`,
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

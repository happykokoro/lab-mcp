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

// Map tool names → minimum tier required
const TOOL_TIERS: Record<string, Tier> = {
  // Free — read-only
  lab_health: "free",
  lab_mode: "free",
  lab_signals: "free",
  lab_positions: "free",
  lab_positions_summary: "free",
  lab_metrics: "free",
  lab_factors: "free",
  lab_predictions: "free",
  lab_expert_weights: "free",
  lab_correlation: "free",
  lab_events: "free",
  lab_candles: "free",
  lab_backtest_scenarios: "free",

  // Level1 — detail tools
  lab_factor_scorecard: "level1",
  lab_factor_accuracy: "level1",
  lab_prediction_results: "level1",
  lab_traces: "level1",
  lab_strategy: "level1",
  lab_tracked_wallets: "level1",

  // Level2 — write/execute
  lab_pending_signals: "level2",
  lab_approve_signal: "level2",
  lab_strategy_reload: "level2",
  lab_backtest: "level2",
  engine_deploy_bot: "level2",
  engine_stop_bot: "level2",
  engine_bot_status: "level2",
  engine_list_bots: "level2",
  engine_cluster_health: "level2",
  engine_positions: "level2",
  engine_trades: "level2",
  data_list_sources: "level2",
  data_start_adapter: "level2",
  data_stop_adapter: "level2",
  data_upload: "level2",
  data_adapter_status: "level2",
  artifact_export: "level2",
  artifact_validate: "level2",
  artifact_load: "level2",
  artifact_list: "level2",

  // ProMax — admin
  admin_list_users: "promax",
  admin_change_user_tier: "promax",
  admin_list_all_bots: "promax",
  admin_kill_bot: "promax",
  admin_system_health: "promax",
  admin_audit_log: "promax",
};

export function getToolTier(toolName: string): Tier {
  return TOOL_TIERS[toolName] ?? "level2";
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

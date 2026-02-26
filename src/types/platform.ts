// Types from frontend/app/lib/apiClient.ts — Platform domain

export type Tier = "free" | "starter" | "pro" | "enterprise";
export type BotStatusKind = "Running" | "Stopped" | "Error" | "Deploying";

export interface User {
  id: string;
  email: string;
  display_name?: string;
  tier: Tier;
  status: string;
  created_at: string;
}

export interface Bot {
  id: string;
  name: string;
  artifact_id: string;
  status: BotStatusKind;
  deployed_at: string;
  pnl_sol: number;
  positions_count: number;
  error_message?: string;
}

export interface BotPosition {
  token_mint: string;
  token_symbol: string | null;
  entry_price: number;
  current_price: number;
  amount_sol: number;
  pnl_sol: number;
  pnl_pct: number;
}

export interface ClusterHealth {
  status: string;
  active_bots: number;
  total_bots: number;
  uptime_secs: number;
  memory_mb: number;
  cpu_pct: number;
}

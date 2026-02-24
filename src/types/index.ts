// Shared types — eventually replaced by proto-generated types

export interface Position {
  id: string;
  token_mint: string;
  direction: string;
  entry_price: number;
  current_price?: number;
  pnl?: number;
  status: string;
}

export interface Signal {
  id: string;
  factor_name: string;
  token_mint: string;
  direction: string;
  confidence: number;
  status?: string;
}

export interface Factor {
  name: string;
  enabled: boolean;
  role: string;
  weight: number;
}

export interface BotStatus {
  bot_id: string;
  state: string;
  uptime_secs: number;
  positions_count?: number;
  pnl?: number;
}

export interface DataSource {
  name: string;
  asset_class: string;
  status: string;
  event_rate?: number;
}

export interface Artifact {
  id: string;
  name: string;
  version: string;
  created_at: string;
  valid: boolean;
}

export interface User {
  id: string;
  tier: string;
  usage: Record<string, number>;
}

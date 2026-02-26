// Types from frontend/app/lib/apiClient.ts — Lab domain

export interface SignalMetadata {
  dex_used: string;
  liquidity_usd: number;
  holder_count: number | null;
  safety_score: number;
  trend_direction: string;
  volatility: number;
}

export interface TradingSignal {
  signal_id: string;
  timestamp: number;
  action: "Buy" | "Sell" | "Hold";
  token_mint: string;
  token_symbol: string | null;
  amount_sol: number;
  confidence: number;
  urgency: number;
  source_wallet: string;
  price_at_signal: number;
  metadata: SignalMetadata;
}

export interface RiskCheckedSignal {
  signal: TradingSignal;
  status: string;
  reject_reason: string | null;
  checked_at: number;
  expires_at: number;
}

export interface Position {
  id: string;
  token_mint: string;
  token_symbol: string | null;
  entry_price: number;
  current_price: number;
  amount_sol: number;
  token_amount: number;
  entry_timestamp: number;
  source_signal_id: string;
  source_wallet: string;
  status: "Open" | "Closed" | "StoppedOut" | "TookProfit";
  pnl_sol: number;
  pnl_pct: number;
  stop_loss_pct: number;
  take_profit_pct: number;
  close_reason: string | null;
  closed_at: number | null;
  direction?: "long" | "short" | "flat" | null;
}

export interface TrackedWallet {
  address: string;
  nickname: string;
  enabled: boolean;
  total_signals: number;
  buy_signals: number;
  sell_signals: number;
  approved_signals: number;
  rejected_signals: number;
  win_rate: number;
  total_pnl_sol: number;
  avg_confidence: number;
}

export interface CorrelationEntry {
  factor_a: string;
  factor_b: string;
  token_mint: string;
  correlation: number;
  warning: boolean;
}

export interface CorrelationMatrix {
  entries: CorrelationEntry[];
  timestamp: number;
}

export interface DecisionTrace {
  trace_id: string;
  timestamp: number;
  token_mint: string;
  final_action: string;
  factor_signals: {
    factor_name: string;
    direction: string;
    confidence: number;
    decayed_confidence: number;
    expired: boolean;
    metadata?: Record<string, unknown>;
  }[];
  composition_result: {
    direction: string;
    confidence: number;
    contributing_factors: string[];
    vetoed_by: string | null;
  } | null;
  risk_result: {
    approved: boolean;
    reject_reason: string | null;
    position_size_sol: number;
    risk_checks: unknown[];
  } | null;
  execution_result: {
    success: boolean;
    tx_signature: string | null;
    slippage_bps: number;
    execution_time_ms: number;
  } | null;
}

export interface EventRecord {
  id: number;
  event_type: string;
  timestamp: number;
  payload: Record<string, unknown>;
}

export interface ExecutionOrder {
  order_id: string;
  timestamp: number;
  token_mint: string;
  direction: string;
  intended_price: number;
  fill_price: number | null;
  slippage_bps: number;
  total_cost_bps: number;
  fill_quality: number;
  latency_ms: number;
  tx_signature: string | null;
  status: string;
  sized_amount_sol: number;
  backend: string;
}

export interface ExecutionConfig {
  config: {
    backend: string;
    sizer_strategy: string;
    slippage_model: string;
    [key: string]: unknown;
  } | null;
  backend: string;
}

export interface ExecutionHistory {
  orders: ExecutionOrder[];
  count: number;
  summary: import("./generated.js").ExecutionSummary | null;
}

export interface WhaleSignal {
  size: number;
  direction: string;
  age_secs: number;
  decay: number;
}

export interface ClusterEntry {
  id: string;
  phase: string;
  member_count: number;
  direction: number;
  strength: number;
}

export interface MicrostructureState {
  order_flow: {
    cumulative_ofi: number;
    flow_momentum: number;
    flow_momentum_ema: number;
    buy_volume_ratio: number;
    event_count: number;
    intensity: number;
  };
  whales: {
    active_signals: WhaleSignal[];
    net_pressure: number;
    whale_count_recent: number;
  };
  clusters: {
    active: ClusterEntry[];
  };
  convergence: {
    model_stress: number;
    stress_threshold: number;
    stress_active: boolean;
    spectral_event: boolean;
    event_threshold: number;
    gate_blocked: boolean;
  };
  momentum_consensus: {
    direction: number;
    magnitude: number;
    confidence: number;
    flow_weight: number;
    whale_weight: number;
    cluster_weight: number;
    velocity_weight: number;
  };
}

export interface OHLCVCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface EquityPoint {
  timestamp: number;
  equity: number;
  drawdown: number;
}

export interface BacktestResult {
  total_trades: number;
  win_rate: number;
  total_pnl: number;
  max_drawdown: number;
  trades: {
    action: string;
    token: string;
    price: number;
    timestamp: number;
    pnl: number;
    confidence: number;
  }[];
  price_series: { timestamp: number; price: number }[];
  factor_scores: {
    name: string;
    signals: number;
    accuracy: number;
    pnl: number;
  }[];
}

export interface ScenarioInfo {
  name: string;
  description: string;
  steps: number;
}

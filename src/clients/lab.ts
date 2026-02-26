import { BaseClient } from "./base.js";
import type {
  HealthResponse, ModeResponse, MetricsResponse, FactorsResponse,
  FilterStateResponse, ConfidenceBreakdownResponse,
  PredictionInternalsResponse, ConvergenceHistoryResponse,
  PositionsSummaryResponse, FactorAccuracyResponse,
  PredictionResultsResponse, ExpertWeightsResponse,
  ExecutionReloadResponse, StrategyReloadResponse,
} from "../types/generated.js";
import type {
  TradingSignal, RiskCheckedSignal, Position, TrackedWallet,
  CorrelationMatrix, DecisionTrace, EventRecord,
  ExecutionConfig, ExecutionHistory, MicrostructureState,
  BacktestResult, ScenarioInfo, OHLCVCandle, EquityPoint,
} from "../types/lab.js";

/** Typed client for all 32 Lab REST endpoints (port 4100). */
export class LabClient extends BaseClient {
  constructor(baseUrl = "http://localhost:4100") {
    super({ baseUrl, serviceName: "lab" });
  }

  // ── Health & Mode ─────────────────────────────────────────

  getHealth(): Promise<HealthResponse> {
    return this.get("/health");
  }

  getMode(): Promise<ModeResponse> {
    return this.get("/api/mode");
  }

  // ── Signals ───────────────────────────────────────────────

  getSignals(): Promise<{ signals: TradingSignal[] }> {
    return this.get("/api/signals");
  }

  getPendingSignals(): Promise<{ pending: RiskCheckedSignal[]; count: number }> {
    return this.get("/api/signals/pending");
  }

  approveSignal(id: string): Promise<{ approved: boolean; signal: unknown }> {
    return this.post(`/api/signals/${encodeURIComponent(id)}/approve`);
  }

  // ── Positions ─────────────────────────────────────────────

  getPositions(): Promise<{ positions: Position[] }> {
    return this.get("/api/positions");
  }

  getPositionsSummary(): Promise<PositionsSummaryResponse> {
    return this.get("/api/positions/summary");
  }

  // ── Metrics ───────────────────────────────────────────────

  getMetrics(): Promise<MetricsResponse> {
    return this.get("/api/metrics");
  }

  // ── Factors ───────────────────────────────────────────────

  getFactors(): Promise<FactorsResponse> {
    return this.get("/api/factors");
  }

  getFactorScorecard(name: string): Promise<{ scorecard: unknown }> {
    return this.get(`/api/factors/${encodeURIComponent(name)}/scorecard`);
  }

  getFactorAccuracy(name: string): Promise<FactorAccuracyResponse> {
    return this.get(`/api/factors/${encodeURIComponent(name)}/accuracy`);
  }

  // ── Predictions ───────────────────────────────────────────

  getPredictions(): Promise<{ predictions: unknown[]; count: number }> {
    return this.get("/api/predictions");
  }

  getPredictionResults(): Promise<PredictionResultsResponse> {
    return this.get("/api/predictions/results");
  }

  getExpertWeights(): Promise<ExpertWeightsResponse> {
    return this.get("/api/experts/weights");
  }

  // ── Strategy ──────────────────────────────────────────────

  getStrategy(): Promise<{ strategy: Record<string, unknown> }> {
    return this.get("/api/strategy");
  }

  reloadStrategy(): Promise<StrategyReloadResponse> {
    return this.post("/api/strategy/reload");
  }

  getTrackedWallets(): Promise<{ wallets: TrackedWallet[] }> {
    return this.get("/api/tracked-wallets");
  }

  // ── Events & Traces ───────────────────────────────────────

  getEvents(params?: { type?: string; limit?: number }): Promise<{ events: EventRecord[] }> {
    const qs = new URLSearchParams();
    if (params?.type) qs.set("type", params.type);
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString();
    return this.get(`/api/events${query ? `?${query}` : ""}`);
  }

  getTraces(): Promise<{ traces: DecisionTrace[] }> {
    return this.get("/api/traces");
  }

  getCorrelation(): Promise<{ matrices: CorrelationMatrix[] }> {
    return this.get("/api/correlation");
  }

  // ── Backtest ──────────────────────────────────────────────

  runBacktest(params: {
    scenario?: string;
    file_path?: string;
    token_mint?: string;
    steps?: number;
  }): Promise<BacktestResult> {
    return this.post("/api/backtest", params);
  }

  listScenarios(): Promise<{ scenarios: ScenarioInfo[] }> {
    return this.get("/api/backtest/scenarios");
  }

  // ── Execution ─────────────────────────────────────────────

  getExecutionConfig(): Promise<ExecutionConfig> {
    return this.get("/api/execution/config");
  }

  reloadExecution(): Promise<ExecutionReloadResponse> {
    return this.post("/api/execution/reload");
  }

  getExecutionHistory(limit = 50): Promise<ExecutionHistory> {
    return this.get(`/api/execution/history?limit=${limit}`);
  }

  // ── Microstructure ────────────────────────────────────────

  getMicrostructureState(): Promise<MicrostructureState> {
    return this.get("/api/microstructure/state");
  }

  // ── Chart Data ────────────────────────────────────────────

  getPriceHistory(): Promise<{ candles: OHLCVCandle[] }> {
    return this.get("/api/price-history");
  }

  getEquityCurve(): Promise<{ points: EquityPoint[] }> {
    return this.get("/api/equity-curve");
  }

  // ── Diagnostics ───────────────────────────────────────────

  getFilterState(): Promise<FilterStateResponse> {
    return this.get("/api/diagnostics/filter-state");
  }

  getConfidence(): Promise<ConfidenceBreakdownResponse> {
    return this.get("/api/diagnostics/confidence");
  }

  getPredictionDiagnostics(): Promise<PredictionInternalsResponse> {
    return this.get("/api/diagnostics/predictions");
  }

  getConvergenceHistory(): Promise<ConvergenceHistoryResponse> {
    return this.get("/api/diagnostics/convergence-history");
  }
}

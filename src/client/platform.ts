export class PlatformClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  private async request(path: string, options?: RequestInit): Promise<string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`;
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: { ...headers, ...(options?.headers as Record<string, string>) },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return JSON.stringify({
        error: `${res.status} ${res.statusText}`,
        body,
      });
    }
    return JSON.stringify(await res.json(), null, 2);
  }

  // Lab proxy
  async getHealth() {
    return this.request("/health");
  }
  async getMode() {
    return this.request("/api/mode");
  }
  async getSignals() {
    return this.request("/api/signals");
  }
  async getPendingSignals() {
    return this.request("/api/signals/pending");
  }
  async approveSignal(signalId: string) {
    return this.request(`/api/signals/${signalId}/approve`, { method: "POST" });
  }
  async getPositions() {
    return this.request("/api/positions");
  }
  async getPositionsSummary() {
    return this.request("/api/positions/summary");
  }
  async getMetrics() {
    return this.request("/api/metrics");
  }
  async getFactors() {
    return this.request("/api/factors");
  }
  async getFactorScorecard(factorName: string) {
    return this.request(`/api/factors/${factorName}/scorecard`);
  }
  async getFactorAccuracy(factorName: string) {
    return this.request(`/api/factors/${factorName}/accuracy`);
  }
  async getPredictions() {
    return this.request("/api/predictions");
  }
  async getPredictionResults() {
    return this.request("/api/predictions/results");
  }
  async getExpertWeights() {
    return this.request("/api/experts/weights");
  }
  async getCorrelation() {
    return this.request("/api/correlation");
  }
  async getTraces() {
    return this.request("/api/traces");
  }
  async getStrategy() {
    return this.request("/api/strategy");
  }
  async reloadStrategy() {
    return this.request("/api/strategy/reload", { method: "POST" });
  }
  async getEvents() {
    return this.request("/api/events");
  }
  async getTrackedWallets() {
    return this.request("/api/tracked-wallets");
  }
  async runBacktest(body: Record<string, unknown>) {
    return this.request("/api/backtest", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }
  async getBacktestScenarios() {
    return this.request("/api/backtest/scenarios");
  }

  // Engine
  async deployBot(artifact: unknown) {
    return this.request("/api/engine/deploy", {
      method: "POST",
      body: JSON.stringify(artifact),
    });
  }
  async stopBot(botId: string) {
    return this.request("/api/engine/stop", {
      method: "POST",
      body: JSON.stringify({ bot_id: botId }),
    });
  }
  async getBotStatus(botId: string) {
    return this.request(`/api/engine/status/${botId}`);
  }
  async listBots() {
    return this.request("/api/engine/bots");
  }
  async getClusterHealth() {
    return this.request("/api/engine/health");
  }
  async getPositionsStream() {
    return this.request("/api/engine/positions");
  }
  async getTradesStream() {
    return this.request("/api/engine/trades");
  }

  // Data sources
  async listDataSources() {
    return this.request("/api/data-sources");
  }
  async startAdapter(name: string, config?: Record<string, unknown>) {
    return this.request("/api/data-sources/start", {
      method: "POST",
      body: JSON.stringify({ name, config }),
    });
  }
  async stopAdapter(name: string) {
    return this.request("/api/data-sources/stop", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }
  async uploadData(format: string, data: string) {
    return this.request("/api/data-sources/upload", {
      method: "POST",
      body: JSON.stringify({ format, data }),
    });
  }
  async getAdapterStatus(name: string) {
    return this.request(`/api/data-sources/status/${name}`);
  }

  // Artifacts
  async exportArtifact() {
    return this.request("/api/artifact/export", { method: "POST" });
  }
  async validateArtifact(artifact: unknown) {
    return this.request("/api/artifact/validate", {
      method: "POST",
      body: JSON.stringify(artifact),
    });
  }
  async loadArtifact(filePath: string) {
    return this.request("/api/artifact/load", {
      method: "POST",
      body: JSON.stringify({ file_path: filePath }),
    });
  }
  async listArtifacts() {
    return this.request("/api/artifacts");
  }

  // Admin
  async listUsers() {
    return this.request("/api/admin/users");
  }
  async changeUserTier(userId: string, tier: string) {
    return this.request(`/api/admin/users/${userId}/tier`, {
      method: "PUT",
      body: JSON.stringify({ tier }),
    });
  }
  async listAllBots() {
    return this.request("/api/admin/bots");
  }
  async killBot(botId: string) {
    return this.request(`/api/admin/bots/${botId}/kill`, { method: "POST" });
  }
  async getSystemHealth() {
    return this.request("/api/admin/health");
  }
  async getAuditLog(limit?: number) {
    const query = limit ? `?limit=${limit}` : "";
    return this.request(`/api/admin/audit-log${query}`);
  }
}

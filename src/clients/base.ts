import { McpServiceError, McpErrorCode, statusToErrorCode } from "../types/errors.js";

export interface BaseClientConfig {
  baseUrl: string;
  serviceName: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  headers?: Record<string, string>;
}

const DEFAULTS = {
  timeoutMs: 10_000,
  maxRetries: 2,
  retryDelayMs: 500,
};

export class BaseClient {
  protected readonly baseUrl: string;
  protected readonly serviceName: string;
  protected readonly timeoutMs: number;
  protected readonly maxRetries: number;
  protected readonly retryDelayMs: number;
  protected readonly defaultHeaders: Record<string, string>;

  constructor(config: BaseClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.serviceName = config.serviceName;
    this.timeoutMs = config.timeoutMs ?? DEFAULTS.timeoutMs;
    this.maxRetries = config.maxRetries ?? DEFAULTS.maxRetries;
    this.retryDelayMs = config.retryDelayMs ?? DEFAULTS.retryDelayMs;
    this.defaultHeaders = config.headers ?? {};
  }

  async health(): Promise<boolean> {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3000);
      const res = await fetch(`${this.baseUrl}/health`, { signal: ctrl.signal });
      clearTimeout(timer);
      return res.ok;
    } catch {
      return false;
    }
  }

  protected async get<T>(path: string): Promise<T> {
    return this.fetchWithRetry("GET", path, undefined, this.maxRetries);
  }

  protected async post<T>(path: string, body?: unknown): Promise<T> {
    // No retries for POST — may have side effects
    return this.fetchWithRetry("POST", path, body, 0);
  }

  protected async put<T>(path: string, body?: unknown): Promise<T> {
    return this.fetchWithRetry("PUT", path, body, 0);
  }

  protected async del<T>(path: string): Promise<T> {
    return this.fetchWithRetry("DELETE", path, undefined, 0);
  }

  private async fetchWithRetry<T>(
    method: string,
    path: string,
    body: unknown | undefined,
    retries: number,
  ): Promise<T> {
    const endpoint = `${method} ${path}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);

        const headers: Record<string, string> = { ...this.defaultHeaders };
        if (body !== undefined) {
          headers["Content-Type"] = "application/json";
        }

        const res = await fetch(`${this.baseUrl}${path}`, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: ctrl.signal,
        });
        clearTimeout(timer);

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          const err = new McpServiceError(
            statusToErrorCode(res.status),
            this.serviceName,
            endpoint,
            res.status,
            `${res.status} ${res.statusText}${text ? `: ${text}` : ""}`,
          );

          // Only retry on 5xx for GET
          if (res.status >= 500 && attempt < retries) {
            lastError = err;
            await this.delay(this.retryDelayMs * (attempt + 1));
            continue;
          }
          throw err;
        }

        const text = await res.text();
        if (!text) return {} as T;
        return JSON.parse(text) as T;
      } catch (err) {
        if (err instanceof McpServiceError) throw err;

        const isAbort = err instanceof DOMException && err.name === "AbortError";
        if (isAbort) {
          throw new McpServiceError(
            McpErrorCode.TIMEOUT,
            this.serviceName,
            endpoint,
            null,
            `Request timed out after ${this.timeoutMs}ms`,
          );
        }

        // Network error — retry if allowed
        lastError = err as Error;
        if (attempt < retries) {
          await this.delay(this.retryDelayMs * (attempt + 1));
          continue;
        }

        throw new McpServiceError(
          McpErrorCode.NETWORK_ERROR,
          this.serviceName,
          endpoint,
          null,
          `${(err as Error).message} — is ${this.serviceName} running on ${this.baseUrl}?`,
        );
      }
    }

    throw lastError ?? new Error("Unexpected retry exhaustion");
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

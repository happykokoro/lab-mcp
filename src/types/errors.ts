export enum McpErrorCode {
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT = "TIMEOUT",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  BAD_REQUEST = "BAD_REQUEST",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  RATE_LIMITED = "RATE_LIMITED",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
}

export class McpServiceError extends Error {
  readonly code: McpErrorCode;
  readonly service: string;
  readonly endpoint: string;
  readonly status: number | null;
  readonly details?: unknown;

  constructor(
    code: McpErrorCode,
    service: string,
    endpoint: string,
    status: number | null,
    message: string,
    details?: unknown,
  ) {
    super(`[${service}] ${endpoint}: ${message}`);
    this.name = "McpServiceError";
    this.code = code;
    this.service = service;
    this.endpoint = endpoint;
    this.status = status;
    this.details = details;
  }

  toToolResult(): { isError: true; content: { type: "text"; text: string }[] } {
    return {
      isError: true,
      content: [{ type: "text", text: `Error [${this.code}]: ${this.message}` }],
    };
  }
}

export function statusToErrorCode(status: number): McpErrorCode {
  if (status === 400) return McpErrorCode.BAD_REQUEST;
  if (status === 401) return McpErrorCode.UNAUTHORIZED;
  if (status === 403) return McpErrorCode.FORBIDDEN;
  if (status === 404) return McpErrorCode.NOT_FOUND;
  if (status === 429) return McpErrorCode.RATE_LIMITED;
  if (status === 503) return McpErrorCode.SERVICE_UNAVAILABLE;
  if (status >= 500) return McpErrorCode.INTERNAL_ERROR;
  return McpErrorCode.INTERNAL_ERROR;
}

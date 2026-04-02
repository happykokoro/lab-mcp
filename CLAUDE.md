# Lab MCP

MCP (Model Context Protocol) server that exposes Kokoro Alpha Lab, Engine, Platform, and Terminal APIs as tools for Claude and other AI assistants.

## Structure

```
lab-mcp/
  src/
    index.ts           # Entry point — stdio or HTTP transport
    server.ts          # McpServer setup, registers all 14 tool modules
    auth/              # Authentication helpers
    client/            # HTTP client for backend APIs
    tools/
      lab.ts           # Lab signals, positions, metrics, predictions (~40 tools)
      engine.ts        # Bot deploy/stop/status, positions, trades
      data-sources.ts  # Data adapter start/stop/status
      artifacts.ts     # Export/load/validate artifacts
      admin.ts         # User management, system health, audit log
      polymarket.ts    # Markets, positions, arbitrage, copula, simulate
      backtest-jobs.ts # Submit/cancel/list backtest jobs
      alerts.ts        # Alert channels, history, preferences
      rebalance.ts     # Drift, plan, targets
      tradfi.ts        # Greeks, positions, risk, stress test
      universe.ts      # Universe profiles, stats
      consensus.ts     # Consensus tokens, contribute
      quant-tools.ts   # Black-Scholes, Brier, copula, GBM, Markowitz, etc.
      terminal.ts      # Terminal-specific market data tools
    transport/
      http.ts          # HTTP/SSE transport
    types/             # Shared type definitions
```

## Quick Commands

```bash
# Install
npm install

# Build
npm run build

# Run (HTTP mode, default)
npm start

# Run (stdio mode, for Claude desktop)
npm run start:stdio

# Dev (build + start)
npm run dev
```

## Ports / Services

| Port | Service | Description                |
| ---- | ------- | -------------------------- |
| 3100 | lab-mcp | MCP server (HTTP/SSE mode) |

## Environment Variables

```
LAB_URL=http://localhost:4100        # Rust Lab backend
PRICING_URL=http://localhost:4002    # Pricing service
PLATFORM_URL=http://localhost:4000   # Platform/Engine
TERMINAL_URL=http://localhost:4200   # Terminal API gateway
MCP_TRANSPORT=http                   # http or stdio
MCP_PORT=3100
```

## Related Repos

| Repo                      | Role                                     |
| ------------------------- | ---------------------------------------- |
| kokoro-alpha-lab          | Primary backend (Lab + Engine)           |
| kokoro-alpha-lab-frontend | Frontend that consumes same APIs         |
| kokoro-pricing-service    | Pricing data source                      |
| kokoro-terminal           | Terminal API backend                     |
| kokoro-auth               | Auth (tools use platform auth currently) |

## Conventions

- TypeScript, ES modules, Node.js runtime
- @modelcontextprotocol/sdk for MCP protocol
- Each tool module registers via `register*Tools(server, url)` pattern
- Tools are thin HTTP proxies — business logic lives in backend services
- Version in server.ts (currently 2.0.0) and package.json (1.1.0) — keep in sync
- 98+ tools total across 14 modules
- Deployed on production server as Docker container

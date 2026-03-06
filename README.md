# Lab MCP

MCP (Model Context Protocol) server for the Kokoro Alpha Lab trading system. Exposes 92 tools for AI-native interaction with the Lab, Engine, and Platform services via Claude Code or any MCP-compatible client.

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![MCP](https://img.shields.io/badge/MCP-Model%20Context%20Protocol-blue?style=flat)

## Quick Start

```bash
# Install dependencies
npm ci

# Build
npm run build

# Start (HTTP transport, port 3100)
npm run start:http

# Start (stdio transport, for Claude Code)
npm run start:stdio
```

## Tool Categories (92 tools)

| Category      | Tools | Description                                              |
| ------------- | ----- | -------------------------------------------------------- |
| Lab           | 22    | Signals, positions, factors, predictions, traces, events |
| Engine        | 8     | Bot deployment, status, positions, trades, cluster       |
| Polymarket    | 6     | Markets, arbitrage, copula, positions, simulation        |
| Data Sources  | 5     | Adapter management, upload, status                       |
| Artifacts     | 4     | Strategy export, validate, load, list                    |
| Admin         | 6     | User management, system health, audit log (ProMax only)  |
| Backtest Jobs | 6     | Async backtests, results, comparison                     |
| Alerts        | 5     | Alert rules, history, channels                           |
| Rebalance     | 6     | Portfolio targets, drift, execution                      |
| TradFi        | 8     | Equity positions, options chains, forex rates            |
| Universe      | 6     | Token profiles, lifecycle, discovery                     |
| Consensus     | 10    | Factor voting, aggregation, history                      |

## Environment Variables

| Variable        | Description                 | Default                 |
| --------------- | --------------------------- | ----------------------- |
| `MCP_TRANSPORT` | Transport mode (http/stdio) | `http`                  |
| `MCP_PORT`      | HTTP server port            | `3100`                  |
| `LAB_URL`       | Lab backend URL             | `http://localhost:4100` |
| `PRICING_URL`   | Pricing service URL         | `http://localhost:4002` |
| `PLATFORM_URL`  | Platform gateway URL        | `http://localhost:4000` |
| `API_KEY`       | Backend authentication key  | —                       |
| `CORS_ORIGIN`   | Allowed CORS origin         | `http://localhost:3001` |

## Tier-Based Access Control

Tools are gated by user subscription tier:

| Tier     | Access Level                                           |
| -------- | ------------------------------------------------------ |
| `free`   | Basic lab tools (health, mode, signals, markets)       |
| `level1` | Full lab + polymarket + engine tools                   |
| `level2` | Advanced features (simulation, backtests, rebalancing) |
| `promax` | Admin tools (user management, system health, audit)    |

## Docker

```bash
docker build -t lab-mcp .
docker run -p 3100:3100 \
  -e LAB_URL=http://lab:4100 \
  -e PLATFORM_URL=http://platform:4000 \
  -e PRICING_URL=http://pricing:4002 \
  lab-mcp
```

## Architecture

```
Claude Code / MCP Client
        │
        ▼
   Lab MCP (:3100)
   ┌────────────────┐
   │  92 MCP Tools   │
   │  Tier Gate Auth  │
   │  HTTP + stdio    │
   └───┬────┬────┬───┘
       │    │    │
       ▼    ▼    ▼
    Lab  Platform  Pricing
  (:4100) (:4000) (:4002)
```

## Tech Stack

| Component                 | Version |
| ------------------------- | ------- |
| TypeScript                | 5.7     |
| @modelcontextprotocol/sdk | 1.12    |
| Zod                       | 3.24    |
| Node.js                   | 22      |

## Related Repositories

Part of the **Kokoro Alpha Lab** 5-repo ecosystem:

| Repo                                                                                  | Purpose                                   |
| ------------------------------------------------------------------------------------- | ----------------------------------------- |
| [kokoro-alpha-lab](https://github.com/happykokoro/kokoro-alpha-lab)                   | Core: shared types, Lab, Engine, Platform |
| [kokoro-alpha-lab-frontend](https://github.com/happykokoro/kokoro-alpha-lab-frontend) | Next.js dashboard                         |
| [kokoro-wallet-monitor](https://github.com/happykokoro/kokoro-wallet-monitor)         | Solana swap detection                     |
| [kokoro-pricing-service](https://github.com/happykokoro/kokoro-pricing-service)       | Multi-DEX price aggregation               |

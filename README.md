# lab-mcp v3

MCP (Model Context Protocol) server for the Alpha Lab quantitative trading platform. Exposes Lab's trading engine, market data connectors, and analytical workflows as MCP tools, resources, and prompts -- enabling AI assistants to interact with the full trading stack over stdio.

## Architecture

```
Claude / AI Assistant
        |  stdio (JSON-RPC)
        v
   McpServer (MCP SDK)
   ├── Tools       (16 modules, ~50+ tools)
   ├── Resources   (lab:// URIs for live state)
   └── Prompts     (structured analysis workflows)
        |
   ServiceRegistry
   ├── LabClient         (core trading engine)
   ├── PlatformClient    (auth, tier-gated access)
   ├── PricingClient     (token pricing service)
   ├── CoinGeckoClient   (market data)
   ├── DeFiLlamaClient   (TVL, yields, protocol data)
   ├── BirdeyeClient     (Solana token analytics)
   └── JupiterClient     (Solana DEX aggregator)
```

The `ServiceRegistry` manages all API clients with periodic health checks (default 30s) and dual-mode routing: when Platform is configured and authenticated, requests route through it for tier-gated access; otherwise they fall back to direct Lab access.

Skills are loaded from `skills/` at project root as markdown files (`skills/{name}/SKILL.md`) and served from memory at startup.

## Tools

| Module | Domain |
|--------|--------|
| `signals` | Active signals, pending approvals, signal lifecycle |
| `positions` | Open/closed positions, PnL tracking |
| `factors` | Factor values, weights, agreement analysis |
| `predictions` | Model predictions and forecast data |
| `strategy` | Strategy configuration and parameters |
| `diagnostics` | System diagnostics and health checks |
| `execution` | Trade execution and order management |
| `microstructure` | Order book, spread, liquidity analysis |
| `backtest` | Historical backtesting |
| `market` | Market data and price feeds |
| `events` | Event log and system events |
| `rebalance` | Portfolio rebalancing (client-side computation) |
| `attribution` | Performance attribution (client-side computation) |
| `fundamental` | Fundamental data via external connectors |
| `engine` | Engine control (Platform auth required) |
| `admin` | Administrative operations (Platform auth required) |

## Skills

Structured analytical workflows loaded from markdown. Each skill defines a multi-step procedure an AI assistant follows to produce a specific type of analysis.

| Skill | Purpose |
|-------|---------|
| `signal-analysis` | Assess signal quality, factor agreement, confidence, actionability |
| `confidence-audit` | Audit confidence calibration and reliability |
| `factor-audit` | Deep-dive into factor behavior and correlations |
| `filter-diagnosis` | Diagnose why signals are being filtered out |
| `market-context` | Gather broad market context for trading decisions |
| `parameter-sensitivity` | Analyze strategy parameter sensitivity |
| `portfolio-rebalance` | Guide portfolio rebalancing decisions |
| `risk-assessment` | Evaluate portfolio and position risk |
| `strategy-review` | Comprehensive strategy performance review |
| `system-health` | Full system health and operational status check |

## API Clients

| Client | Auth | Description |
|--------|------|-------------|
| **Lab** | None (local) | Core trading engine at `LAB_URL` |
| **Platform** | Token | Tier-gated platform API at `PLATFORM_URL` |
| **Pricing** | None | Token pricing service at `PRICING_URL` |
| **CoinGecko** | Optional key | Market data (free tier works, Pro key optional) |
| **DeFi Llama** | None | TVL, yields, protocol analytics |
| **Birdeye** | API key | Solana token analytics |
| **Jupiter** | None | Solana DEX quotes and routing |

## Setup

### Prerequisites

- Node.js >= 18
- TypeScript >= 5.7
- A running Lab instance (default: `http://localhost:4100`)

### Install and Build

```bash
npm install
npm run build
```

### Configuration

All configuration is via environment variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LAB_URL` | No | `http://localhost:4100` | Lab engine endpoint |
| `PLATFORM_URL` | No | -- | Platform API endpoint |
| `PLATFORM_TOKEN` | No | -- | Platform auth token |
| `PRICING_URL` | No | -- | Pricing service endpoint |
| `COINGECKO_API_KEY` | No | -- | CoinGecko Pro API key |
| `BIRDEYE_API_KEY` | No | -- | Birdeye API key (required for Birdeye tools) |
| `HEALTH_CHECK_INTERVAL_MS` | No | `30000` | Health check interval in ms |

### MCP Client Configuration

Add to your MCP client config (e.g. Claude Desktop `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "lab-mcp": {
      "command": "node",
      "args": ["path/to/lab-mcp-v3/dist/index.js"],
      "env": {
        "LAB_URL": "http://localhost:4100"
      }
    }
  }
}
```

## Development

### Type Synchronization

Generated types are shared with the frontend project. To sync:

```bash
npm run sync-types
```

This copies generated types from `../auto-rebalance-project/frontend/app/lib/generated-types.ts` into `src/types/generated.ts`.

### Project Structure

```
src/
  index.ts          Entry point, server bootstrap
  config.ts         Environment variable loading
  clients/          API client implementations + ServiceRegistry
  tools/            MCP tool registrations (16 modules)
  resources/        MCP resource registrations (lab:// URIs)
  prompts/          MCP prompt registrations (structured workflows)
  skills/           Skill loader (reads from skills/ at project root)
  types/            TypeScript type definitions + generated types
skills/             Skill markdown files (skills/{name}/SKILL.md)
scripts/            Utility scripts (type sync)
```

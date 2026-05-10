# Changelog

All notable changes to this project are documented in this file. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-05-06

### Added

- Initial public release.
- MCP server (TypeScript) exposing 116 tools across 14 modules: lab signals,
  engine bot lifecycle, polymarket, backtest jobs, alerts, rebalance, tradfi,
  universe, consensus, artifacts, data sources, admin, quant-tools, and
  terminal market data.
- Multi-tier access control (`tier-1` through `tier-4`) implemented as a
  closure-based decorator (`tierGatedTool`) over the MCP SDK's `AuthInfo` flow.
- Two transports: Streamable HTTP (with per-session isolation, idle GC, CORS,
  and auth middleware) and stdio.
- API-key auth via the operator's `/api/auth/me` endpoint with 5-minute LRU
  caching.
- Multi-stage `Dockerfile` (`node:22-alpine`).
- PolyForm Noncommercial 1.0.0 license.

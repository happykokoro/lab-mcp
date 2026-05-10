# Kokoro Lab MCP

[![CI](https://github.com/happykokoro/lab-mcp/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/happykokoro/lab-mcp/actions/workflows/ci.yml)
[![License: PolyForm Noncommercial 1.0.0](https://img.shields.io/badge/License-PolyForm--NC%201.0.0-blue.svg)](LICENSE)
[![Node 22+](https://img.shields.io/badge/node-22+-green.svg)](package.json)
[![TypeScript 5.x](https://img.shields.io/badge/typescript-5.x-blue.svg)](tsconfig.json)

A TypeScript [Model Context Protocol](https://modelcontextprotocol.io/) server that exposes a quantitative trading research platform — signals, factors, backtests, market data, bot lifecycle, alerts, and admin — as ~116 typed tools across 14 modules, with multi-tier access control built on the MCP SDK's `AuthInfo` flow. `lab-mcp` is a thin proxy: it does not store data, run strategies, or hold credentials. It validates a caller's API key and tier against an operator-supplied Platform service, then forwards typed tool calls to operator-supplied Lab, Pricing, Platform, and Terminal HTTP backends.

---

## Status

Under active development. The tool surface (currently ~116 tools across 14
modules) and the tier ladder are stable enough for internal use but may
drift; the source of truth is `src/tools/*.ts` and `src/auth/tierGate.ts`,
not this README.

This is a **thin proxy**, not a hosted service. There is no bundled
backend, no persistence, no signal logic, and no broker integration in
this repository. It is also **not** suitable for production trading
without operator-side hardening: the auth check is delegated entirely to
the operator's Platform service, the API-key cache is in-process and
unencrypted, and there is no built-in audit log. Run it behind your own
authn/authz boundary, with your own logging and rate-limiting, before
exposing it to any non-operator caller.

`npm run build` (i.e. `tsc`) passes against TypeScript 5.x on Node 22.

---

## What's inside

The repository is a single Node package containing one binary
(`dist/index.js`) and the modules that compose it:

- **~116 typed tools across 14 modules** — see the [Tool surface](#tool-surface)
  table below. Each tool is a Zod-validated MCP tool with a typed handler
  that proxies to one of four backend services.
- **Multi-tier access via MCP SDK `AuthInfo`** — every tool is wrapped in
  `tierGatedTool(minTier, handler)` (see `src/auth/tierGate.ts`). The
  caller's tier is fetched from the operator's Platform service and
  attached to the request as `AuthInfo`; the gate compares it numerically
  against the tool's required tier and returns a `403` payload if the
  caller is below it.
- **Two transports** — `stdio` for clients that spawn the binary directly
  (e.g. an MCP-compatible client such as Claude Code), and Streamable
  HTTP for remote/multi-tenant deployments.
- **Bring-your-own backends** — Lab, Pricing, Platform, and Terminal are
  all operator-supplied HTTP services. Their URLs are environment
  variables; their wire shape is whatever `src/tools/*.ts` and
  `src/client/platform.ts` call. There is no shared schema package.
- **LRU auth cache** — `src/auth/middleware.ts` caches the result of
  `GET /api/auth/me` for 5 minutes, keyed by `sha256(apiKey)`. This
  bounds the load on the Platform service when a single caller makes
  many tool calls in a row.
- **Per-session HTTP isolation** — the Streamable HTTP transport
  (`src/transport/http.ts`) keeps one MCP server instance per session,
  and runs an idle-session GC at 30 minutes so a stalled client does not
  pin server state forever. CORS is single-origin and explicit
  (`CORS_ORIGIN` env var); there is no wildcard fallback.

---

## Configuration

All configuration is via environment variables. Copy `.env.example` to
`.env` (or export the values in your shell) and fill in operator-specific
values.

| Variable        | Default                   | Purpose                                                                                                                  |
|-----------------|---------------------------|--------------------------------------------------------------------------------------------------------------------------|
| `MCP_TRANSPORT` | `http`                    | `http` or `stdio`                                                                                                        |
| `MCP_PORT`      | `3100`                    | HTTP listen port                                                                                                         |
| `LAB_URL`       | `http://localhost:4100`   | Lab service base URL                                                                                                     |
| `PRICING_URL`   | `http://localhost:4002`   | Pricing service base URL                                                                                                 |
| `PLATFORM_URL`  | `http://localhost:4000`   | Platform service base URL (auth, admin, artifacts)                                                                       |
| `TERMINAL_URL`  | `http://localhost:4200`   | Terminal market-data service                                                                                             |
| `API_KEY`       | _(unset)_                 | Bearer token used by `lab-mcp` to call Platform endpoints from server code (admin, artifacts, data sources, engine)      |
| `CORS_ORIGIN`   | `http://localhost:3001`   | Single allowed origin for the HTTP transport. There is no wildcard fallback                                              |
| `UPGRADE_URL`   | _(unset)_                 | Optional URL surfaced in `401`/`403` error messages so callers know where to manage keys / upgrade. Leave empty to omit  |

### Minimal `.env`

```env
MCP_TRANSPORT=http
MCP_PORT=3100

LAB_URL=http://localhost:4100
PRICING_URL=http://localhost:4002
PLATFORM_URL=http://localhost:4000
TERMINAL_URL=http://localhost:4200

API_KEY=replace-with-operator-bearer-token
CORS_ORIGIN=http://localhost:3001
```

`MCP_TRANSPORT=stdio` ignores `MCP_PORT` and `CORS_ORIGIN`. The four
backend URLs are required only for the modules you actually call; an
unreachable backend surfaces as a tool-level error, not a startup
failure.

---

## Getting started

Requires Node.js 22 or newer.

```bash
git clone https://github.com/happykokoro/lab-mcp.git
cd lab-mcp
npm install
cp .env.example .env
# edit .env — at minimum, set API_KEY and the four *_URL values
npm run build
npm start                 # respects MCP_TRANSPORT
```

Convenience scripts:

```bash
npm run start:stdio       # force stdio transport
npm run start:http        # force HTTP transport
npm run dev               # build, then start
```

A successful HTTP-transport boot logs the listen address and is reachable
on `http://localhost:3100` (or whatever `MCP_PORT` you set). Quick
smoke tests:

```bash
# Liveness
curl http://localhost:3100/health

# Initialise an MCP session over Streamable HTTP (Bearer auth).
# Replace the token with a key your Platform recognises.
curl -i http://localhost:3100/mcp \
  -H 'Authorization: Bearer <api-key>' \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}'
```

For interactive exploration, point an MCP-compatible client (e.g. the
[MCP Inspector](https://github.com/modelcontextprotocol/inspector) or
Claude Code) at the `stdio` binary or the HTTP endpoint — both expose
the same tool surface.

### Docker

```bash
docker build -t lab-mcp .
docker run --rm -p 3100:3100 \
  -e API_KEY=...            \
  -e LAB_URL=...             \
  -e PLATFORM_URL=...        \
  -e PRICING_URL=...         \
  -e TERMINAL_URL=...        \
  -e CORS_ORIGIN=...         \
  lab-mcp
```

The image is `node:22-alpine`, multi-stage, and includes a `wget`-based
healthcheck against `/health`.

---

## Self-hosting

This is the OSS edition. It is operator-BYO end-to-end — none of the
backend services it proxies are bundled in this repository, and there is
no hosted Kokoro instance you can plug into.

- **Lab** (`LAB_URL`) — exposes signals, factors, predictions, polymarket
  aggregations, quant primitives, backtest jobs, alerts, rebalance,
  tradfi, universe, consensus. The HTTP shape is whatever the calls in
  `src/tools/lab.ts`, `src/tools/quant-tools.ts`, etc., expect.
- **Pricing** (`PRICING_URL`) — token pricing, candle history. Wire shape
  defined by `src/tools/terminal.ts` and the pricing-related calls in
  `src/tools/lab.ts`.
- **Platform** (`PLATFORM_URL`) — authentication via
  `GET /api/auth/me` (returns `{id, tier, scopes}`), bot lifecycle,
  artifacts, data sources, admin. This is the *only* required backend
  for the auth flow; the rest are required only for the modules you
  enable.
- **Terminal** (`TERMINAL_URL`) — market-data terminal API; called by
  `src/tools/terminal.ts`.

Operator security checklist before exposing this beyond a single
operator:

1. **`API_KEY`** is the bearer token used *by `lab-mcp` itself* to call
   Platform from server code. It is not the caller's token. Keep it out
   of the container image, out of git, and out of any client-visible
   surface; mount it from a secret store at deploy time.
2. **Caller API keys** flow through the
   `Authorization: Bearer <key>` or `X-API-Key: <key>` header and are
   validated against `PLATFORM_URL/api/auth/me`. The result is cached
   in-process for 5 minutes keyed by `sha256(apiKey)`. Restart the
   process to invalidate; there is no admin endpoint to flush the cache
   yet.
3. **CORS** is single-origin (`CORS_ORIGIN`). Set it to your frontend's
   exact origin in production. There is no wildcard fallback.
4. **Idle session GC** runs at 30 minutes for the HTTP transport. If you
   front this with a load balancer, make sure session affinity is on —
   sessions are bound to the process that received `initialize`.
5. **Tier ladder** (`tier-1` → `tier-2` → `tier-3` → `tier-4`) is an
   operator-defined example. If your subscription model uses different
   labels (e.g. `basic / pro / enterprise`), edit the `Tier` union in
   `src/auth/tierGate.ts` and the corresponding `enum` in
   `src/tools/admin.ts` — gating is by the numeric level, not the
   string.
6. **Audit logging** is not built in. The MCP SDK emits structured
   request logs to stdout/stderr; pipe them to your log aggregator and
   correlate by session ID if you need a per-call audit trail.
7. **Rate limiting** is not built in. The 5-minute auth cache puts a
   floor on Platform load, but tool-call rate limiting belongs in front
   of `lab-mcp` (reverse proxy, API gateway, or a Platform-level
   per-key quota).
8. **Scaling** is horizontal — each process is stateless apart from the
   HTTP session map. Run N replicas behind a session-affine load
   balancer and a shared backing store for the Lab/Pricing/Platform/
   Terminal services.

---

## Architecture at a glance

```
+----------------------+        +-----------+        +----------------------+
| MCP-compatible       | -----> |  lab-mcp  | -----> |  operator backends   |
| client (e.g. Claude  |  MCP   |  (this    |  HTTP  |  - Lab    :4100      |
| Code, Inspector,     |        |   repo)   |        |  - Pricing:4002      |
| custom clients)      |        |           |        |  - Platform :4000    |
+----------------------+        +-----------+        |  - Terminal :4200    |
                                                     +----------------------+
                                       |
                                       v
                                  Auth check via Platform `/api/auth/me`
                                  (5-minute LRU cache, sha256-keyed)
```

Two transports are supported:

- **stdio** — `MCP_TRANSPORT=stdio`, typical for clients that spawn the
  binary directly. No HTTP listener, no CORS, no session map; the MCP
  protocol multiplexes over the process's stdin/stdout. Auth still flows
  through `AuthInfo` — the spawning client is expected to inject the
  caller's key into the JSON-RPC `params` per the MCP SDK contract.
- **Streamable HTTP** — `MCP_TRANSPORT=http`, listens on `MCP_PORT`
  (default `3100`). Per-session isolation, idle GC at 30 minutes, CORS
  scoped to `CORS_ORIGIN`, and Bearer/`X-API-Key` extraction in
  `src/auth/middleware.ts`. Auth result is cached for 5 minutes per
  `sha256(apiKey)`.

---

## Tool surface

116 tools across 14 modules. Counts may drift; the source of truth is
`src/tools/*.ts`.

| Module             | Tools | Concern                                              |
|--------------------|------:|------------------------------------------------------|
| `lab.ts`           |    36 | signals, factors, predictions, regime, scoring       |
| `quant-tools.ts`   |    16 | risk, portfolio, optimisation primitives             |
| `terminal.ts`      |     8 | market data, candles, tickers                        |
| `polymarket.ts`    |     7 | prediction-market lookups & sims                     |
| `alerts.ts`        |     7 | alert channels & preferences                         |
| `backtest-jobs.ts` |     7 | backtest queue, scenarios, MC paths                  |
| `engine.ts`        |     7 | bot lifecycle (start/stop/status)                    |
| `admin.ts`         |     6 | user/bot admin (highest tier only)                   |
| `data-sources.ts`  |     5 | data-source registration & ingest                    |
| `artifacts.ts`     |     4 | strategy artifact CRUD                               |
| `tradfi.ts`        |     4 | tradfi instrument lookups                            |
| `consensus.ts`     |     3 | consensus signal aggregation                         |
| `rebalance.ts`     |     3 | portfolio rebalance ops                              |
| `universe.ts`      |     3 | tradeable-universe queries                           |

### Tier gating

Every tool is wrapped in `tierGatedTool(minTier, handler)` (see
`src/auth/tierGate.ts`). The current ladder is:

```
tier-1 (0)  ->  tier-2 (1)  ->  tier-3 (2)  ->  tier-4 (3)
```

These tier names are **operator-defined examples**, not a product
taxonomy. Tier strings are validated against the value of `tier`
returned by your `/api/auth/me` endpoint. If your subscription model
uses different labels, see the [Self-hosting](#self-hosting) checklist
above for the two files to edit.

---

## External services

`lab-mcp` is operator-BYO for all backend services. None of them are
bundled in this repository.

- **Lab** (`LAB_URL`): exposes signals, factors, predictions, polymarket
  aggregations, quant primitives, backtest jobs, alerts, rebalance,
  tradfi, universe, consensus.
- **Pricing** (`PRICING_URL`): token pricing, candle history.
- **Platform** (`PLATFORM_URL`): authentication via
  `GET /api/auth/me` (returns `{id, tier, scopes}`), bot lifecycle,
  artifacts, data sources, admin.
- **Terminal** (`TERMINAL_URL`): market-data terminal API.

The HTTP shape of these services is defined by the calls in
`src/tools/*.ts` and `src/client/platform.ts`. There is no shared schema
package; integration is purely at the URL+JSON level.

---

## Layout

```
src/
  index.ts            entry point — env-driven transport + URL wiring
  server.ts           McpServer construction + module registration
  auth/
    middleware.ts     Bearer/X-API-Key extraction, /api/auth/me, LRU cache
    tierGate.ts       tier ladder + tierGatedTool decorator
  client/
    platform.ts       typed fetch wrapper for Platform endpoints
  transport/
    http.ts           Streamable HTTP server, sessions, CORS, idle GC
  tools/
    lab.ts, quant-tools.ts, terminal.ts, polymarket.ts,
    alerts.ts, backtest-jobs.ts, engine.ts, admin.ts,
    data-sources.ts, artifacts.ts, tradfi.ts, consensus.ts,
    rebalance.ts, universe.ts
  types/
    index.ts          shared response shapes
```

---

## Contributing

Pull requests welcome under the same license. Please:

1. Run `npm run build` (i.e. `tsc`) before opening a PR — the CI
   workflow gates on a clean TypeScript build against Node 22.
2. Match the existing TypeScript style: ES modules, strict TS, Zod for
   tool input schemas, no implicit `any`. Prettier and ESLint configs
   may land in a follow-up; in the meantime, follow the surrounding
   code.
3. Use [Conventional Commits](https://www.conventionalcommits.org/)
   (`feat(scope):`, `fix(scope):`, `docs:`, etc.) — match the repo's
   existing style.
4. For new tools, add the file under `src/tools/`, register it in
   `src/server.ts`, and wrap the handler in `tierGatedTool(minTier, …)`
   from `src/auth/tierGate.ts`. Update the tool-count table in this
   README if you cross a module boundary.

---

## License

PolyForm Noncommercial 1.0.0. The full text is in [LICENSE](LICENSE).
In short: you may use, modify, and redistribute the software for any
**non-commercial** purpose. Commercial use — including offering this
software (or a derivative) as part of a paid service — requires a
separate licence from the copyright holder.

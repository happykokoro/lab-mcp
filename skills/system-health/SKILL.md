---
name: system-health
description: |
  Check overall system health: service dependencies, degraded-mode detection, capacity, and mode verification.
  Triggers on: "system health", "system status", "is everything running", "service status",
  "health check", "what mode", "paper or live", "services down", "system diagnostics"
---

# System Health

Verify that all services are operational, the system is in the expected mode, metrics are within normal ranges, and no degraded conditions exist.

## Data Source Priority

1. FIRST: Use lab-mcp resources — `lab://health`, `lab://mode`, `lab://metrics`
2. THEN: Use lab-mcp tools — `get_execution_config`, `get_filter_state`
3. IF PLATFORM AVAILABLE: `system_health` (admin tool), `engine_health`
4. REFERENCE: `get_convergence_history` for recent stress events

## Service Dependency Map

```
                    Frontend (:3001)
                         |
                    Platform (:4000)  -- auth, billing, tier gates
                    /          \
              Lab (:4100)    Engine (:4200)
              /     |              |
    Wallet    Pricing       [Jupiter/Jito venues]
    Monitor   Service
    (:4001)   (:4002)
        \       /
         Redis (:6379) -- message broker
```

Critical path for Lab mode: Redis -> Wallet Monitor -> Lab -> Frontend
Critical path for Engine mode: Redis -> Lab (artifact source) -> Platform -> Engine

## Workflow

### Step 1: Gather Health Data

Call in parallel:
- Resource `lab://health` or tool fallback — Lab service health status
- Resource `lab://mode` or tool fallback — current operating mode (paper/live)
- Resource `lab://metrics` or tool fallback — performance metrics
- `get_execution_config` — execution pipeline configuration
- `get_filter_state` — filter gating status (proxy for pipeline health)

If Platform is configured, also call:
- `system_health` — full service map with connection status
- `engine_health` — Engine cluster health

### Step 2: Mode Verification

Check and report:
- **Current mode**: paper or live
- **Expected mode**: paper (default for Lab; live requires explicit confirmation)
- **Auto-execute status**: should be FALSE unless explicitly enabled
- If mode is "live" and auto_execute is true, issue a **SAFETY WARNING**

### Step 3: Service Status Assessment

For each service, determine:

| Service          | Port  | Status    | Check Method                        |
|------------------|-------|-----------|-------------------------------------|
| Lab              | 4100  | ...       | Health endpoint response             |
| Platform         | 4000  | ...       | system_health tool (if available)    |
| Wallet Monitor   | 4001  | ...       | Lab health (reports upstream deps)   |
| Pricing Service  | 4002  | ...       | Lab health / get_candles test        |
| Engine           | 4200  | ...       | engine_health (if available)         |
| Redis            | 6379  | ...       | Lab health (reports Redis status)    |
| Frontend         | 3001  | ...       | Not checkable from MCP              |

Status values: HEALTHY / DEGRADED / DOWN / UNKNOWN

### Step 4: Degraded-Mode Detection

The system can operate in degraded mode when non-critical services are down:

| Scenario                    | Impact                                    | Severity |
|-----------------------------|-------------------------------------------|----------|
| Pricing Service down        | No new price updates; stale candle data   | HIGH     |
| Wallet Monitor down         | No new swap signals; factor pipeline starved | CRITICAL |
| Redis down                  | No message flow; entire pipeline halted   | CRITICAL |
| Platform down               | No auth/billing; Lab continues standalone | MEDIUM   |
| Engine down                 | No live execution; Lab unaffected         | LOW (Lab) |
| Single factor failing       | Reduced signal diversity                  | MEDIUM   |

When services are down, report:
1. Which service is affected
2. How long it has been down (if detectable from health data)
3. What functionality is degraded
4. Whether the pipeline can still produce valid signals

### Step 5: Metric Health Ranges

Check performance metrics against expected ranges:

| Metric            | Healthy         | Warning          | Critical         |
|-------------------|-----------------|------------------|------------------|
| Win rate          | 45-70%          | 35-45% or >70%   | < 35%            |
| Sharpe ratio      | > 0.5           | 0.0-0.5          | < 0.0            |
| Max drawdown      | < 15%           | 15-25%           | > 25%            |
| Trade count/hour  | 1-20            | 0 or 20-50       | > 50 (runaway)   |
| Avg slippage      | < 50 bps        | 50-100 bps       | > 100 bps        |
| Signal rate       | 1-30 / hour     | 0 (pipeline dead) | > 100 (noise)   |

Flag any metric outside healthy range.

### Step 6: Execution Config Sanity Check

From `get_execution_config`, verify:
- Backend is correctly set (paper for Lab, venue adapter for Engine)
- Slippage model parameters are reasonable
- Position sizing limits are within risk bounds
- No configuration indicates accidental live trading in Lab mode

### Step 7: Pipeline Continuity

From `get_filter_state` gating status:
- OPEN: Pipeline flowing normally
- BLOCKED: Signals suppressed — check convergence history for cause

From `get_convergence_history`:
- Any stress events in last hour?
- Is spectral event magnitude elevated?
- How many signals were suppressed recently?

## Quality Checklist

- [ ] Operating mode verified (paper vs live)
- [ ] Auto-execute status checked (should be off unless intended)
- [ ] All reachable services status reported
- [ ] Degraded-mode conditions identified and explained
- [ ] Performance metrics checked against healthy ranges
- [ ] Execution config sanity verified
- [ ] Filter gating status checked for pipeline continuity
- [ ] Recent stress events reviewed from convergence history

## Output Format

```
## System Health Report

### Mode: [PAPER / LIVE] | Auto-Execute: [OFF / ON]
[Safety warning if live + auto-execute]

### Service Status

| Service          | Status  | Notes                    |
|------------------|---------|--------------------------|
| Lab              | ...     | ...                      |
| Redis            | ...     | ...                      |
| Wallet Monitor   | ...     | ...                      |
| Pricing Service  | ...     | ...                      |
| Platform         | ...     | ...                      |
| Engine           | ...     | ...                      |

### Pipeline Status
- Convergence gate: [OPEN / BLOCKED]
- Signal rate: [N] signals/hour
- Recent stress events: [count in last hour]

### Metric Snapshot

| Metric       | Value  | Status  |
|--------------|--------|---------|
| Win rate     | ...    | ...     |
| Sharpe       | ...    | ...     |
| Max drawdown | ...    | ...     |
| Avg slippage | ...    | ...     |

### Issues
1. [Issue description and recommended action]
2. ...

### Overall: [ALL HEALTHY / DEGRADED / CRITICAL]
```

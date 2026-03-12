---
name: portfolio-rebalance
description: |
  Analyze portfolio drift and produce a rebalancing trade plan with slippage estimation.
  Triggers on: "rebalance", "portfolio drift", "rebalancing", "position sizing",
  "over-exposed", "under-exposed", "portfolio allocation", "drift analysis"
---

# Portfolio Rebalance

Compute current portfolio allocation drift against target weights and produce a prioritized trade plan with slippage cost estimation.

## Data Source Priority

1. FIRST: Use lab-mcp tools — `get_positions`, `get_positions_summary`, `get_strategy`
2. THEN: `get_microstructure_state` for liquidity/slippage context
3. THEN: `get_execution_config` for slippage model parameters and sizing limits
4. REFERENCE: `get_signals` to check if any active signals conflict with rebalance trades

## Workflow

### Step 1: Gather Current State

Call in parallel:
- `get_positions` — all positions with entry price, current price, PnL, status
- `get_positions_summary` — total PnL, deployed SOL, open count, win rate
- `get_strategy` — target allocations, risk limits, max position sizes
- `get_microstructure_state` — current spread, depth, OFI, toxicity per token
- `get_execution_config` — slippage model, sizer strategy, thresholds

### Step 2: Build Current Allocation Table

From positions data, compute:
- Per-token current value in SOL (entry_size * current_price / entry_price, adjusted for PnL)
- Total portfolio value (sum of all position values + undeployed SOL)
- Current allocation percentage per token = position_value / total_portfolio_value * 100

### Step 3: Determine Target Allocations

From strategy config, extract:
- Target allocation per token (if explicitly configured)
- Max position size percentage (risk.max_position_pct)
- If no explicit targets, use equal-weight across tracked tokens as baseline

### Step 4: Compute Drift

For each token:

| Token | Target % | Current % | Drift (pp) | SOL Over/Under |
|-------|----------|-----------|------------|----------------|
| ...   | ...      | ...       | ...        | ...            |

Drift = Current % - Target %
SOL Over/Under = (Current % - Target %) * Total Portfolio Value / 100

Flag positions exceeding max_position_pct as **hard limit violations** (must rebalance regardless of cost).

### Step 5: Pre-Flight Safety Checks

Before generating trade recommendations, verify:

1. **Convergence gate status**: Call `get_filter_state` — if gating_status != "open", the signal pipeline is unstable. WARN that rebalancing during filter instability may lead to poor execution timing.
2. **Slippage cost vs drift benefit**: For each proposed trade, estimate slippage cost. If slippage cost > drift benefit (the SOL amount being corrected), SKIP that trade — the cure is worse than the disease.
3. **Active signal conflicts**: Call `get_signals` — if an active signal strongly opposes a rebalance trade direction, flag the conflict. Example: rebalance says sell Token X, but a Strong signal says buy Token X.

### Step 6: Generate Trade Recommendations

Prioritize trades:
1. **Hard limit violations first** — positions exceeding max_position_pct must be reduced
2. **Largest absolute drift second** — correct biggest misallocations first
3. **Sells before buys** — selling frees up capital for subsequent buys
4. **Batch small trades** — if multiple small adjustments total < minimum trade size, skip or batch them

For each trade:

| Priority | Action | Token  | SOL Amount | Est. Slippage | Liquidity | Notes |
|----------|--------|--------|------------|---------------|-----------|-------|
| 1        | SELL   | ...    | ...        | ...           | ...       | ...   |
| 2        | BUY    | ...    | ...        | ...           | ...       | ...   |

### Step 7: Estimate Slippage

Using microstructure data:
- **Spread cost**: half the bid-ask spread * trade size
- **Impact cost**: estimate from depth_score — thin books amplify impact
- **Toxicity penalty**: if toxicity > 0.5, add 20% to estimated slippage
- Total estimated slippage = spread_cost + impact_cost + toxicity_penalty

Compare against execution config's slippage thresholds. Flag trades where estimated slippage exceeds the configured acceptable limit.

### Step 8: Build Execution Plan

Produce a sequenced execution plan:

```
Execution Sequence:
1. SELL [amount] SOL of [Token A] — frees [X] SOL (est. slippage: [Y] bps)
2. SELL [amount] SOL of [Token B] — frees [X] SOL (est. slippage: [Y] bps)
3. BUY [amount] SOL of [Token C] — costs [X] SOL (est. slippage: [Y] bps)
4. BUY [amount] SOL of [Token D] — costs [X] SOL (est. slippage: [Y] bps)

Total estimated slippage cost: [Z] SOL ([W] bps of portfolio)
```

### Step 9: Before/After Comparison

| Token | Before % | After % | Target % | Residual Drift |
|-------|----------|---------|----------|----------------|
| ...   | ...      | ...     | ...      | ...            |

Show that residual drift is within acceptable tolerance (typically < 2 percentage points).

## Quality Checklist

- [ ] Current positions and values accurately computed
- [ ] Target allocations sourced from strategy config
- [ ] Drift table computed with SOL amounts
- [ ] Hard limit violations identified (exceeding max_position_pct)
- [ ] Convergence gate checked — warned if filter unstable
- [ ] Slippage cost estimated per trade using microstructure data
- [ ] Slippage cost vs drift benefit compared — uneconomical trades skipped
- [ ] Active signal conflicts flagged
- [ ] Sells prioritized before buys
- [ ] Execution plan sequenced with estimated costs
- [ ] Before/after comparison table provided

## Output Format

```
## Portfolio Rebalance Report

### Current State
- Total portfolio value: [X] SOL
- Deployed: [Y] SOL ([Z]%)
- Open positions: [N]

### Drift Analysis

| Token | Target % | Current % | Drift | SOL Over/Under | Violation |
|-------|----------|-----------|-------|----------------|-----------|
| ...   | ...      | ...       | ...   | ...            | ...       |

### Safety Checks
- Convergence gate: [OPEN / BLOCKED — warning if blocked]
- Signal conflicts: [list or "None"]

### Recommended Trades

| # | Action | Token | SOL Amount | Est. Slippage (bps) | Liquidity Score |
|---|--------|-------|------------|---------------------|-----------------|
| 1 | SELL   | ...   | ...        | ...                 | ...             |
| 2 | BUY    | ...   | ...        | ...                 | ...             |

Total slippage cost: [X] SOL ([Y] bps of portfolio)

### After Rebalance (Projected)

| Token | Before % | After % | Target % | Residual Drift |
|-------|----------|---------|----------|----------------|
| ...   | ...      | ...     | ...      | ...            |

### Recommendation
[Execute / Defer / Partial — with reasoning]
```

---
name: risk-assessment
description: |
  Assess portfolio risk: position concentration, drawdown severity, exposure limits, circuit breaker status, execution quality.
  Triggers on: "risk assessment", "risk check", "portfolio risk", "drawdown", "exposure",
  "concentration risk", "circuit breaker", "position limits", "risk report", "am I overexposed",
  "how much risk"
---

# Risk Assessment

Evaluate current portfolio risk across multiple dimensions: position concentration, drawdown severity, exposure limits, circuit breaker proximity, and execution quality degradation.

## Data Source Priority

1. FIRST: Use lab-mcp tools — `get_positions`, `get_positions_summary`, `get_execution_history`
2. THEN: `get_strategy` for risk limits, `get_execution_config` for execution constraints
3. THEN: `get_equity_curve` for drawdown trajectory, `get_microstructure_state` for liquidity risk
4. REFERENCE: `get_metrics` for aggregate performance context

## Workflow

### Step 1: Gather Risk Data

Call in parallel:
- `get_positions` — all positions with entry price, current price, PnL, status, size
- `get_positions_summary` — total PnL, deployed SOL, open count, win rate
- `get_equity_curve` — timestamped equity and drawdown series
- `get_execution_history({ limit: 50 })` — recent execution quality data
- `get_strategy` — risk limits (max_position_pct, max_drawdown_pct, daily_loss_limit)
- `get_metrics` — aggregate performance (Sharpe, win rate, trade count)
- `get_microstructure_state` — liquidity conditions per token

### Step 2: Position Concentration Analysis

For each open position, compute:
- Position value as percentage of total portfolio
- Compare against `risk.max_position_pct` from strategy config

Build a concentration table:

| Token | Position Size (SOL) | Portfolio % | Limit % | Headroom | Status      |
|-------|---------------------|-------------|---------|----------|-------------|
| ...   | ...                 | ...         | ...     | ...      | ...         |

**Concentration risk levels**:
- < 50% of limit: LOW — healthy headroom
- 50-80% of limit: MODERATE — approaching limit
- 80-100% of limit: HIGH — near limit, no room for averaging
- \> 100% of limit: VIOLATION — must reduce position

Also compute:
- **Herfindahl-Hirschman Index (HHI)**: Sum of squared position weights
  - HHI < 0.15: Well diversified
  - HHI 0.15-0.25: Moderately concentrated
  - HHI > 0.25: Highly concentrated
- **Largest position %**: Single biggest exposure
- **Top 3 positions %**: Combined weight of top 3

### Step 3: Drawdown Severity Assessment

From `get_equity_curve`, compute:
- Current drawdown from peak equity
- Maximum drawdown during session
- Drawdown duration (time since peak)

Apply severity levels relative to `risk.max_drawdown_pct`:

| Level          | Condition                          | Action Required              |
|----------------|------------------------------------|-----------------------------|
| **Green**      | Current DD < 50% of max allowed    | Normal operation            |
| **Yellow**     | Current DD = 50-75% of max allowed | Reduce new position sizes   |
| **Red**        | Current DD = 75-100% of max allowed| Stop new entries, manage existing |
| **Circuit Break** | Current DD > 100% of max allowed | Halt all trading immediately |

Example: If max_drawdown_pct = 0.20 (20%):
- Green: DD < 10%
- Yellow: DD 10-15%
- Red: DD 15-20%
- Circuit Break: DD > 20%

### Step 4: Exposure Limit Checks

Aggregate exposure checks:

| Metric                | Current | Limit   | Usage % | Status  |
|-----------------------|---------|---------|---------|---------|
| Total deployed SOL    | ...     | ...     | ...     | ...     |
| Max single position   | ...     | ...     | ...     | ...     |
| Current drawdown      | ...     | ...     | ...     | ...     |
| Daily realized loss   | ...     | ...     | ...     | ...     |
| Open position count   | ...     | ...     | ...     | ...     |

For each metric, if usage > 80%: WARNING. If usage > 100%: VIOLATION.

### Step 5: Circuit Breaker Status

Check all circuit breaker conditions:

| Breaker              | Threshold          | Current Value | Triggered? |
|----------------------|--------------------|---------------|------------|
| Max drawdown         | [from strategy]    | ...           | ...        |
| Daily loss limit     | [from strategy]    | ...           | ...        |
| Consecutive losses   | [from strategy]    | ...           | ...        |
| Max open positions   | [from strategy]    | ...           | ...        |

If any breaker is triggered or within 10% of triggering, flag prominently.

### Step 6: Execution Quality Degradation

From `get_execution_history`, analyze recent trades:

| Metric              | Recent (last 10) | Session Avg | Trend     | Concern? |
|---------------------|-------------------|-------------|-----------|----------|
| Avg slippage (bps)  | ...               | ...         | ...       | ...      |
| Fill rate           | ...               | ...         | ...       | ...      |
| Avg latency (ms)    | ...               | ...         | ...       | ...      |
| Rejection rate      | ...               | ...         | ...       | ...      |

**Execution degradation signals**:
- Slippage increasing over time: liquidity thinning or position sizes too large
- Fill rate declining: market moving away, may need to adjust limit approach
- Latency increasing: service degradation or network issues
- Rejection rate > 5%: execution pipeline problems

### Step 7: Liquidity Risk

Cross-reference position sizes with microstructure data:

For each open position:
- Can the position be exited at current microstructure depth?
- Estimated slippage to fully exit the position
- Time to exit at sustainable rate (without excessive market impact)

| Token | Position (SOL) | Depth Score | Est. Exit Slippage | Exit Time | Risk |
|-------|----------------|-------------|--------------------|-----------|----- |
| ...   | ...            | ...         | ...                | ...       | ...  |

**Liquidity risk levels**:
- Depth Score > 0.7 AND exit slippage < 50 bps: LOW
- Depth Score 0.4-0.7 OR exit slippage 50-150 bps: MODERATE
- Depth Score < 0.4 OR exit slippage > 150 bps: HIGH (may be stuck in position)

### Step 8: Correlated Risk

Check if open positions are correlated:
- Multiple tokens in same sector/narrative have correlated risk
- If all positions move together, effective diversification is lower than position count suggests
- A broad market downturn would hit all positions simultaneously

### Step 9: Risk Score Summary

Compute an overall risk score:

| Component          | Weight | Score (0-100) | Weighted Score |
|--------------------|--------|---------------|----------------|
| Concentration      | 25%    | ...           | ...            |
| Drawdown severity  | 30%    | ...           | ...            |
| Exposure limits    | 20%    | ...           | ...            |
| Execution quality  | 15%    | ...           | ...            |
| Liquidity risk     | 10%    | ...           | ...            |
| **Total**          | 100%   | ...           | ...            |

Score interpretation:
- 0-30: LOW RISK — healthy portfolio, normal operations
- 30-60: MODERATE RISK — some concerns, reduce new entries
- 60-80: HIGH RISK — significant concerns, manage existing positions
- 80-100: CRITICAL RISK — immediate action required

## Quality Checklist

- [ ] All positions enumerated with size and portfolio percentage
- [ ] Concentration metrics computed (HHI, largest position, top 3)
- [ ] Drawdown severity classified (Green/Yellow/Red/Circuit Break)
- [ ] All exposure limits checked with usage percentages
- [ ] Circuit breaker proximity assessed for each breaker type
- [ ] Execution quality trend analyzed (slippage, fill rate, latency)
- [ ] Liquidity risk per position assessed (depth, exit slippage)
- [ ] Correlated risk considered
- [ ] Overall risk score computed
- [ ] Specific action items provided for any elevated risks

## Output Format

```
## Risk Assessment Report

### Overall Risk: [LOW / MODERATE / HIGH / CRITICAL] (Score: [X]/100)

### Drawdown Status: [GREEN / YELLOW / RED / CIRCUIT BREAK]
- Current drawdown: [X]% (limit: [Y]%)
- Peak equity: [amount] SOL
- Current equity: [amount] SOL
- Duration: [time since peak]

### Position Concentration

| Token | Size (SOL) | Portfolio % | Limit % | Status      |
|-------|------------|-------------|---------|-------------|
| ...   | ...        | ...         | ...     | ...         |

- HHI: [value] — [Well diversified / Moderately concentrated / Highly concentrated]
- Largest position: [token] at [X]%

### Exposure Limits

| Metric            | Current | Limit | Usage % | Status    |
|-------------------|---------|-------|---------|-----------|
| ...               | ...     | ...   | ...     | ...       |

### Circuit Breakers
- [breaker name]: [status] ([current] / [threshold])
- ...

### Execution Quality
- Recent slippage: [X] bps (session avg: [Y] bps) — [Stable / Degrading]
- Fill rate: [X]% — [Healthy / Degrading]

### Liquidity Risk

| Token | Depth Score | Est. Exit Slippage | Risk Level |
|-------|-------------|--------------------|-----------  |
| ...   | ...         | ...                | ...         |

### Action Items
1. **[URGENT/IMPORTANT/MONITOR]**: [specific action]
2. ...
```

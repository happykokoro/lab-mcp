---
name: parameter-sensitivity
description: |
  Run parameter sensitivity analysis: sweep key parameters across value ranges and assess impact on performance.
  Triggers on: "parameter sensitivity", "sensitivity analysis", "parameter sweep", "what if",
  "optimize parameters", "tune parameters", "parameter impact", "best gamma",
  "optimal threshold", "parameter grid"
---

# Parameter Sensitivity

Sweep key strategy and execution parameters across defined value ranges, run backtests for each value, and produce a sensitivity matrix showing how each parameter affects performance metrics.

## Data Source Priority

1. FIRST: Use lab-mcp tools — `run_backtest`, `get_strategy`, `get_execution_config`
2. THEN: `list_backtest_scenarios` for available test scenarios
3. REFERENCE: `get_factors` for current parameter values as baseline

## Common Parameters to Sweep

### Signal & Composition Parameters

| Parameter                  | Typical Range   | Step   | What It Controls                          |
|----------------------------|-----------------|--------|-------------------------------------------|
| confidence_threshold       | 0.20 - 0.70    | 0.05   | Minimum confidence to generate signals    |
| composition.min_agreement  | 1 - 4          | 1      | Minimum factor agreement for composition  |
| filter.gamma               | 0.05 - 0.50    | 0.05   | H-infinity filter robustness parameter    |

### Risk Parameters

| Parameter                  | Typical Range   | Step   | What It Controls                          |
|----------------------------|-----------------|--------|-------------------------------------------|
| risk.max_position_pct      | 0.05 - 0.30    | 0.05   | Maximum portfolio allocation per position |
| risk.max_drawdown_pct      | 0.05 - 0.25    | 0.05   | Circuit breaker drawdown threshold        |
| risk.daily_loss_limit      | 0.02 - 0.10    | 0.01   | Daily loss limit before halting           |

### Execution Parameters

| Parameter                  | Typical Range   | Step   | What It Controls                          |
|----------------------------|-----------------|--------|-------------------------------------------|
| execution.slippage_limit   | 10 - 200 bps   | 20     | Maximum acceptable slippage               |
| execution.min_trade_size   | 0.01 - 0.50    | 0.05   | Minimum trade size in SOL                 |

## Workflow

### Step 1: Establish Baseline

1. Call `get_strategy` and `get_execution_config` to capture current parameter values
2. Select a backtest scenario for consistency:
   - Call `list_backtest_scenarios` to see available scenarios
   - Prefer 'sideways' scenario for general tuning (most common market condition)
   - Use 'crash' scenario for risk parameter tuning
   - Use 'ramp' scenario for signal capture tuning
3. Run baseline backtest with current parameters:
   - `run_backtest({ scenario: "sideways" })` (or user-specified scenario)
   - Record baseline metrics: PnL, win rate, max drawdown, Sharpe, trade count

### Step 2: Define Sweep Parameters

The user may specify which parameter to sweep. If not specified, default to the most impactful parameters:

1. **confidence_threshold** (highest impact on signal selectivity)
2. **risk.max_position_pct** (highest impact on risk/reward tradeoff)
3. **filter.gamma** (highest impact on signal quality)

For each parameter, define:
- Value range (use the typical ranges above, or user-specified)
- Step size (5-10 values per sweep for practical runtime)

### Step 3: Run Parameter Sweep

For each parameter value in the sweep range:
1. Note the parameter value being tested
2. Call `run_backtest` with the scenario
3. Record key metrics from the backtest result

**Important**: The backtest tool runs the full factor pipeline with the current strategy. Parameter changes between runs may need to be applied via `reload_strategy` if the backtest does not accept parameter overrides directly. If direct override is not supported, document the limitation and recommend manual iteration.

### Step 4: Build Sensitivity Matrix

Organize results into a grid:

```
Parameter: confidence_threshold
Scenario: sideways (120 steps)

| Value | PnL (SOL) | Win Rate | Max DD  | Sharpe | Trades | Notes     |
|-------|-----------|----------|---------|--------|--------|-----------|
| 0.20  | ...       | ...      | ...     | ...    | ...    | Baseline  |
| 0.25  | ...       | ...      | ...     | ...    | ...    |           |
| 0.30  | ...       | ...      | ...     | ...    | ...    |           |
| ...   | ...       | ...      | ...     | ...    | ...    |           |
```

### Step 5: Identify Optimal Region

From the sensitivity matrix:

1. **Monotonic relationship**: If metric improves consistently as parameter increases, the optimal is at the boundary — but check for overfitting
2. **Peak/valley**: If metric has a clear optimum (e.g., PnL peaks at 0.40 threshold), that is the optimal region
3. **Plateau**: If metric is stable across a range (e.g., win rate constant from 0.30-0.50), any value in that range works — prefer the center of the plateau for robustness
4. **Tradeoff**: If optimizing one metric degrades another (e.g., higher threshold improves win rate but reduces trade count), identify the Pareto frontier

### Step 6: Multi-Dimensional Analysis

If sweeping multiple parameters, look for interactions:
- Does the optimal confidence_threshold change when max_position_pct changes?
- Are there parameter combinations that are particularly good or bad?
- Present as a 2D grid if two parameters are swept simultaneously

### Step 7: Cross-Scenario Validation

The optimal parameter may differ by market regime:

| Parameter Value | Sideways PnL | Crash PnL | Ramp PnL | Robust? |
|-----------------|-------------|-----------|----------|---------|
| 0.30            | ...         | ...       | ...      | ...     |
| 0.40            | ...         | ...       | ...      | ...     |
| 0.50            | ...         | ...       | ...      | ...     |

A robust parameter value performs reasonably well across all scenarios, not just the best in one.

### Step 8: Recommendation

Based on the sensitivity analysis:
1. State the current parameter value
2. State the recommended value (with uncertainty range)
3. Explain the expected impact: "Changing X from A to B is expected to improve Y by Z%"
4. Flag any tradeoffs: "This improves win rate but reduces trade frequency by N%"
5. Recommend cross-scenario validation if only one scenario was tested

## Quality Checklist

- [ ] Baseline performance captured with current parameters
- [ ] Parameter sweep range is reasonable (not too narrow or too wide)
- [ ] Sufficient granularity (at least 5 values per parameter)
- [ ] All key metrics recorded per sweep value (PnL, win rate, drawdown, Sharpe, trades)
- [ ] Optimal region identified with reasoning (peak, plateau, or boundary)
- [ ] Tradeoffs between metrics explicitly documented
- [ ] Cross-scenario robustness considered
- [ ] Specific recommendation with expected impact provided

## Output Format

```
## Parameter Sensitivity Report

### Baseline
- Parameter: [name] = [current value]
- Scenario: [name] ([steps] steps)
- Baseline metrics: PnL [X], Win Rate [Y]%, Max DD [Z]%, Sharpe [W], Trades [N]

### Sensitivity Matrix

| [Parameter] | PnL (SOL) | Win Rate | Max DD  | Sharpe | Trades |
|-------------|-----------|----------|---------|--------|--------|
| [value 1]   | ...       | ...      | ...     | ...    | ...    |
| [value 2]   | ...       | ...      | ...     | ...    | ...    |
| ...         | ...       | ...      | ...     | ...    | ...    |

### Analysis
- Relationship type: [Monotonic / Peak / Plateau / Complex]
- Optimal region: [value or range]
- Key tradeoff: [description]

### Recommendation
- Current: [parameter] = [current]
- Recommended: [parameter] = [recommended] (range: [low]-[high])
- Expected impact: [description]
- Confidence: [High / Medium / Low] — [reasoning]

### Cross-Scenario Robustness
[If tested across scenarios, show comparison table; otherwise note this as a follow-up]
```

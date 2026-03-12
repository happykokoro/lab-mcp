---
name: factor-audit
description: |
  Audit factor pipeline health: per-factor accuracy, win rate trends, correlation risk, and weight recommendations.
  Triggers on: "factor audit", "factor health", "factor performance", "which factors are working",
  "factor accuracy", "win rate", "factor weights", "underperforming factors", "factor review"
---

# Factor Audit

Comprehensive assessment of every factor in the pipeline — accuracy, win rate trends, consecutive loss detection, correlation risk, and weight adjustment recommendations.

## Data Source Priority

1. FIRST: Use lab-mcp tools — `get_factors`, `get_factor_scorecard`, `get_factor_accuracy`, `get_correlation`, `get_expert_weights`
2. THEN: `get_prediction_results` for cross-factor prediction comparison
3. REFERENCE: `get_strategy` for configured roles and weights

## Workflow

### Step 1: Gather Factor Data

Call in parallel:
- `get_factors` — all factors with enabled status, role, weight, current signal
- `get_expert_weights` — the expert aggregator's learned trust weights
- `get_correlation` — pairwise factor correlation matrix
- `get_prediction_results` — per-factor prediction accuracy (MAE, RMSE, directional accuracy)

### Step 2: Deep-Dive Each Factor

For every enabled factor, call:
- `get_factor_scorecard(factor_name)` — win rate, PnL, signal count, consecutive losses
- `get_factor_accuracy(factor_name)` — per-horizon prediction accuracy, calibration

Build a factor health table:

| Factor | Role | Weight | Expert Weight | Win Rate | Consec. Losses | MAE | Dir. Accuracy | Status |
|--------|------|--------|---------------|----------|----------------|-----|---------------|--------|
| ...    | ...  | ...    | ...           | ...      | ...            | ... | ...           | ...    |

### Step 3: Apply Performance Thresholds

| Metric              | Healthy       | Warning        | Critical        |
|---------------------|---------------|----------------|-----------------|
| Win rate            | >= 50%        | 45-50%         | < 45%           |
| Consecutive losses  | 0-2           | 3-5            | > 5             |
| Directional accuracy| >= 55%        | 50-55%         | < 50%           |
| MAE (normalized)    | < 0.02        | 0.02-0.05      | > 0.05          |
| RMSE (normalized)   | < 0.03        | 0.03-0.07      | > 0.07          |
| Calibration error   | < 0.10        | 0.10-0.20      | > 0.20          |

Mark each factor as Healthy / Warning / Critical based on its worst metric.

### Step 4: Correlation Risk Analysis

From the correlation matrix:
1. Identify all factor pairs with |correlation| > 0.7 — these are **redundancy risks**
2. Identify all factor pairs with |correlation| > 0.85 — these are **high redundancy** (strongly consider removing one)
3. For each redundant pair, recommend keeping the factor with:
   - Higher win rate
   - Lower consecutive losses
   - Higher expert weight (the system trusts it more)
4. Negative correlation between factors in different roles (Primary vs Filter) is actually healthy

Build a redundancy alert table:

| Factor A | Factor B | Correlation | Recommendation |
|----------|----------|-------------|----------------|
| ...      | ...      | ...         | ...            |

### Step 5: Weight vs Performance Analysis

Compare configured weight against actual performance:
1. If a factor's win rate is top-quartile but its weight is bottom-quartile, it may be underweighted
2. If a factor's win rate is bottom-quartile but its weight is top-quartile, it may be overweighted
3. Compare configured weight to expert aggregator weight — large discrepancies indicate the system has learned something the config hasn't captured

### Step 6: Weight Adjustment Recommendations

Apply these rules:

| Condition | Recommendation |
|-----------|---------------|
| Win rate < 45% AND consec. losses > 5 | **Disable factor** — sustained underperformance |
| Win rate < 45% AND consec. losses <= 5 | **Reduce weight by 50%** — underperforming but may recover |
| Win rate 45-50% AND expert weight < config weight * 0.5 | **Reduce weight to match expert** — system has lost trust |
| Win rate >= 55% AND expert weight > config weight * 1.5 | **Increase weight toward expert** — system trusts it more than config |
| Correlation > 0.7 with same-role factor | **Disable weaker factor** — redundant signal source |
| Correlation > 0.7 with different-role factor | **Monitor** — cross-role correlation less harmful |
| Factor disabled but expert weight > 0.1 | **Consider re-enabling** — system still trusts it |

### Step 7: Trend Assessment

For factors with scorecard data over time:
- Win rate trending up over last 20 signals: factor is improving, consider weight increase
- Win rate trending down over last 20 signals: factor is degrading, consider weight decrease
- Consecutive losses increasing: factor may be experiencing regime mismatch

## Quality Checklist

- [ ] Every enabled factor has scorecard and accuracy data retrieved
- [ ] Performance thresholds applied to each factor
- [ ] Correlation matrix analyzed for redundancy risks (>0.7 threshold)
- [ ] Expert weight vs configured weight compared for each factor
- [ ] Specific weight adjustment recommendations provided with reasoning
- [ ] Consecutive loss streaks identified and flagged
- [ ] Role distribution assessed (sufficient Primary, Confirmation, Filter coverage)
- [ ] Trend direction noted for each factor

## Output Format

```
## Factor Audit Report

### Pipeline Summary
- Total factors: [N] enabled / [M] configured
- Healthy: [count] | Warning: [count] | Critical: [count]
- Role distribution: [N] Primary, [N] Confirmation, [N] Filter, [N] Observer

### Factor Health Table

| Factor | Role | Status | Win Rate | Consec. Losses | Dir. Accuracy | Expert Trust |
|--------|------|--------|----------|----------------|---------------|--------------|
| ...    | ...  | ...    | ...      | ...            | ...           | ...          |

### Correlation Risks

| Factor A | Factor B | Correlation | Action Required |
|----------|----------|-------------|-----------------|
| ...      | ...      | ...         | ...             |

### Weight Adjustment Recommendations

1. **[factor-name]**: [action] — [reasoning]
2. ...

### Summary
[1-3 sentence overall assessment with most urgent action item]
```

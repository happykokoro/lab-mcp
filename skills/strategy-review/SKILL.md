---
name: strategy-review
description: |
  Review strategy composition: role balance, redundancy detection, factor weight optimization, and composition quality.
  Triggers on: "strategy review", "review strategy", "strategy health", "factor roles",
  "composition quality", "strategy optimization", "role balance", "too many factors",
  "strategy configuration", "improve strategy"
---

# Strategy Review

Evaluate the active trading strategy's structure: role distribution balance, factor redundancy via correlation, composition optimization opportunities, and weight-vs-performance alignment.

## Data Source Priority

1. FIRST: Use lab-mcp tools — `get_strategy`, `get_factors`, `get_correlation`, `get_prediction_results`
2. THEN: `get_expert_weights` for learned trust comparison
3. THEN: `get_factor_scorecard` for individual factor deep-dives (only for flagged factors)
4. REFERENCE: `get_signals` to see current composition output

## Workflow

### Step 1: Gather Strategy Data

Call in parallel:
- `get_strategy` — full strategy configuration (factors, roles, weights, risk limits, composition settings)
- `get_factors` — all factors with enabled status, role, weight, win rate, current signal
- `get_correlation` — pairwise factor correlation matrix
- `get_prediction_results` — per-factor prediction accuracy
- `get_expert_weights` — system-learned trust weights

### Step 2: Role Distribution Analysis

The factor pipeline uses four roles in a composition hierarchy:

| Role         | Purpose                                | Ideal Count |
|--------------|----------------------------------------|-------------|
| Primary      | Core directional signal generators     | 1-2         |
| Confirmation | Independent validation of Primary      | 2-3         |
| Filter       | Veto/gate signals on quality criteria  | 1-2         |
| Observer     | Informational, no composition impact   | 0-3         |

Count factors by role and assess:

| Assessment       | Condition                                             |
|------------------|-------------------------------------------------------|
| Well-balanced    | Meets ideal count for all roles                       |
| Primary-heavy    | 3+ Primary factors — risk of over-fitting to one thesis |
| Under-confirmed  | 0-1 Confirmation factors — signals lack validation    |
| Over-filtered    | 3+ Filter factors — too many veto points, low signal rate |
| No filters       | 0 Filter factors — no quality gating, risky           |

### Step 3: Redundancy Detection via Correlation

From the correlation matrix, identify redundant factors within the same role:

**Same-role correlation > 0.7**: These factors are providing largely the same information. Having both provides false diversity — the composition thinks it has multiple confirmations, but they are essentially one signal.

For each redundant pair:
1. Compare win rates — keep the better performer
2. Compare expert weights — keep the one the system trusts more
3. Compare signal frequency — keep the one that signals more often (more data)
4. If both are similar, keep the one with lower correlation to other factors (more independent)

**Cross-role correlation**:
- Primary + Confirmation correlation > 0.7: Confirmation is not truly independent — replace or remove
- Primary + Filter correlation: Any level is acceptable (filters serve a different purpose)
- Negative correlation between Primary and Filter: Actually desirable (filter catches Primary errors)

### Step 4: Composition Optimization

Analyze the current composition behavior:

1. **Signal pass rate**: What percentage of raw factor signals survive composition?
   - < 10%: Over-filtered — too many blocking conditions
   - 10-30%: Healthy — selective but not paralyzed
   - > 50%: Under-filtered — most signals pass, risk of noise trading

2. **Composition agreement depth**: When a signal passes composition, how many factors agree?
   - Average agreement of 1-2 factors: Weak consensus (fragile signals)
   - Average agreement of 3-4 factors: Strong consensus (robust signals)
   - Average agreement = total factors: Suspicious — factors may be too correlated

3. **Filter block rate**: What percentage of signals do filters block?
   - < 5%: Filters are too lenient
   - 5-20%: Healthy
   - > 40%: Filters are too aggressive

### Step 5: Weight vs Performance Analysis

For each factor, compare:

| Factor | Role | Config Weight | Expert Weight | Win Rate | Dir. Accuracy | Assessment |
|--------|------|---------------|---------------|----------|---------------|------------|
| ...    | ...  | ...           | ...           | ...      | ...           | ...        |

**Assessment logic**:
- Config weight >> Expert weight AND low win rate: **Overweighted** — reduce
- Config weight << Expert weight AND high win rate: **Underweighted** — increase
- Config weight ~ Expert weight: **Well-calibrated**
- Expert weight near 0 for enabled factor: **System has lost trust** — investigate or disable

### Step 6: Strategy Coherence Check

Verify the strategy makes structural sense:

1. **Thesis clarity**: Do Primary factors measure related phenomena, or unrelated ones?
   - Related (e.g., two momentum factors): Strong thesis but redundancy risk
   - Complementary (e.g., momentum + order flow): Diverse thesis, ideal

2. **Confirmation independence**: Are Confirmation factors truly independent from Primary?
   - Check correlation < 0.5 between each Confirmation and each Primary
   - Confirmation should use different data sources or methodologies

3. **Filter relevance**: Do Filter factors catch meaningful risk?
   - Filters should have measurable impact on portfolio risk metrics
   - A filter that never blocks is wasted; a filter that always blocks is broken

4. **Observer value**: Are Observer factors providing useful context?
   - Observers that never produce signals can be removed
   - Observers with high prediction accuracy might deserve promotion to Confirmation

### Step 7: Recommendations

Based on analysis, produce prioritized recommendations:

| Priority | Category    | Recommendation                          | Expected Impact |
|----------|-------------|-----------------------------------------|-----------------|
| 1        | ...         | ...                                     | ...             |
| 2        | ...         | ...                                     | ...             |

Common recommendation types:
- Promote Observer to Confirmation (high accuracy)
- Demote Confirmation to Observer (low accuracy or high correlation with Primary)
- Remove redundant factor (high same-role correlation)
- Add factor to fill role gap (e.g., no Filter factors)
- Adjust weight to match expert learning
- Disable chronically underperforming factor

## Quality Checklist

- [ ] Role distribution counted and assessed against ideal ranges
- [ ] Same-role correlation checked for redundancy (>0.7 threshold)
- [ ] Cross-role correlation checked (especially Primary-Confirmation independence)
- [ ] Signal pass rate, agreement depth, and filter block rate analyzed
- [ ] Config weight vs expert weight compared for each factor
- [ ] Strategy coherence verified (thesis, independence, filter relevance)
- [ ] Specific prioritized recommendations provided
- [ ] No recommendation breaks safety rules (e.g., removing all filters)

## Output Format

```
## Strategy Review Report

### Role Distribution

| Role         | Count | Ideal | Factors                  | Assessment     |
|--------------|-------|-------|--------------------------|----------------|
| Primary      | ...   | 1-2   | ...                      | ...            |
| Confirmation | ...   | 2-3   | ...                      | ...            |
| Filter       | ...   | 1-2   | ...                      | ...            |
| Observer     | ...   | 0-3   | ...                      | ...            |

**Balance**: [Well-balanced / Primary-heavy / Under-confirmed / Over-filtered]

### Redundancy Alerts

| Factor A | Factor B | Role     | Correlation | Recommendation         |
|----------|----------|----------|-------------|------------------------|
| ...      | ...      | ...      | ...         | ...                    |

### Weight Alignment

| Factor | Config Wt | Expert Wt | Win Rate | Assessment      |
|--------|-----------|-----------|----------|-----------------|
| ...    | ...       | ...       | ...      | ...             |

### Composition Quality
- Signal pass rate: [X]% — [assessment]
- Average agreement depth: [N] factors — [assessment]
- Filter block rate: [Y]% — [assessment]

### Recommendations
1. **[Priority 1]**: [action] — [reasoning and expected impact]
2. **[Priority 2]**: [action] — [reasoning and expected impact]
3. ...

### Overall Strategy Health: [Strong / Adequate / Needs Improvement]
```

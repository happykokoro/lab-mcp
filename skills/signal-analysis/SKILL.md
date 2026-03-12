---
name: signal-analysis
description: |
  Assess current trading signal quality, factor agreement, confidence reliability, and actionability.
  Triggers on: "signal quality", "analyze signals", "signal actionability", "are signals good",
  "should I trade", "factor agreement", "signal strength"
---

# Signal Analysis

Evaluate active trading signals for actionability by examining factor agreement, confidence quality, and red flags.

## Data Source Priority

1. FIRST: Use lab-mcp tools — `get_signals`, `get_factors`, `get_confidence`
2. THEN: Use `get_microstructure_state` for liquidity context and `get_filter_state` for gating status
3. ONLY IF NEEDED: `get_traces` to examine recent decision audit trails

## Workflow

### Step 1: Gather Signal Data

Call these tools in parallel:
- `get_signals` — all active factor signals with direction, confidence, token, metadata
- `get_factors` — all configured factors with enabled status, role, weight, win rate
- `get_confidence` — the 11-component confidence breakdown

### Step 2: Classify Each Signal by Strength

Apply this scoring rubric to each signal:

| Rating     | Confidence | Factor Agreement        | Additional Criteria                         |
|------------|------------|-------------------------|---------------------------------------------|
| **Strong** | > 0.70     | 3+ factors aligned      | Convergence gate open, no filter blocks     |
| Moderate   | 0.40-0.70  | 2 factors aligned       | At most 1 minor filter warning              |
| Weak       | < 0.40     | 0-1 factors aligned     | Or any filter block / convergence gate shut  |

Factor agreement means: Primary and Confirmation factors produce signals in the same direction. Filter factors must not be blocking. Observer factors are informational and do not count toward agreement.

### Step 3: Assess Factor Agreement

For each signal's token:
1. Identify which factors produced a signal (check `factors` response for `last_signal`)
2. Group by role: Primary, Confirmation, Filter, Observer
3. Check directional alignment:
   - All Primary factors should agree on direction
   - At least 1 Confirmation factor should match Primary direction
   - Filter factors should not be in "block" state
4. Note any Observer signals that contradict the consensus (informational, but worth flagging)

### Step 4: Evaluate Confidence Quality

From the 11-component confidence breakdown, check:
- **Innovation quality** (>0.6 = healthy) — measures filter prediction residual behavior
- **Velocity freshness** (>0.5) — recent price movement data available
- **Filter agreement** (>0.7) — fast/medium/slow layers converging
- **Prediction confidence** (>0.5) — multi-horizon predictions agree
- **Microstructure quality** (>0.4) — sufficient liquidity and low toxicity

Flag any component below its threshold as a confidence weakness.

### Step 5: Red Flags Taxonomy

Check for these red flags and report any found:

| Red Flag                              | Severity | Detection                                           |
|---------------------------------------|----------|-----------------------------------------------------|
| Convergence gate blocked              | CRITICAL | `get_filter_state` shows gating_status != "open"    |
| Whale signals opposing                | HIGH     | Microstructure whale_direction opposes signal        |
| High correlation between agreeing factors | MEDIUM | Factors agreeing but correlation > 0.7 (false diversity) |
| Innovation sequence autocorrelation   | MEDIUM   | Innovation stats show autocorrelation > 0.3         |
| Single-factor confidence              | LOW      | Only 1 factor producing signal, others silent       |
| Stale price data                      | HIGH     | Velocity freshness component < 0.3                  |
| Low liquidity environment             | MEDIUM   | Microstructure depth_score < 0.3                    |

### Step 6: Produce Actionability Verdict

For each signal, output:
1. **Direction**: Long / Short / No Trade
2. **Strength**: Strong / Moderate / Weak
3. **Confidence**: numerical score + quality assessment
4. **Factor support**: list of agreeing factors by role
5. **Red flags**: any active warnings
6. **Recommendation**: Trade / Wait / Avoid (with reasoning)

## Quality Checklist

- [ ] All three primary data sources called (signals, factors, confidence)
- [ ] Each signal classified by the scoring rubric
- [ ] Factor roles correctly mapped (Primary vs Confirmation vs Filter)
- [ ] Directional agreement explicitly checked
- [ ] Confidence components individually evaluated against thresholds
- [ ] Red flags taxonomy fully scanned
- [ ] Convergence gate status verified
- [ ] Final actionability verdict provided per signal

## Output Format

```
## Signal Analysis Report

### [Token Symbol] — [Direction] — [Strength Rating]

**Confidence**: [score] ([quality assessment])
**Factor Agreement**: [N] of [M] factors aligned

| Factor | Role | Direction | Weight | Win Rate |
|--------|------|-----------|--------|----------|
| ...    | ...  | ...       | ...    | ...      |

**Red Flags**: [list or "None detected"]

**Verdict**: [Trade / Wait / Avoid] — [reasoning]

---
(repeat for each active signal)
```

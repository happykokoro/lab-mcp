---
name: confidence-audit
description: |
  Audit the 11-component confidence breakdown to assess signal reliability and identify weak components.
  Triggers on: "confidence audit", "confidence breakdown", "confidence quality", "trust signal",
  "confidence components", "why is confidence low", "confidence score"
---

# Confidence Audit

Evaluate the 11-component confidence score that determines whether trading signals are trustworthy enough for execution.

## Data Source Priority

1. FIRST: Use lab-mcp tools — `get_confidence`, `get_filter_state`, `get_microstructure_state`
2. THEN: `get_prediction_diagnostics` for prediction-related component validation
3. REFERENCE: `get_signals` to see how confidence affects current signal output

## Background: Confidence Architecture

The confidence score is a weighted combination of 11 components, each measuring a different aspect of signal quality. The composite score ranges from 0.0 (no confidence) to 1.0 (maximum confidence). Trading decisions require confidence above a configurable threshold (typically 0.35-0.50).

## Workflow

### Step 1: Gather Confidence Data

Call in parallel:
- `get_confidence` — the full 11-component breakdown with individual scores
- `get_filter_state` — H-infinity filter internals (feeds several confidence components)
- `get_microstructure_state` — market quality data (feeds microstructure components)

### Step 2: Component-by-Component Assessment

Evaluate each of the 11 components against its reliability threshold:

| # | Component               | Threshold | Weight | What It Measures                              |
|---|-------------------------|-----------|--------|-----------------------------------------------|
| 1 | Innovation quality      | > 0.60    | High   | Filter prediction residuals are well-behaved  |
| 2 | Velocity freshness      | > 0.50    | High   | Recent price data available, not stale        |
| 3 | Filter agreement        | > 0.70    | High   | Fast/medium/slow layers agree on direction    |
| 4 | Prediction confidence   | > 0.50    | Medium | Multi-horizon predictions are consistent      |
| 5 | Prediction calibration  | > 0.40    | Medium | Predicted vs actual accuracy is acceptable    |
| 6 | Microstructure quality  | > 0.40    | Medium | Spread, depth, toxicity within norms          |
| 7 | Data recency            | > 0.60    | High   | Input data streams are current                |
| 8 | Convergence health      | > 0.50    | High   | P-matrix trace stable or decreasing           |
| 9 | Direction stability     | > 0.40    | Medium | Signal direction not flip-flopping            |
| 10| Volume adequacy         | > 0.30    | Low    | Sufficient trading volume for execution       |
| 11| Cross-factor agreement  | > 0.50    | Medium | Multiple independent factors agree            |

For each component, classify:
- **Strong** (>= threshold + 0.15): Contributing positively to confidence
- **Adequate** (>= threshold): Meeting minimum standard
- **Weak** (< threshold): Dragging confidence down — investigate
- **Critical** (< threshold - 0.15): Severely undermining confidence — likely blocking trades

### Step 3: Identify Dominant Components

The composite confidence score is not a simple average. Identify:
1. **Top 3 contributors**: Components scoring highest above their thresholds
2. **Bottom 3 detractors**: Components scoring lowest relative to their thresholds
3. **Bottleneck component**: The single weakest component (often determines overall score)

If the bottleneck component is a High-weight component, it likely dominates the final score.

### Step 4: Filter Health Impact

Cross-reference with `get_filter_state`:
- If innovation quality is low, check filter innovation stats for autocorrelation
- If filter agreement is low, compare fast/medium/slow layer directions
- If convergence health is low, check P-matrix trace trends across layers

Map filter problems to confidence components:

| Filter Issue                | Affected Components              |
|-----------------------------|----------------------------------|
| Diverging P-matrix          | Convergence health, Innovation   |
| Layer disagreement          | Filter agreement, Direction      |
| High innovation autocorr.   | Innovation quality               |
| Stale state (no updates)    | Velocity freshness, Data recency |

### Step 5: Microstructure Quality Impact

Cross-reference with `get_microstructure_state`:
- Wide spread -> reduces Microstructure quality
- Low depth score -> reduces Volume adequacy, Microstructure quality
- High toxicity -> reduces Microstructure quality (toxic flow = adversely selected)
- Erratic OFI -> may reduce Direction stability

### Step 6: Calibration Check

Assess whether the confidence score is well-calibrated:
- Confidence of 0.7 should mean trades succeed ~70% of the time
- Use `get_prediction_diagnostics` to check calibration error
- If calibration error > 0.20, the confidence score is misleading (over- or under-confident)

Over-confidence is more dangerous than under-confidence:
- Over-confident: takes trades that should be avoided
- Under-confident: misses valid trades but preserves capital

### Step 7: Actionability Determination

| Composite Score | Assessment            | Trade Recommendation            |
|-----------------|-----------------------|---------------------------------|
| >= 0.70         | High confidence       | Signal is trustworthy           |
| 0.50-0.70       | Moderate confidence   | Trade with reduced size         |
| 0.35-0.50       | Low confidence        | Only trade if factors strongly agree |
| < 0.35          | Very low confidence   | Do not trade — signal unreliable |

## Quality Checklist

- [ ] All 11 components individually evaluated against thresholds
- [ ] Components classified as Strong / Adequate / Weak / Critical
- [ ] Top 3 contributors and bottom 3 detractors identified
- [ ] Bottleneck component identified with root cause analysis
- [ ] Filter health cross-referenced for filter-dependent components
- [ ] Microstructure quality cross-referenced for market-dependent components
- [ ] Calibration error checked
- [ ] Final actionability determination provided

## Output Format

```
## Confidence Audit Report

### Composite Score: [value] — [High / Moderate / Low / Very Low]

### Component Breakdown

| # | Component              | Score | Threshold | Status   | Notes           |
|---|------------------------|-------|-----------|----------|-----------------|
| 1 | Innovation quality     | ...   | 0.60      | ...      | ...             |
| 2 | Velocity freshness     | ...   | 0.50      | ...      | ...             |
| ...                                                                         |

### Key Findings
- **Strongest**: [component] ([score]) — [why it's strong]
- **Bottleneck**: [component] ([score]) — [root cause]
- **Calibration**: [well-calibrated / over-confident / under-confident]

### Recommendations
1. [Most impactful improvement action]
2. [Secondary improvement]

### Verdict: [Trust / Trust with caution / Do not trust]
```

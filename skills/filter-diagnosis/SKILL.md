---
name: filter-diagnosis
description: |
  Deep diagnostic of H-infinity filter internals: convergence, innovation analysis, gain inspection, gating, multi-layer comparison.
  Triggers on: "filter diagnosis", "filter health", "H-infinity", "filter state", "convergence",
  "filter diverging", "innovation sequence", "P-matrix", "covariance trace", "gating status",
  "filter not converging", "signal suppression"
---

# Filter Diagnosis

Deep diagnostic of the H-infinity filter pipeline — a three-layer (fast/medium/slow) robust state estimator that processes noisy price data into filtered trend signals. This skill examines convergence, innovation sequences, gain behavior, gating logic, and multi-layer consistency.

## Data Source Priority

1. FIRST: Use lab-mcp tools — `get_filter_state`, `get_confidence`, `get_prediction_diagnostics`, `get_convergence_history`
2. THEN: `get_microstructure_state` for input data quality assessment
3. REFERENCE: `get_signals` to see how filter state affects current signal output

## Background: H-Infinity Filter Architecture

The system runs 3 concurrent H-infinity filter layers:
- **Fast layer**: Short time constant, tracks rapid price movements, high noise sensitivity
- **Medium layer**: Moderate time constant, balances responsiveness and smoothness
- **Slow layer**: Long time constant, captures underlying trend, most noise-resistant

Each layer maintains:
- **State vector** (x): estimated [price, velocity, acceleration] (or subset)
- **P-matrix**: error covariance matrix — quantifies estimation uncertainty
- **Innovation**: prediction residual (actual - predicted), should be white noise if filter is healthy
- **Gain**: Kalman-like gain matrix, determines how much new observations correct the state

A **convergence gate** aggregates filter health across layers and blocks signal generation when the filter is unreliable.

## Workflow

### Step 1: Gather Filter Diagnostics

Call in parallel:
- `get_filter_state` — per-layer state vectors, P-matrix, innovation stats, gain, gating status
- `get_confidence` — 11-component confidence (filter health is a key component)
- `get_prediction_diagnostics` — per-horizon prediction internals (drift, mean-reversion, Hurst)
- `get_convergence_history` — timeline of convergence events, stress events, signal suppression

### Step 2: Convergence Assessment

For each filter layer (fast/medium/slow):

**P-matrix trace analysis**:
- Compute trace(P) = sum of diagonal elements of the covariance matrix
- **Decreasing trace**: Filter is CONVERGING — uncertainty is reducing. Healthy.
- **Stable trace**: Filter has CONVERGED — steady-state operation. Healthy.
- **Growing trace**: Filter is DIVERGING — uncertainty is increasing. Unhealthy.
- **Oscillating trace**: Filter is UNSTABLE — may indicate gamma parameter mismatch.

| Layer  | trace(P) | Trend     | Status     |
|--------|----------|-----------|------------|
| Fast   | ...      | ...       | ...        |
| Medium | ...      | ...       | ...        |
| Slow   | ...      | ...       | ...        |

**Convergence criteria**:
- All 3 layers with stable/decreasing trace: CONVERGED
- 2 of 3 layers stable, 1 growing: PARTIAL — flag the diverging layer
- 2+ layers growing: DIVERGING — convergence gate should be blocking signals

### Step 3: Innovation Sequence Analysis

The innovation sequence (prediction residuals) is the most important diagnostic signal. A healthy filter produces innovations that are:
- **Zero-mean**: average innovation near 0 (bias < 0.01 normalized)
- **White noise**: no autocorrelation (lag-1 autocorrelation < 0.3)
- **Constant variance**: innovation variance stable over time (no heteroscedasticity)

For each layer, check:

| Layer  | Mean Innovation | Autocorrelation | Variance Trend | Health   |
|--------|-----------------|-----------------|----------------|----------|
| Fast   | ...             | ...             | ...            | ...      |
| Medium | ...             | ...             | ...            | ...      |
| Slow   | ...             | ...             | ...            | ...      |

**Diagnostic interpretations**:

| Symptom                        | Likely Cause                    | Recommended Action                       |
|--------------------------------|---------------------------------|------------------------------------------|
| Non-zero mean innovation       | Model bias / price regime shift | Wait for adaptation or trigger re-init   |
| High autocorrelation (> 0.3)   | Model mismatch / missing state  | Review filter gamma parameter            |
| Growing innovation variance    | Volatility regime change        | Check if gamma needs increase            |
| Innovation spikes              | Outlier price data              | Check microstructure for wash trades     |

### Step 4: Gain Inspection

The filter gain determines responsiveness:
- **High gain**: Filter trusts new observations more — responsive but noisy
- **Low gain**: Filter trusts its model more — smooth but may lag

Check:
- Fast layer should have highest gain (by design)
- Slow layer should have lowest gain
- If slow layer gain > fast layer gain, filter layers are inverted (configuration error)
- If all gains near zero, filter has become "frozen" — ignoring new data

### Step 5: Gating Status Assessment

The convergence gate aggregates filter health into a single gate decision:

| Gate Status | Meaning                        | Signal Impact                      |
|-------------|--------------------------------|------------------------------------|
| OPEN        | Filter healthy, signals pass   | Normal operation                   |
| PARTIAL     | Some degradation detected      | Signals pass with reduced confidence |
| BLOCKED     | Filter unhealthy               | All signals suppressed             |

From `get_convergence_history`, examine:
- How long the gate has been in current state
- Recent gate transitions (OPEN -> BLOCKED events)
- Spectral event magnitude — what triggered blocking
- Signal suppression count — how many signals were blocked

### Step 6: Multi-Layer Comparison

Compare the three layers for consistency:

| Metric             | Fast    | Medium  | Slow    | Agreement |
|--------------------|---------|---------|---------|-----------|
| Direction          | ...     | ...     | ...     | ...       |
| Velocity estimate  | ...     | ...     | ...     | ...       |
| P-matrix trace     | ...     | ...     | ...     | ...       |
| Innovation mean    | ...     | ...     | ...     | ...       |

**Layer agreement scoring**:
- All 3 layers agree on direction: Strong agreement (confidence boost)
- 2 of 3 agree: Moderate agreement (normal operation)
- All 3 disagree: No agreement (likely regime transition — caution)
- Fast and slow disagree, medium neutral: Trend reversal may be forming

### Step 7: Prediction Engine Impact

From prediction diagnostics, assess how filter state affects predictions:
- **Hurst exponent**: < 0.5 = mean-reverting, 0.5 = random walk, > 0.5 = trending
- **Drift estimate**: current estimated directional drift
- **Mean-reversion strength**: how strongly prices are expected to revert
- **Conformal bands width**: wider bands = more uncertainty = filter less confident

Cross-reference: If filter shows CONVERGED but conformal bands are very wide, the filter has converged to a high-uncertainty state — the signal is low quality despite technical convergence.

### Step 8: Input Data Quality

Call `get_microstructure_state` and assess:
- OFI (Order Flow Imbalance) stability — erratic OFI can destabilize fast layer
- Whale signal magnitude — large whale trades create innovation spikes
- Cluster activity — coordinated wallet behavior can bias filter state

## Quality Checklist

- [ ] All four diagnostic data sources retrieved (filter state, confidence, predictions, convergence)
- [ ] P-matrix trace analyzed per layer with trend direction
- [ ] Innovation sequence checked for zero-mean, white noise, constant variance
- [ ] Innovation autocorrelation explicitly evaluated (threshold: 0.3)
- [ ] Gain levels compared across layers (fast > medium > slow expected)
- [ ] Gating status documented with duration and trigger cause
- [ ] Multi-layer directional agreement assessed
- [ ] Prediction engine cross-referenced (Hurst, conformal bands)
- [ ] Microstructure input quality checked
- [ ] Specific remediation steps provided for any unhealthy findings

## Output Format

```
## Filter Diagnosis Report

### Overall Status: [HEALTHY / DEGRADED / UNHEALTHY]

### Convergence Status

| Layer  | trace(P) | Trend       | Innovation Health | Gain Level | Status  |
|--------|----------|-------------|-------------------|------------|---------|
| Fast   | ...      | ...         | ...               | ...        | ...     |
| Medium | ...      | ...         | ...               | ...        | ...     |
| Slow   | ...      | ...         | ...               | ...        | ...     |

### Convergence Gate
- Status: [OPEN / PARTIAL / BLOCKED]
- Duration in current state: [time]
- Last transition: [event description]
- Signals suppressed: [count]

### Innovation Analysis

| Layer  | Mean  | Autocorrelation | Variance Trend | Diagnosis      |
|--------|-------|-----------------|----------------|----------------|
| Fast   | ...   | ...             | ...            | ...            |
| Medium | ...   | ...             | ...            | ...            |
| Slow   | ...   | ...             | ...            | ...            |

### Layer Agreement
- Directional consensus: [Strong / Moderate / None]
- Velocity alignment: [aligned / divergent]
- Hurst exponent: [value] ([interpretation])

### Issues Found
1. [Issue]: [description] — [recommended action]
2. ...

### Recommendations
[Prioritized list of actions to improve filter health]
```

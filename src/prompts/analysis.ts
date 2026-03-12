import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ServiceRegistry } from "../clients/registry.js";

function textMsg(role: "user" | "assistant", text: string) {
  return { role, content: { type: "text" as const, text } };
}

export function registerAnalysisPrompts(server: McpServer, reg: ServiceRegistry) {
  // ── 1. Signal Analysis ────────────────────────────────────────────

  server.registerPrompt(
    "signal-analysis",
    {
      description: "Analyze current signal quality: factors, confidence, composition, actionability, and microstructure context",
    },
    async () => {
      const [signals, factors, confidence, microstructure] = await Promise.all([
        reg.lab.getSignals(),
        reg.lab.getFactors(),
        reg.lab.getConfidence(),
        reg.lab.getMicrostructureState(),
      ]);

      return {
        messages: [
          textMsg("user", [
            "## Analysis Methodology\n",
            "Follow this systematic approach to evaluate trading signal quality:\n",
            "### Step 1: Signal Actionability Scoring",
            "Classify each signal using this rubric:",
            "- **Strong** (confidence >0.7, 3+ factors aligned in same direction, no filter blocks, microstructure supportive): Immediately actionable",
            "- **Moderate** (confidence 0.4-0.7, 2 factors aligned, no critical filter blocks): Actionable with caution, consider reduced position size",
            "- **Weak** (confidence <0.4, or convergence gate blocked, or fewer than 2 agreeing factors): Do NOT act — wait for confirmation\n",
            "### Step 2: Factor Agreement Analysis",
            "For each signal, check alignment across factor roles:",
            "- Primary factors provide the core directional thesis. If two primary factors disagree, the signal is conflicted.",
            "- Confirmation factors must agree with primary direction to validate. If confirmation opposes primary, downgrade actionability by one tier.",
            "- Filter factors can veto. Any active filter veto means the signal is blocked regardless of other scores.",
            "- Observer factors provide context but should not drive decisions. Note their readings for informational purposes.\n",
            "### Step 3: Red Flags Taxonomy",
            "Check for these specific warning conditions:",
            "- Convergence gate blocked: The H-infinity filter has not converged or model stress is elevated — signals are unreliable",
            "- Whale signals opposing direction: Large wallet activity contradicts the signal direction — possible adverse selection",
            "- High correlation (>0.7) between agreeing factors: Apparent multi-factor agreement may be illusory if factors are correlated — effectively one signal, not many",
            "- Innovation spike in filter diagnostics: Sudden model surprise indicates regime shift — past calibration may not apply",
            "- Microstructure degradation: Wide spreads (>2%), thin depth (<$10k), or high flow toxicity (>0.5) make execution unreliable",
            "- Momentum consensus opposing signal direction: If the aggregate momentum consensus (flow + whale + cluster + velocity) opposes the signal, there is a headwind\n",
            "### Step 4: Microstructure Context Assessment",
            "Before recommending action, verify execution conditions:",
            "- Order flow momentum: Is cumulative OFI trending with or against the signal? What is the buy volume ratio?",
            "- Whale pressure: Net whale direction — does it align with the signal? Active whale count can indicate institutional interest or manipulation.",
            "- Cluster activity: Are coordinated wallet groups active? What phase are they in (accumulation, distribution)?",
            "- Model stress: Is the convergence stress level elevated? Is the spectral event flag active? A blocked gate means no trading.\n",
            "### Quality Checklist",
            "Before concluding, verify:",
            "- [ ] Each signal has been scored (Strong/Moderate/Weak)",
            "- [ ] Factor role alignment has been checked for each signal",
            "- [ ] All red flags have been evaluated",
            "- [ ] Microstructure conditions have been assessed",
            "- [ ] Execution feasibility has been considered\n",

            "## Live Data\n",
            "### Signals",
            "```json",
            JSON.stringify(signals, null, 2),
            "```\n",
            "### Factors",
            "```json",
            JSON.stringify(factors, null, 2),
            "```\n",
            "### Confidence Breakdown",
            "```json",
            JSON.stringify(confidence, null, 2),
            "```\n",
            "### Microstructure State",
            "```json",
            JSON.stringify(microstructure, null, 2),
            "```\n",

            "## Analysis Required\n",
            "Based on the methodology above, analyze:",
            "1. Score each signal as Strong / Moderate / Weak with specific justification from the rubric",
            "2. For each signal, detail the factor agreement: which primary, confirmation, and filter factors are aligned or conflicting?",
            "3. Identify all red flags from the taxonomy — be specific about which signals are affected and why",
            "4. Assess the microstructure environment: is it conducive to execution? What is the whale/cluster context?",
            "5. For any actionable signals, note execution caveats (spread, depth, momentum headwinds)",
            "6. If no signals are actionable, explain what conditions would need to change",
          ].join("\n")),
        ],
      };
    },
  );

  // ── 2. Factor Performance ─────────────────────────────────────────

  server.registerPrompt(
    "factor-performance",
    {
      description: "Assess factor health: scorecards, prediction accuracy, cross-correlation, and weight optimization",
      argsSchema: {
        factor_name: z.string().optional().describe("Specific factor to focus on (optional, analyzes all if omitted)"),
      },
    },
    async ({ factor_name }) => {
      const [factors, predictions, correlation, expertWeights] = await Promise.all([
        reg.lab.getFactors(),
        reg.lab.getPredictionResults(),
        reg.lab.getCorrelation(),
        reg.lab.getExpertWeights(),
      ]);

      let scorecardSection = "";
      if (factor_name) {
        const scorecard = await reg.lab.getFactorScorecard(factor_name);
        scorecardSection = [
          "### Scorecard: " + factor_name,
          "```json",
          JSON.stringify(scorecard, null, 2),
          "```\n",
        ].join("\n");
      }

      return {
        messages: [
          textMsg("user", [
            "## Analysis Methodology\n",
            "Follow this systematic approach to evaluate factor pipeline health:\n",
            "### Step 1: Performance Assessment Framework",
            "For each factor, evaluate these metrics:",
            "- **Win Rate Trend** (rolling last 20 signals): Is it improving, stable, or declining? A declining trend suggests the factor is losing edge.",
            "- **Consecutive Loss Detection**: 3 consecutive losses = monitor closely. 5+ consecutive losses = WARNING — factor may be broken or regime has shifted.",
            "- **Prediction Calibration**: Compare the factor's predicted confidence to actual outcomes. If a factor says 0.8 confidence but wins only 50%, it is overconfident. If it says 0.4 but wins 70%, it is underconfident. Both are calibration problems.",
            "- **Signal Volume**: Too few signals (<10 in evaluation window) makes statistics unreliable. Flag small-sample factors.\n",
            "### Step 2: Correlation Risk Analysis",
            "Using the correlation matrix, identify problematic pairs:",
            "- **Correlation >0.7**: These factors are largely redundant. Having both in the same role (e.g., two primary factors at 0.85 correlation) creates false confidence in agreement. Recommend demoting one to Observer or disabling it.",
            "- **Correlation 0.4-0.7**: Moderate overlap. Acceptable if factors serve different roles (e.g., one primary, one confirmation).",
            "- **Correlation <0.4**: Good — factors provide independent information.",
            "- **Negative correlation**: If two factors are negatively correlated but both show positive win rates, they may provide valuable diversification. If one is negative and the other positive, the negative one may be contrarian.\n",
            "### Step 3: Weight Adjustment Rules",
            "Apply these concrete rules to current weights:",
            "- If `win_rate < 45%` over 50+ signals: **Halve the weight** — the factor is destroying value",
            "- If `win_rate < 40%` over 30+ signals: **Disable the factor** — it is actively harmful",
            "- If a factor is in the **top 3 by accuracy** over 50+ signals: **Increase weight by 20%** — reward proven performance",
            "- If a factor has **correlation >0.7** with a better-performing factor: **Set its weight to zero** or change role to Observer",
            "- If prediction calibration error (|predicted_confidence - actual_win_rate|) > 0.2: **Flag for recalibration**\n",
            "### Step 4: Expert Weight Analysis",
            "Compare the expert (adaptive) weights to the static strategy weights:",
            "- If expert weights have diverged significantly from static weights, the adaptive system has learned something — investigate why.",
            "- If expert weights are clustered (all factors similar weight), the system cannot distinguish factor quality — a problem.",
            "- Identify which factors the expert system trusts most/least and correlate with actual performance.\n",
            "### Quality Checklist",
            "- [ ] Each factor's win rate trend assessed",
            "- [ ] Consecutive loss streaks identified",
            "- [ ] Prediction calibration checked",
            "- [ ] All high-correlation pairs flagged",
            "- [ ] Concrete weight adjustment recommendations provided",
            "- [ ] Expert weight divergence analyzed\n",

            "## Live Data\n",
            "### Active Factors",
            "```json",
            JSON.stringify(factors, null, 2),
            "```\n",
            scorecardSection,
            "### Prediction Results",
            "```json",
            JSON.stringify(predictions, null, 2),
            "```\n",
            "### Correlation Matrix",
            "```json",
            JSON.stringify(correlation, null, 2),
            "```\n",
            "### Expert Weights",
            "```json",
            JSON.stringify(expertWeights, null, 2),
            "```\n",

            "## Analysis Required\n",
            "Based on the methodology above, analyze:",
            "1. Rate each factor's performance: provide win rate, trend direction, consecutive loss count, and prediction calibration",
            "2. Identify all correlation pairs >0.7 and recommend which factor in each pair to demote or disable",
            "3. Apply the weight adjustment rules: for each factor, state the current weight, recommended weight, and the rule that triggered the change",
            "4. Compare expert weights to static weights — where has the adaptive system diverged and is it justified by performance?",
            "5. Rank all factors from best to worst with a brief justification for each ranking",
            "6. Provide a prioritized list of recommended changes (weight adjustments, role changes, disabling)",
          ].join("\n")),
        ],
      };
    },
  );

  // ── 3. Position Review ────────────────────────────────────────────

  server.registerPrompt(
    "position-review",
    {
      description: "Review portfolio: open positions, equity curve, execution quality, risk exposure, and concentration",
    },
    async () => {
      const [positions, summary, equity, history] = await Promise.all([
        reg.lab.getPositions(),
        reg.lab.getPositionsSummary(),
        reg.lab.getEquityCurve(),
        reg.lab.getExecutionHistory(),
      ]);

      return {
        messages: [
          textMsg("user", [
            "## Analysis Methodology\n",
            "Follow this systematic approach to evaluate the portfolio:\n",
            "### Step 1: Portfolio Health Scoring",
            "Assign an overall health rating using this rubric:",
            "- **Green** (Healthy): Max drawdown <5% of portfolio, win rate >55%, positive PnL trend",
            "- **Yellow** (Caution): Drawdown 5-10% OR win rate 45-55% OR PnL flattening",
            "- **Red** (Critical): Drawdown >10% OR win rate <45% OR negative PnL trend over last 20 trades",
            "A single Red condition overrides all Green conditions.\n",
            "### Step 2: Concentration Analysis",
            "Measure exposure concentration across tokens:",
            "- Single token holds **>30% of deployed SOL**: HIGH risk — over-concentrated. Recommend trimming to <25%.",
            "- Single token holds **>50% of deployed SOL**: CRITICAL — unacceptable concentration. Immediate action: close excess or halt new entries for this token.",
            "- Top 3 tokens hold **>80%**: Portfolio is not diversified — acts as a 3-token portfolio despite having more positions.",
            "- Check directional concentration: if all positions are long (or short), portfolio has unhedged directional exposure.\n",
            "### Step 3: Execution Quality Rubric",
            "For each recent trade, evaluate execution quality:",
            "- **Slippage <20 bps**: Excellent execution. No action needed.",
            "- **Slippage 20-50 bps**: Acceptable. Monitor for patterns (does a specific token always have high slippage?).",
            "- **Slippage >50 bps**: Investigate — this is leaking alpha. Check: Was trade too large for available liquidity? Was timing poor (high volatility moment)? Is the token inherently illiquid?",
            "- **Fill quality <0.8**: Partial fill — position is undersized relative to intention.",
            "- **Latency >2000ms**: Execution is slow — may be missing price moves.\n",
            "### Step 4: Drawdown Severity Assessment",
            "Evaluate drawdown relative to configured maximum:",
            "- **<25% of max allowed drawdown**: Healthy — full trading capacity",
            "- **25-50% of max allowed**: Caution — consider reducing position sizes by 25%",
            "- **50-75% of max allowed**: Reduce — halve position sizes, tighten stops, no new positions in weak factors",
            "- **>75% of max allowed**: HALT — stop all new positions, evaluate whether to close existing positions\n",
            "### Step 5: Equity Curve Shape Analysis",
            "Examine the equity curve for patterns:",
            "- Steady upslope with small dips: Healthy — strategy is generating consistent returns",
            "- Plateau followed by drop: Strategy may have lost edge — check if regime changed",
            "- Sawtooth pattern: Wins and losses roughly equal — strategy has weak edge, check factor weights",
            "- Cliff: Sudden large drawdown — investigate: Was it a single large loss or cascade? Was risk management bypassed?\n",
            "### Quality Checklist",
            "- [ ] Overall health score assigned (Green/Yellow/Red)",
            "- [ ] Token concentration measured and flagged if excessive",
            "- [ ] Execution quality assessed per trade",
            "- [ ] Drawdown severity evaluated against limits",
            "- [ ] Equity curve shape characterized\n",

            "## Live Data\n",
            "### Position Summary",
            "```json",
            JSON.stringify(summary, null, 2),
            "```\n",
            "### Open Positions",
            "```json",
            JSON.stringify(positions, null, 2),
            "```\n",
            "### Equity Curve",
            "```json",
            JSON.stringify(equity, null, 2),
            "```\n",
            "### Recent Execution History",
            "```json",
            JSON.stringify(history, null, 2),
            "```\n",

            "## Analysis Required\n",
            "Based on the methodology above, analyze:",
            "1. Assign a portfolio health score (Green/Yellow/Red) with specific justification citing metrics",
            "2. Measure token concentration: what % of deployed SOL is in each token? Flag any exceeding 30%",
            "3. Evaluate execution quality: average slippage, worst slippage, any patterns in bad executions",
            "4. Assess drawdown severity: what % of max allowed drawdown has been consumed? What action level applies?",
            "5. Characterize the equity curve shape and what it implies about strategy health",
            "6. Provide specific recommendations: positions to trim, tokens to avoid, size adjustments",
          ].join("\n")),
        ],
      };
    },
  );

  // ── 4. Filter Diagnosis ───────────────────────────────────────────

  server.registerPrompt(
    "filter-diagnosis",
    {
      description: "Deep diagnostic of H-infinity filter: convergence, innovation health, multi-layer comparison, and gating",
    },
    async () => {
      const [filterState, confidence, predictions, convergence] = await Promise.all([
        reg.lab.getFilterState(),
        reg.lab.getConfidence(),
        reg.lab.getPredictionDiagnostics(),
        reg.lab.getConvergenceHistory(),
      ]);

      return {
        messages: [
          textMsg("user", [
            "## Analysis Methodology\n",
            "Follow this systematic approach to diagnose the H-infinity filter pipeline:\n",
            "### Step 1: Convergence Criteria",
            "The H-infinity filter has a P-matrix (error covariance) that indicates estimation uncertainty:",
            "- **P-matrix trace decreasing**: Filter is converging — actively learning from data, estimates becoming more precise.",
            "- **P-matrix trace stable (low)**: Filter has converged — operating in steady state. This is the ideal condition for reliable signals.",
            "- **P-matrix trace growing**: Filter is DIVERGING — model assumptions are violated or a structural break has occurred. Signals should not be trusted.",
            "- **P-matrix trace oscillating**: Filter is being pulled in different directions — possible conflicting data sources or nonstationary dynamics.\n",
            "### Step 2: Innovation Health Assessment",
            "The innovation sequence (prediction errors) reveals model fit quality:",
            "- **Innovation autocorrelation >0.3**: Model mismatch — the filter is systematically wrong in a predictable way. The model's state transition or observation equations need adjustment.",
            "- **Innovation autocorrelation <0.1**: Healthy — innovations look like white noise, meaning the model captures all predictable dynamics.",
            "- **Sudden innovation spike (>3 sigma)**: Structural break detected — price dynamics have shifted. May need to re-initialize or widen process noise.",
            "- **Innovation mean significantly non-zero**: Persistent bias — the filter has a systematic offset. Check observation model.\n",
            "### Step 3: Multi-Layer Comparison",
            "The system runs multiple filter layers (fast/medium/slow time scales):",
            "- **All layers same direction**: Strong consensus — high confidence in the estimated direction.",
            "- **Fast and medium agree, slow disagrees**: Possible regime transition in progress. The fast layer has detected a change that the slow layer hasn't confirmed.",
            "- **Fast disagrees with medium and slow**: Fast layer may be reacting to noise. Wait for medium confirmation before acting.",
            "- **All layers disagree**: Maximum uncertainty — no tradeable signal. This typically occurs during volatile regime transitions.\n",
            "### Step 4: Gain Analysis",
            "The Kalman/H-inf gain determines how much new data affects the state estimate:",
            "- **Gain growing**: Filter is increasing trust in incoming data — possible because recent data has been more informative or the model is uncertain.",
            "- **Gain shrinking**: Filter relies more on its internal model than data — typical when converged and data is noisy.",
            "- **Gain near zero**: Filter ignores new data — may be overconfident or stuck. Check if P-matrix has collapsed.",
            "- **Gain oscillating wildly**: Numerical instability possible — check for extreme price moves or data gaps.\n",
            "### Step 5: Gating Rules Assessment",
            "The convergence gate controls whether signals are emitted:",
            "- **Gate blocked + high model stress**: CORRECT suppression — the filter detects it cannot produce reliable estimates. Wait for stress to subside.",
            "- **Gate blocked + low stress**: Possible FALSE ALARM — the gate may be too conservative. Check if the gate threshold needs adjustment.",
            "- **Gate open + high stress**: DANGEROUS — signals are being emitted despite model uncertainty. Check if the stress threshold is too high.",
            "- **Gate open + spectral event active**: WARNING — unusual spectral activity (possible structural change) but gate still allows signals. Extra caution warranted.\n",
            "### Quality Checklist",
            "- [ ] P-matrix trace trajectory classified (converging/stable/diverging/oscillating)",
            "- [ ] Innovation health assessed (autocorrelation, spikes, bias)",
            "- [ ] Multi-layer consensus evaluated",
            "- [ ] Gain dynamics characterized",
            "- [ ] Gate status assessed for correctness\n",

            "## Live Data\n",
            "### Filter State",
            "```json",
            JSON.stringify(filterState, null, 2),
            "```\n",
            "### Confidence Breakdown",
            "```json",
            JSON.stringify(confidence, null, 2),
            "```\n",
            "### Prediction Diagnostics",
            "```json",
            JSON.stringify(predictions, null, 2),
            "```\n",
            "### Convergence History",
            "```json",
            JSON.stringify(convergence, null, 2),
            "```\n",

            "## Analysis Required\n",
            "Based on the methodology above, analyze:",
            "1. Classify the filter convergence state: Is the P-matrix trace decreasing, stable, growing, or oscillating? What does this mean for signal reliability?",
            "2. Assess innovation sequence health: Is there autocorrelation, bias, or recent spikes? What model issues do they suggest?",
            "3. Compare the filter layers: Do fast/medium/slow agree on direction? What does their relationship indicate about the current market state?",
            "4. Evaluate gain dynamics: Is the filter trusting data or model more? Is this appropriate for current conditions?",
            "5. Check gating correctness: Is the gate in the right state given stress levels? Any false alarm or dangerous open-gate conditions?",
            "6. Provide specific recommendations: Should filter parameters be adjusted? Is it safe to trade on current filter output?",
          ].join("\n")),
        ],
      };
    },
  );

  // ── 5. Confidence Audit ───────────────────────────────────────────

  server.registerPrompt(
    "confidence-audit",
    {
      description: "Audit signal confidence: component reliability, calibration, microstructure quality, and floor/ceiling detection",
    },
    async () => {
      const [confidence, filterState, microstructure] = await Promise.all([
        reg.lab.getConfidence(),
        reg.lab.getFilterState(),
        reg.lab.getMicrostructureState(),
      ]);

      return {
        messages: [
          textMsg("user", [
            "## Analysis Methodology\n",
            "Follow this systematic approach to audit the confidence pipeline:\n",
            "### Step 1: Component Reliability Assessment",
            "The confidence score is composed of multiple components. Evaluate each:",
            "- **Factor agreement score**: Measures how many factors agree on direction. Reliable when >4 factors are active. Unreliable with <3 factors (small sample).",
            "- **Filter confidence**: Derived from H-infinity filter convergence. Reliable when filter has converged (low P-trace). Unreliable during initialization or after structural breaks.",
            "- **Microstructure score**: Based on spread, depth, toxicity. Reliable as a real-time execution quality indicator. Can be noisy in thin markets.",
            "- **Prediction confidence**: From the expert ensemble. Reliable when experts have enough history (>50 predictions resolved). Noisy during cold start.",
            "- **Momentum consensus**: Composite of flow/whale/cluster/velocity. Reliable when multiple sub-components are active. Unreliable if dominated by a single whale signal.",
            "- **Correlation penalty**: Reduces confidence when factors are too correlated. This is a correction factor, not a standalone signal.",
            "For each component, determine: Is it in a reliable operating range? Is it contributing positively or dragging down the overall score? Is it well-calibrated (component value matches actual predictive power)?\n",
            "### Step 2: Confidence Floor and Ceiling Detection",
            "Watch for extreme overall confidence values:",
            "- **Confidence <0.2**: Almost certainly noise. The system has very low conviction. Do NOT trade on this signal.",
            "- **Confidence 0.2-0.4**: Marginal. Only consider if one very strong factor dominates and has a proven track record.",
            "- **Confidence 0.4-0.7**: Working range. Most actionable signals fall here. Evaluate individual components for weaknesses.",
            "- **Confidence 0.7-0.9**: Strong signal. Verify this is real and not an artifact (e.g., all components inflated by the same event).",
            "- **Confidence >0.9**: Suspiciously high. In real markets, confidence this high is unusual. Check: Are multiple components double-counting the same information? Is this a data artifact?\n",
            "### Step 3: Microstructure Quality Thresholds",
            "The microstructure directly impacts whether confidence should translate to action:",
            "- **Spread >2%**: Poor execution environment. Even with high confidence, slippage will eat profits. Consider: should the confidence score be discounted by spread quality?",
            "- **Depth <$10k**: Thin liquidity. Large orders will move price significantly. Only small positions are viable.",
            "- **Flow toxicity >0.5**: Adverse selection risk — the counterparty may be better informed. This is a fundamental headwind to any signal.",
            "- **Buy volume ratio extreme (<0.2 or >0.8)**: One-sided market. If signal direction opposes the dominant flow, extra caution.",
            "- **Whale pressure opposing signal**: If net whale direction contradicts the signal, institutional money disagrees. Weight this heavily.\n",
            "### Step 4: Calibration Cross-Check",
            "Compare current confidence to historical outcomes at similar confidence levels:",
            "- If past signals at this confidence level had win rate matching the confidence (e.g., 0.6 confidence, 60% win rate), calibration is good.",
            "- If win rate is consistently below confidence level, the system is overconfident — apply a discount.",
            "- If win rate exceeds confidence level, the system is underconfident — it may be leaving alpha on the table by under-sizing.\n",
            "### Quality Checklist",
            "- [ ] Each confidence component assessed for reliability",
            "- [ ] Floor/ceiling thresholds checked",
            "- [ ] Microstructure quality verified against thresholds",
            "- [ ] Cross-calibration with historical outcomes considered",
            "- [ ] Overall recommendation: trust, discount, or reject this confidence level\n",

            "## Live Data\n",
            "### Confidence Breakdown",
            "```json",
            JSON.stringify(confidence, null, 2),
            "```\n",
            "### Filter State",
            "```json",
            JSON.stringify(filterState, null, 2),
            "```\n",
            "### Microstructure State",
            "```json",
            JSON.stringify(microstructure, null, 2),
            "```\n",

            "## Analysis Required\n",
            "Based on the methodology above, analyze:",
            "1. Assess each confidence component: Is it in a reliable operating range? What is its contribution to the overall score?",
            "2. Check for floor/ceiling conditions: Is the overall confidence in a normal operating range? If extreme, explain why.",
            "3. Evaluate microstructure quality: Do spread, depth, and toxicity support confident execution? Apply the threshold rubric.",
            "4. Cross-check calibration: Based on component values and filter state, should this confidence level be trusted, discounted, or rejected?",
            "5. Identify the weakest component: Which confidence input is most likely to be unreliable and why?",
            "6. Provide a final verdict: Can this confidence score be trusted for sizing a real trade? What discount (if any) should be applied?",
          ].join("\n")),
        ],
      };
    },
  );

  // ── 6. System Health ──────────────────────────────────────────────

  server.registerPrompt(
    "system-health",
    {
      description: "Full system health check: service dependencies, degraded mode detection, metric ranges, and configuration audit",
    },
    async () => {
      const [health, mode, metrics, execConfig] = await Promise.all([
        reg.lab.getHealth(),
        reg.lab.getMode(),
        reg.lab.getMetrics(),
        reg.lab.getExecutionConfig(),
      ]);

      return {
        messages: [
          textMsg("user", [
            "## Analysis Methodology\n",
            "Follow this systematic approach to evaluate system health:\n",
            "### Step 1: Service Dependency Map",
            "Understand the critical path:",
            "- **Lab (port 4100)** — CRITICAL: Core factor pipeline, signal generation, risk management. If down: no signals, no trades, no analysis.",
            "- **Redis (port 6379)** — CRITICAL: Message broker for all streams (swaps, prices, OFI, clusters, discovery). If down: no data flow, pipeline stalls.",
            "- **Platform (port 4000)** — OPTIONAL for Lab mode. Required for Engine mode (auth, billing, tier gates). If down in Lab mode: no impact. In Engine mode: all operations fail.",
            "- **Pricing Service (port 4002)** — OPTIONAL: Provides price updates, candle data, OFI. If down: Lab uses cached/stale prices, candle charts unavailable, OFI factors degrade.",
            "- **Wallet Monitor (port 4001)** — OPTIONAL: Provides swap events and cluster detection. If down: no new swap signals, cluster factors go stale.",
            "- **Frontend (port 3001)** — NON-CRITICAL: Dashboard visualization only. If down: no UI, but all backend operations continue normally.\n",
            "### Step 2: Degraded Mode Detection",
            "Identify which capabilities are lost when services are down:",
            "- Redis down: Pipeline fully stalled. No new data arrives. All factors produce stale signals. IMMEDIATE action: restart Redis.",
            "- Pricing down: Price factors (SMA, EMA) become stale. Microstructure data unavailable. Confidence score loses microstructure component. Factor pipeline runs but with degraded quality.",
            "- Wallet Monitor down: Swap detection stops. Cluster signals go stale. Whale signals decay to zero. Only price-based factors continue working.",
            "- Multiple services down: Compound degradation. If both Pricing and Wallet Monitor are down, the pipeline has no fresh data — effectively halted.\n",
            "### Step 3: Metric Health Ranges",
            "Evaluate key performance metrics against expected ranges:",
            "- **Win rate**: 45-65% = normal operating range. <45% = strategy needs review. >65% = unusually good (verify not overfitting or small sample). <35% = HALT trading.",
            "- **Sharpe ratio**: >0.5 = good risk-adjusted returns. 0-0.5 = marginal. <0 = strategy is losing money on risk-adjusted basis.",
            "- **Max drawdown**: <15% = healthy. 15-25% = elevated risk. >25% = consider halting.",
            "- **Total PnL**: Positive and growing = healthy. Positive but flattening = strategy losing edge. Negative = strategy is losing money.",
            "- **Trades per hour**: 0 = pipeline may be stalled (check streams). <1 = low activity (may be expected in quiet markets). >10 = very active (verify not churning).\n",
            "### Step 4: Configuration Audit",
            "Check execution configuration for issues:",
            "- **Backend mismatch**: If mode is 'paper' but backend is 'live', there is a dangerous mismatch.",
            "- **Auto-execute**: Should be FALSE for safety unless explicitly enabled. If true, verify human intended this.",
            "- **Position sizing**: Check sizer_strategy is appropriate for current portfolio size and market conditions.",
            "- **Slippage model**: Verify it matches the trading environment (paper vs live have different slippage characteristics).\n",
            "### Quality Checklist",
            "- [ ] All services checked for availability",
            "- [ ] Degraded capabilities identified for any down services",
            "- [ ] Each metric evaluated against health ranges",
            "- [ ] Configuration audited for mismatches or unsafe settings",
            "- [ ] Overall system status classified: Healthy / Degraded / Critical\n",

            "## Live Data\n",
            "### Health Status",
            "```json",
            JSON.stringify(health, null, 2),
            "```\n",
            "### Operating Mode",
            "```json",
            JSON.stringify(mode, null, 2),
            "```\n",
            "### Performance Metrics",
            "```json",
            JSON.stringify(metrics, null, 2),
            "```\n",
            "### Execution Config",
            "```json",
            JSON.stringify(execConfig, null, 2),
            "```\n",

            "## Analysis Required\n",
            "Based on the methodology above, analyze:",
            "1. Service availability: Which services are up/down? What capabilities are lost for any down services?",
            "2. Degradation assessment: Is the system in a degraded mode? What is the compound impact of any missing services?",
            "3. Metric health: Rate each key metric (win rate, Sharpe, drawdown, PnL) against the expected ranges. Which are in normal range and which are concerning?",
            "4. Configuration audit: Any mismatches between mode and execution config? Is auto-execute safe? Are sizing parameters appropriate?",
            "5. Overall system status: Classify as Healthy / Degraded / Critical with justification",
            "6. Recommended actions: What (if anything) needs immediate attention?",
          ].join("\n")),
        ],
      };
    },
  );

  // ── 7. Strategy Review ────────────────────────────────────────────

  server.registerPrompt(
    "strategy-review",
    {
      description: "Review active strategy: role balance, redundancy, weight vs performance, and composition optimization",
    },
    async () => {
      const [strategy, factors, predictions, correlation, expertWeights] = await Promise.all([
        reg.lab.getStrategy(),
        reg.lab.getFactors(),
        reg.lab.getPredictionResults(),
        reg.lab.getCorrelation(),
        reg.lab.getExpertWeights(),
      ]);

      return {
        messages: [
          textMsg("user", [
            "## Analysis Methodology\n",
            "Follow this systematic approach to evaluate the active strategy:\n",
            "### Step 1: Role Balance Scoring",
            "The composition system uses four roles. Evaluate the balance:",
            "- **Ideal distribution**: 1-2 Primary (directional thesis), 2-3 Confirmation (validation), 1-2 Filter (veto/gate), 0-2 Observer (context only)",
            "- **Too many Primary**: Multiple strong opinions create conflict. If >2 Primary factors, they will frequently disagree, producing conflicted or low-confidence signals.",
            "- **Too few Confirmation**: Primary signals go unvalidated. Recommendation: promote the best-performing Observer or add a complementary factor.",
            "- **No Filters**: Dangerous — nothing protects against bad signals. At minimum, one filter factor should gate on volatility or liquidity.",
            "- **All Observers**: No active signal generation — the strategy only watches and never trades.\n",
            "### Step 2: Redundancy Detection",
            "Cross-reference factor roles with correlation data:",
            "- If two **Primary** factors correlate >0.7: They provide essentially the same signal. Demote one to Confirmation or Observer.",
            "- If two **Confirmation** factors correlate >0.7: Redundant validation. Disable one or change to Observer.",
            "- If a **Primary** and **Confirmation** correlate >0.7: The confirmation does not add independent validation. Replace with an uncorrelated confirmation factor.",
            "- Ideal: Primary-Confirmation correlation <0.4 (truly independent validation).\n",
            "### Step 3: Weight vs Performance Analysis",
            "Compare assigned weights to actual contribution:",
            "- Fetch expert weights (adaptive system's learned weights) and compare to static strategy weights.",
            "- If a factor's static weight is high but expert weight is low, the adaptive system has learned the factor underperforms — the static weight should decrease.",
            "- If a factor's static weight is low but expert weight is high, an opportunity: the factor is better than configured. Increase its static weight.",
            "- Compare weight to PnL contribution: a factor with 30% weight but 10% of PnL is overweighted. A factor with 10% weight but 30% of PnL is underweighted.\n",
            "### Step 4: Composition Optimization",
            "Synthesize the above into concrete suggestions:",
            "- **Role changes**: Based on correlation and performance, suggest specific role reassignments (e.g., 'Move factor-price-trend from Primary to Confirmation because it correlates 0.8 with factor-swap-momentum which has better win rate').",
            "- **Weight redistribution**: Based on performance vs weight analysis, suggest specific new weights.",
            "- **Factor additions/removals**: If there are gaps (e.g., no filter factor, or no uncorrelated confirmation), suggest which existing factors could fill the gap or flag that a new factor type is needed.",
            "- **Horizon alignment**: Check if factor time horizons are well-distributed (fast + medium + slow) or clustered at one time scale.\n",
            "### Quality Checklist",
            "- [ ] Role distribution counted and evaluated",
            "- [ ] All high-correlation same-role pairs identified",
            "- [ ] Static vs expert weights compared for each factor",
            "- [ ] Concrete role change recommendations provided",
            "- [ ] Weight redistribution recommendations quantified",
            "- [ ] Factor horizon distribution assessed\n",

            "## Live Data\n",
            "### Strategy Configuration",
            "```json",
            JSON.stringify(strategy, null, 2),
            "```\n",
            "### Active Factors",
            "```json",
            JSON.stringify(factors, null, 2),
            "```\n",
            "### Prediction Results",
            "```json",
            JSON.stringify(predictions, null, 2),
            "```\n",
            "### Factor Correlations",
            "```json",
            JSON.stringify(correlation, null, 2),
            "```\n",
            "### Expert Weights",
            "```json",
            JSON.stringify(expertWeights, null, 2),
            "```\n",

            "## Analysis Required\n",
            "Based on the methodology above, analyze:",
            "1. Role balance: Count factors in each role. Does the distribution match the ideal? What specific imbalances exist?",
            "2. Redundancy: Identify all same-role pairs with correlation >0.7. For each pair, recommend which to reassign and to what role.",
            "3. Weight vs performance: For each factor, compare static weight, expert weight, and actual PnL contribution. Which factors are over/under-weighted?",
            "4. Composition optimization: Provide a specific recommended strategy configuration — role changes, weight adjustments, and factor enable/disable recommendations.",
            "5. Horizon coverage: Are fast, medium, and slow time scales all represented? Any gaps?",
            "6. Priority ranking: Order your recommendations by expected impact (highest alpha improvement first)",
          ].join("\n")),
        ],
      };
    },
  );

  // ── 8. Portfolio Rebalance ────────────────────────────────────────

  server.registerPrompt(
    "portfolio-rebalance",
    {
      description: "Full portfolio rebalancing analysis: drift measurement, trade recommendations, slippage estimation, and execution planning",
    },
    async () => {
      const [positions, summary, microstructure, strategy] = await Promise.all([
        reg.lab.getPositions(),
        reg.lab.getPositionsSummary(),
        reg.lab.getMicrostructureState(),
        reg.lab.getStrategy(),
      ]);

      return {
        messages: [
          textMsg("user", [
            "## Analysis Methodology\n",
            "Follow this systematic approach to analyze portfolio rebalancing needs:\n",
            "### Step 1: Current State Capture",
            "Build a complete picture of the portfolio:",
            "- List every open position with its current value in SOL",
            "- Calculate total portfolio value (sum of all position values + uninvested SOL)",
            "- Compute each position's current allocation percentage (position_value / total_value * 100)",
            "- Note the target allocation from strategy config (if specified) or assume equal-weight as default\n",
            "### Step 2: Drift Analysis",
            "For each position, compute drift from target:",
            "- **Drift = current_pct - target_pct** (positive means overweight, negative means underweight)",
            "- **Default band threshold: +/- 5%** — positions within this band do not need rebalancing",
            "- Flag any position where |drift| > band threshold as requiring rebalancing",
            "- Compute portfolio-level drift metrics: max drift across all positions, mean absolute drift, number of positions exceeding band",
            "- Special case: if a token has no target allocation but has an open position, it is 100% drifted and should be closed\n",
            "### Step 3: Trade Recommendations",
            "For each position exceeding the drift band, generate a trade:",
            "- **Overweight position (drift > +band)**: SELL enough to bring back to target. Amount = (current_pct - target_pct) / 100 * total_portfolio_value",
            "- **Underweight position (drift < -band)**: BUY enough to bring to target. Amount = (target_pct - current_pct) / 100 * total_portfolio_value",
            "- Order trades: SELL first (to free up capital), then BUY (to deploy freed capital)",
            "- Minimum trade size: skip trades smaller than 0.01 SOL (not worth execution cost)\n",
            "### Step 4: Slippage Estimation",
            "For each proposed trade, estimate execution cost:",
            "- Check microstructure state for the token: spread, depth, flow toxicity",
            "- Base slippage estimate: spread_bps / 2 + (trade_size / depth) * impact_factor",
            "- If trade size > 10% of available depth: HIGH slippage warning — consider splitting into multiple smaller trades",
            "- If flow toxicity > 0.5 for the token: Add 20 bps toxicity premium to estimated slippage",
            "- Total rebalance cost = sum of all estimated slippages\n",
            "### Step 5: Execution Planning",
            "Determine whether and how to execute the rebalance:",
            "- **Skip conditions**: Do NOT rebalance if convergence gate is blocked, model stress is elevated, or total estimated slippage cost > expected drift recovery",
            "- **Partial rebalance**: If some tokens have good microstructure and others don't, rebalance only the good ones",
            "- **Timing**: In high-volatility periods, defer non-urgent rebalances. Only rebalance critical drift (>15%) during volatility.",
            "- **Execution sequence**: Sell overweight positions first, wait for fills, then buy underweight positions. Never execute simultaneously (risk of being wrong-footed).\n",
            "### Quality Checklist",
            "- [ ] All positions mapped with current vs target allocation",
            "- [ ] Drift computed for each position and portfolio aggregate",
            "- [ ] Trade recommendations generated for positions exceeding band",
            "- [ ] Slippage estimated per trade with microstructure context",
            "- [ ] Skip conditions evaluated (gate, stress, cost-benefit)",
            "- [ ] Execution sequence planned\n",

            "## Live Data\n",
            "### Positions",
            "```json",
            JSON.stringify(positions, null, 2),
            "```\n",
            "### Position Summary",
            "```json",
            JSON.stringify(summary, null, 2),
            "```\n",
            "### Microstructure State",
            "```json",
            JSON.stringify(microstructure, null, 2),
            "```\n",
            "### Strategy Configuration",
            "```json",
            JSON.stringify(strategy, null, 2),
            "```\n",

            "## Analysis Required\n",
            "Based on the methodology above, analyze:",
            "1. What is the current portfolio allocation? List each position's value and percentage of total.",
            "2. What is the drift for each position? Which positions exceed the +/-5% band?",
            "3. What trades would bring the portfolio back to target? List each trade with direction, amount, and reason.",
            "4. What is the estimated slippage cost for each trade? What is the total rebalancing cost?",
            "5. Should the rebalance be executed now? Evaluate skip conditions (gate status, stress, cost-benefit).",
            "6. If executing, what is the recommended trade sequence and timing?",
          ].join("\n")),
        ],
      };
    },
  );

  // ── 9. Parameter Sensitivity ──────────────────────────────────────

  server.registerPrompt(
    "parameter-sensitivity",
    {
      description: "Sensitivity analysis: identify optimal parameter regions, assess robustness, and sweep key strategy parameters",
      argsSchema: {
        parameter: z.string().optional().describe("Parameter name to analyze (e.g., 'confidence_threshold', 'stop_loss_pct'). If omitted, suggests which parameters to sweep."),
        scenario: z.string().optional().describe("Backtest scenario to use: 'crash', 'ramp', or 'sideways'. If omitted, uses all three."),
      },
    },
    async ({ parameter, scenario }) => {
      const [strategy, scenarios] = await Promise.all([
        reg.lab.getStrategy(),
        reg.lab.listScenarios(),
      ]);

      return {
        messages: [
          textMsg("user", [
            "## Analysis Methodology\n",
            "Follow this systematic approach for parameter sensitivity analysis:\n",
            "### Step 1: Parameter Selection",
            "If no specific parameter was requested, select from these high-impact parameters:",
            "- **confidence_threshold** (range: 0.2-0.9, step: 0.1): Minimum confidence to generate a signal. Too low = noisy signals, too high = missed opportunities.",
            "- **stop_loss_pct** (range: 2-20, step: 2): Stop loss percentage. Too tight = stopped out by noise, too loose = large losses.",
            "- **take_profit_pct** (range: 3-30, step: 3): Take profit percentage. Too tight = clipped winners, too loose = give back gains.",
            "- **position_size_pct** (range: 1-15, step: 2): Portfolio fraction per position. Too small = negligible impact, too large = concentration risk.",
            "- **factor_weight** (range: 0.0-1.0, step: 0.1): Weight for a specific factor. Sensitivity shows how much the factor matters.\n",
            "### Step 2: Sweep Execution",
            "For each parameter value in the range:",
            "- Use the `run_backtest` tool with the specified scenario (or run all three scenarios: crash, ramp, sideways)",
            "- Record: total_pnl, win_rate, max_drawdown, total_trades for each value",
            "- Note: If parameter overrides are not yet supported by the backtest endpoint, use the base scenario results and note the limitation.",
            "Build a results table with columns: [parameter_value, total_pnl, win_rate, max_drawdown, total_trades]\n",
            "### Step 3: Sensitivity Matrix Construction",
            "Analyze the results table to identify:",
            "- **Optimal region**: The range of parameter values where PnL is maximized while drawdown stays acceptable",
            "- **Cliff edges**: Values where performance drops sharply — these are dangerous boundaries",
            "- **Plateau regions**: Ranges where performance barely changes — the parameter has low sensitivity here",
            "- **Monotonic vs non-monotonic**: Does performance consistently improve/degrade with the parameter, or is there a peak?\n",
            "### Step 4: Robustness Assessment",
            "Evaluate how robust the optimal region is:",
            "- **Wide optimal region** (performance good over >30% of range): ROBUST — parameter is not fragile",
            "- **Narrow optimal region** (performance good over <10% of range): FRAGILE — small changes cause large performance swings. This is a significant risk.",
            "- **Scenario-dependent optimum**: If optimal value differs across crash/ramp/sideways scenarios, the parameter may need to be regime-adaptive",
            "- **Cross-parameter interaction**: Note if this parameter's sensitivity likely depends on other parameter values (e.g., stop_loss and take_profit interact)\n",
            "### Step 5: Recommendations",
            "Based on the analysis:",
            "- Recommend an optimal parameter value (or range)",
            "- Flag if the current value is far from optimal",
            "- Warn if the parameter is in a fragile region",
            "- Suggest whether the parameter should be fixed or made adaptive\n",
            "### Quality Checklist",
            "- [ ] Parameter selected with clear rationale",
            "- [ ] Sweep values defined across reasonable range",
            "- [ ] Results table constructed (or tool calls planned)",
            "- [ ] Optimal region identified",
            "- [ ] Robustness assessed (wide vs narrow)",
            "- [ ] Cross-scenario comparison done if applicable",
            "- [ ] Current value position evaluated\n",

            "## Live Data\n",
            "### Strategy Configuration",
            "```json",
            JSON.stringify(strategy, null, 2),
            "```\n",
            "### Available Scenarios",
            "```json",
            JSON.stringify(scenarios, null, 2),
            "```\n",
            parameter ? `### Requested Parameter: ${parameter}\n` : "### No specific parameter requested — analyze which parameters to sweep first.\n",
            scenario ? `### Requested Scenario: ${scenario}\n` : "### No specific scenario requested — recommend using all available scenarios for robustness.\n",

            "## Analysis Required\n",
            "Based on the methodology above, analyze:",
            "1. " + (parameter
              ? `Analyze the '${parameter}' parameter: what is its current value in the strategy? What range should be swept?`
              : "Which parameters should be analyzed first? Rank by expected impact on strategy performance."),
            "2. Plan the sweep: define the values to test. Use the `run_backtest` tool for each value" + (scenario ? ` with the '${scenario}' scenario.` : " across all available scenarios."),
            "3. After running backtests, construct the sensitivity table and identify the optimal region.",
            "4. Assess robustness: Is the optimal region wide or narrow? Does it differ across scenarios?",
            "5. Compare the current parameter value to the optimal: Is it in the optimal region, near a cliff edge, or in a plateau?",
            "6. Provide specific recommendations: Should the parameter be adjusted? If so, to what value and why?",
          ].join("\n")),
        ],
      };
    },
  );

  // ── 10. Market Context ────────────────────────────────────────────

  server.registerPrompt(
    "market-context",
    {
      description: "Market regime and fundamentals: regime detection, liquidity assessment, momentum analysis, and token comparison",
    },
    async () => {
      const [microstructure, priceHistory] = await Promise.all([
        reg.lab.getMicrostructureState(),
        reg.lab.getPriceHistory(),
      ]);

      return {
        messages: [
          textMsg("user", [
            "## Analysis Methodology\n",
            "Follow this systematic approach to assess market context:\n",
            "### Step 1: Regime Detection",
            "Determine the current market regime from price and microstructure data:",
            "- **Trending (momentum)**: Price moving consistently in one direction. Indicators: strong momentum consensus (magnitude >0.5), consistent flow direction, low mean reversion signals. Strategy implication: trend-following factors should be weighted higher.",
            "- **Mean-reverting (range-bound)**: Price oscillating around a level. Indicators: weak momentum consensus (magnitude <0.2), frequent direction changes in flow, spread relatively stable. Strategy implication: mean-reversion factors preferred, trend factors will generate false signals.",
            "- **Choppy (noisy)**: Price moving erratically with no pattern. Indicators: high volatility relative to net movement, momentum consensus near zero with high uncertainty, innovation spikes in filter. Strategy implication: reduce position sizes, increase confidence threshold, few signals are reliable.",
            "- **Transitioning**: Regime is changing. Indicators: filter layers disagree (fast says one thing, slow says another), model stress elevated, spectral event active. Strategy implication: wait for new regime to establish.\n",
            "### Step 2: Liquidity Assessment",
            "Evaluate the current liquidity environment:",
            "- **Order flow health**: Cumulative OFI trend — growing means buyer/seller dominance. Flow momentum — is it accelerating or decelerating?",
            "- **Market depth**: Compare current depth to what is needed for position sizes in the strategy. If typical position is X SOL but depth is only 5X, slippage will be significant.",
            "- **Whale activity**: Number of recent whale signals, net pressure direction. High whale count often precedes large moves.",
            "- **Cluster activity**: Coordinated wallet groups — what phase? Accumulation clusters suggest impending buying pressure. Distribution suggests selling pressure.\n",
            "### Step 3: Momentum Consensus Interpretation",
            "Decode the momentum consensus components:",
            "- **Flow weight + direction**: How much order flow contributes and which way. High weight means flow is a strong signal.",
            "- **Whale weight + direction**: Institutional/large player direction. High whale weight means large transactions dominate the consensus.",
            "- **Cluster weight**: Coordinated group activity contribution. High cluster weight suggests smart money coordination.",
            "- **Velocity weight**: Rate of change contribution. High velocity weight means momentum is accelerating.",
            "- **Overall confidence**: If consensus confidence is low (<0.3), the components disagree — no clear momentum signal.",
            "- **Overall direction**: Positive = bullish consensus, negative = bearish. Magnitude indicates strength (>0.5 = strong).\n",
            "### Step 4: Price History Analysis",
            "Examine recent candle data for context:",
            "- Calculate recent volatility (e.g., standard deviation of returns over last 20 candles)",
            "- Identify support/resistance levels from recent highs and lows",
            "- Look for volume patterns: increasing volume on moves confirms trend, decreasing volume suggests fading",
            "- Compare recent range to historical: is the market expanded or compressed?\n",
            "### Step 5: Token-Level Comparison",
            "If multiple tokens are being tracked:",
            "- Compare volatility across tokens — which offer best risk/reward?",
            "- Compare liquidity — which can be traded without excessive slippage?",
            "- Compare momentum — which have clearest directional signals?",
            "- Use the `get_token_fundamentals` tool if available for on-chain metrics (holder distribution, transaction count, etc.)\n",
            "### Quality Checklist",
            "- [ ] Market regime classified (trending/mean-reverting/choppy/transitioning)",
            "- [ ] Liquidity environment assessed (depth, flow, whales, clusters)",
            "- [ ] Momentum consensus decoded and interpreted",
            "- [ ] Price history patterns identified",
            "- [ ] Strategy implications stated for current regime\n",

            "## Live Data\n",
            "### Microstructure State",
            "```json",
            JSON.stringify(microstructure, null, 2),
            "```\n",
            "### Price History",
            "```json",
            JSON.stringify(priceHistory, null, 2),
            "```\n",

            "## Analysis Required\n",
            "Based on the methodology above, analyze:",
            "1. What is the current market regime? Classify as trending/mean-reverting/choppy/transitioning with evidence from the data.",
            "2. How is liquidity? Assess order flow health, depth adequacy, and whale/cluster activity.",
            "3. Decode the momentum consensus: What is each component saying? Do they agree? What is the overall signal?",
            "4. What patterns emerge from the price history? What is recent volatility? Any key levels?",
            "5. What are the strategy implications? Given the current regime, which factor types should be favored or avoided?",
            "6. If the `get_token_fundamentals` tool is available, use it for key tokens to compare on-chain fundamentals and identify the best risk/reward opportunities.",
          ].join("\n")),
        ],
      };
    },
  );
}

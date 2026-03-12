---
name: market-context
description: |
  Assess market context: token fundamentals, liquidity environment, regime classification, and cross-token comparison.
  Triggers on: "market context", "market regime", "token comparison", "liquidity assessment",
  "market conditions", "token fundamentals", "is market trending", "market overview",
  "liquidity environment", "regime"
---

# Market Context

Evaluate the current market environment by gathering token fundamentals, assessing liquidity quality, determining the market regime, and comparing tokens in the tracked universe.

## Data Source Priority

1. FIRST: Use lab-mcp tools — `get_microstructure_state`, `get_candles`, `get_price_history`
2. THEN: Use lab-mcp tools — `get_filter_state`, `get_prediction_diagnostics`
3. THEN: Use lab-mcp fundamental tools — `get_token_fundamentals`, `compare_tokens`, `get_protocol_tvl`, `get_token_trader_stats`
4. ONLY IF NEEDED: Web search for macro context (but never reveal strategy intent in queries)

**Security note**: When using web search or external tools, only send generic market data queries. Never batch-query the exact tokens in the tracked universe in a pattern that reveals portfolio composition.

## Workflow

### Step 1: Gather Market Data

Call in parallel:
- `get_microstructure_state` — order flow, whale signals, cluster activity, spread, depth, toxicity
- `get_price_history` — OHLCV price data for tracked tokens
- `get_filter_state` — filter's estimate of current price dynamics
- `get_prediction_diagnostics` — Hurst exponent, drift, mean-reversion strength

For specific token candle data:
- `get_candles({ symbol: "SOL", timeframe: "1m" })` — high-frequency candle data
- `get_candles({ symbol: "SOL", timeframe: "1h" })` — lower-frequency for trend context

### Step 2: Token Fundamental Comparison

Use `compare_tokens` with CoinGecko IDs for a side-by-side view, or `get_token_fundamentals` for individual token detail (supports both CoinGecko IDs and Solana mint addresses). For on-chain trader activity, use `get_token_trader_stats` with the mint address. For DeFi protocol context, use `get_protocol_tvl` with the DeFi Llama slug.

Gather per-token:
- Market capitalization
- 24h trading volume
- Fully diluted valuation (FDV)
- Volume/Market Cap ratio (liquidity proxy)
- 24h price change percentage
- On-chain trader stats: buy/sell ratio, unique wallets (via `get_token_trader_stats`)

Build a fundamentals comparison table:

| Token | Market Cap | 24h Volume | Vol/MCap | 24h Change | Category   |
|-------|-----------|------------|----------|------------|------------|
| ...   | ...       | ...        | ...      | ...        | ...        |

**Category classification**:
- Large cap: Market cap > $1B
- Mid cap: $100M - $1B
- Small cap: $10M - $100M
- Micro cap: < $10M (higher risk, wider spreads, more manipulation)

### Step 3: Liquidity Environment Assessment

From `get_microstructure_state`, evaluate per-token:

| Metric           | Good              | Acceptable        | Poor              |
|------------------|-------------------|-------------------|-------------------|
| Spread           | < 20 bps          | 20-50 bps         | > 50 bps          |
| Depth score      | > 0.7             | 0.4-0.7           | < 0.4             |
| Toxicity         | < 0.3             | 0.3-0.6           | > 0.6             |
| OFI stability    | Low variance      | Moderate variance  | High variance     |

Build a liquidity comparison:

| Token | Spread (bps) | Depth Score | Toxicity | OFI Trend | Liquidity Grade |
|-------|-------------|-------------|----------|-----------|-----------------|
| ...   | ...         | ...         | ...      | ...       | A / B / C / D   |

**Liquidity grades**:
- A: All metrics good — safe for larger position sizes
- B: Most metrics acceptable — normal position sizing
- C: One or more metrics poor — reduce position size
- D: Multiple metrics poor — avoid trading or use minimal size

### Step 4: Market Regime Classification

Use the Hurst exponent from `get_prediction_diagnostics` and price action from candles:

| Hurst Exponent | Price Action        | Regime              | Strategy Implication       |
|----------------|---------------------|---------------------|----------------------------|
| > 0.60         | Clear directional   | **Trending**        | Momentum factors favored   |
| 0.45-0.60      | Choppy, ranging     | **Mean-Reverting**  | Mean-reversion favored     |
| ~ 0.50         | Random walk         | **Efficient**       | Hard to profit, reduce size |
| < 0.45         | Strong mean-revert  | **Anti-Persistent** | Fade moves, tight stops    |

Additional regime indicators:
- **Volatility regime**: Compare current ATR to 20-period average ATR
  - ATR > 1.5x average: High volatility regime
  - ATR 0.7x-1.5x average: Normal volatility
  - ATR < 0.7x average: Low volatility (compression, may precede breakout)

- **Whale regime**: From microstructure whale signals
  - Whale accumulation: Large wallets buying — potential uptrend
  - Whale distribution: Large wallets selling — potential downtrend
  - No whale activity: Retail-driven, lower conviction

- **Cluster regime**: From microstructure cluster activity
  - Coordinated buying: Strong bullish signal
  - Coordinated selling: Strong bearish signal
  - No coordination: Normal market conditions

### Step 5: Cross-Token Comparison

Compare tokens in the tracked universe:

| Token | Regime     | Liquidity | Whale Signal | Trend Dir. | Volatility | Rank |
|-------|------------|-----------|-------------|------------|------------|------|
| ...   | ...        | ...       | ...         | ...        | ...        | ...  |

Rank tokens by tradability (composite of liquidity, regime clarity, and signal quality):
1. Best regime for current strategy + good liquidity = highest rank
2. Unclear regime + poor liquidity = lowest rank

### Step 6: Regime Impact on Strategy

Cross-reference current regime with active strategy:
- If strategy relies heavily on momentum factors but regime is mean-reverting: **MISMATCH WARNING**
- If strategy has mean-reversion filters but regime is trending: filter may be blocking valid signals
- If volatility is very low: signals may be noise-dominated, consider increasing confidence threshold

### Step 7: Synthesis

Produce an overall market context assessment:
1. Current dominant regime across the tracked universe
2. Liquidity conditions (favorable, neutral, adverse)
3. Whale/cluster activity summary
4. Strategy-regime alignment assessment
5. Recommendations for position sizing adjustments based on conditions

## Quality Checklist

- [ ] Microstructure data gathered for all tracked tokens
- [ ] Token fundamentals retrieved (compare_tokens or get_token_fundamentals)
- [ ] Price history / candle data retrieved for regime analysis
- [ ] Hurst exponent used for regime classification
- [ ] Liquidity graded per token (A/B/C/D)
- [ ] Whale and cluster signals incorporated
- [ ] Volatility regime assessed (ATR comparison)
- [ ] Cross-token comparison table produced
- [ ] Strategy-regime alignment checked
- [ ] Generic queries used for any web search (no strategy intent leakage)

## Output Format

```
## Market Context Report

### Regime: [Trending / Mean-Reverting / Efficient / Anti-Persistent]
- Hurst exponent: [value]
- Volatility: [High / Normal / Low] (ATR ratio: [X]x)
- Whale activity: [Accumulating / Distributing / Neutral]

### Token Comparison

| Token | Regime     | Liquidity | Spread | Depth | Whale    | 24h Chg | Rank |
|-------|------------|-----------|--------|-------|----------|---------|------|
| ...   | ...        | ...       | ...    | ...   | ...      | ...     | ...  |

### Liquidity Environment
- Overall: [Favorable / Neutral / Adverse]
- Best liquidity: [Token] (Grade A)
- Worst liquidity: [Token] (Grade [X]) — [reason]

### Strategy Alignment
- Current strategy thesis: [momentum / mean-reversion / multi-factor]
- Regime match: [Aligned / Neutral / Mismatched]
- Recommendation: [description of any adjustments]

### Key Observations
1. [Most important market observation]
2. [Second most important]
3. [Third, if applicable]
```

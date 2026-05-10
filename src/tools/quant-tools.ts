import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { tierGatedTool } from "../auth/tierGate.js";

async function quantFetchWithBody(
  labUrl: string,
  path: string,
  method: string,
  body: unknown,
): Promise<string> {
  try {
    const res = await fetch(`${labUrl}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch((e) => {
        console.error("Failed to read error body:", e);
        return "";
      });
      return JSON.stringify({
        error: `${res.status} ${res.statusText}`,
        body: text,
      });
    }
    return JSON.stringify(await res.json(), null, 2);
  } catch (err) {
    return JSON.stringify({
      error: "service_unavailable",
      message: String(err),
    });
  }
}

export function registerQuantTools(server: McpServer, labUrl: string) {
  // ── GBM Simulation ──────────────────────────────────────────

  server.tool(
    "lab_quant_gbm",
    "Run Geometric Brownian Motion simulation. Returns simulated price paths with drift and volatility.",
    {
      s0: z.number().min(0.001).describe("Initial price"),
      mu: z.number().describe("Drift (annualized)"),
      sigma: z.number().positive().describe("Volatility (annualized)"),
      t: z.number().positive().describe("Time horizon in years"),
      num_paths: z
        .number()
        .min(1)
        .max(100000)
        .optional()
        .describe("Number of simulation paths (default: 10000)"),
    },
    tierGatedTool("tier-2", async ({ s0, mu, sigma, t, num_paths }) => ({
      content: [
        {
          type: "text",
          text: await quantFetchWithBody(labUrl, "/api/quant/gbm", "POST", {
            s0,
            mu,
            sigma,
            t,
            num_paths: num_paths ?? 10000,
          }),
        },
      ],
    })),
  );

  // ── Option Pricing ──────────────────────────────────────────

  server.tool(
    "lab_quant_option_price",
    "Price an option using Monte Carlo simulation. Returns estimated price with confidence interval.",
    {
      s: z.number().positive().describe("Current underlying price"),
      k: z.number().positive().describe("Strike price"),
      t: z.number().positive().describe("Time to expiry in years"),
      r: z.number().min(0).max(1).describe("Risk-free rate (annualized)"),
      sigma: z.number().positive().describe("Volatility (annualized)"),
      option_type: z.enum(["call", "put"]).describe("Option type: call or put"),
      num_sims: z
        .number()
        .min(1)
        .max(100000)
        .optional()
        .describe("Number of Monte Carlo simulations (default: 10000)"),
    },
    tierGatedTool(
      "tier-2",
      async ({ s, k, t, r, sigma, option_type, num_sims }) => ({
        content: [
          {
            type: "text",
            text: await quantFetchWithBody(
              labUrl,
              "/api/quant/mc-option",
              "POST",
              { s, k, t, r, sigma, option_type, num_sims: num_sims ?? 10000 },
            ),
          },
        ],
      }),
    ),
  );

  // ── Portfolio Optimization ──────────────────────────────────

  server.tool(
    "lab_quant_markowitz",
    "Run Markowitz mean-variance portfolio optimization. Returns optimal weights on the efficient frontier.",
    {
      expected_returns: z
        .array(z.number())
        .describe("Expected returns for each asset"),
      cov_matrix: z
        .array(z.array(z.number()))
        .describe("Covariance matrix (NxN array of arrays)"),
      risk_free_rate: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe("Risk-free rate for Sharpe ratio calculation"),
      target_return: z
        .number()
        .optional()
        .describe("Target portfolio return for constrained optimization"),
      max_iter: z
        .number()
        .min(1)
        .max(10000)
        .optional()
        .describe("Maximum iterations for optimization"),
    },
    tierGatedTool(
      "tier-2",
      async ({
        expected_returns,
        cov_matrix,
        risk_free_rate,
        target_return,
        max_iter,
      }) => {
        const body: Record<string, unknown> = {
          expected_returns,
          cov_matrix,
        };
        if (risk_free_rate !== undefined) body.risk_free_rate = risk_free_rate;
        if (target_return !== undefined) body.target_return = target_return;
        if (max_iter !== undefined) body.max_iter = max_iter;
        return {
          content: [
            {
              type: "text",
              text: await quantFetchWithBody(
                labUrl,
                "/api/quant/markowitz",
                "POST",
                body,
              ),
            },
          ],
        };
      },
    ),
  );

  // ── Copula Simulation ───────────────────────────────────────

  server.tool(
    "lab_quant_copula",
    "Simulate correlated random variables using copula models. Returns joint samples.",
    {
      copula_type: z
        .enum(["gaussian", "student_t", "clayton"])
        .describe("Copula family: gaussian, student_t, or clayton"),
      correlation: z.number().min(-1).max(1).describe("Correlation parameter"),
      df: z
        .number()
        .optional()
        .describe("Degrees of freedom (for student_t copula)"),
      num_samples: z
        .number()
        .min(1)
        .max(100000)
        .optional()
        .describe("Number of samples to generate"),
    },
    tierGatedTool(
      "tier-2",
      async ({ copula_type, correlation, df, num_samples }) => {
        const body: Record<string, unknown> = {
          copula_type,
          correlation,
        };
        if (df !== undefined) body.df = df;
        if (num_samples !== undefined) body.num_samples = num_samples;
        return {
          content: [
            {
              type: "text",
              text: await quantFetchWithBody(
                labUrl,
                "/api/quant/copula-simulate",
                "POST",
                body,
              ),
            },
          ],
        };
      },
    ),
  );

  // ── Student-t Fitting ───────────────────────────────────────

  server.tool(
    "lab_quant_fit_t",
    "Fit a Student-t distribution to observed data. Returns estimated degrees of freedom, location, and scale.",
    {
      data: z
        .array(z.number())
        .describe("Array of observed data points to fit"),
      max_iter: z
        .number()
        .min(1)
        .max(10000)
        .optional()
        .describe("Maximum iterations for MLE fitting"),
      tol: z.number().optional().describe("Convergence tolerance for fitting"),
    },
    tierGatedTool("tier-2", async ({ data, max_iter, tol }) => {
      const body: Record<string, unknown> = { data };
      if (max_iter !== undefined) body.max_iter = max_iter;
      if (tol !== undefined) body.tol = tol;
      return {
        content: [
          {
            type: "text",
            text: await quantFetchWithBody(
              labUrl,
              "/api/quant/fit-t",
              "POST",
              body,
            ),
          },
        ],
      };
    }),
  );

  // ── Prediction Scoring ──────────────────────────────────────

  server.tool(
    "lab_quant_brier",
    "Calculate Brier score for probabilistic predictions. Lower is better (0 = perfect, 1 = worst).",
    {
      predictions: z
        .array(z.tuple([z.number(), z.boolean()]))
        .describe(
          "Array of [probability, outcome] tuples where probability is 0-1 and outcome is true/false",
        ),
    },
    tierGatedTool("tier-2", async ({ predictions }) => ({
      content: [
        {
          type: "text",
          text: await quantFetchWithBody(
            labUrl,
            "/api/quant/brier-score",
            "POST",
            { predictions },
          ),
        },
      ],
    })),
  );

  // ── Black-Scholes ─────────────────────────────────────────

  server.tool(
    "lab_quant_black_scholes",
    "Price an option using the Black-Scholes model. Returns price and Greeks (delta, gamma, theta, vega, rho).",
    {
      s: z.number().positive().describe("Spot price"),
      k: z.number().positive().describe("Strike price"),
      t: z.number().positive().describe("Time to expiry in years"),
      r: z.number().min(0).max(1).describe("Risk-free rate (annualized, 0-1)"),
      sigma: z.number().positive().describe("Volatility (annualized)"),
      option_type: z.enum(["call", "put"]).describe("Option type: call or put"),
    },
    tierGatedTool("tier-2", async ({ s, k, t, r, sigma, option_type }) => ({
      content: [
        {
          type: "text",
          text: await quantFetchWithBody(
            labUrl,
            "/api/quant/black-scholes",
            "POST",
            { s, k, t, r, sigma, option_type },
          ),
        },
      ],
    })),
  );

  // ── GARCH Estimation ───────────────────────────────────────

  server.tool(
    "lab_quant_garch",
    "Fit GARCH(1,1) model to return series. Returns omega, alpha, beta parameters and multi-step volatility forecast.",
    {
      returns: z
        .array(z.number())
        .describe("Array of log returns to fit GARCH model"),
      forecast_steps: z
        .number()
        .min(1)
        .max(252)
        .optional()
        .describe("Number of steps to forecast volatility (default: 10)"),
    },
    tierGatedTool("tier-2", async ({ returns, forecast_steps }) => {
      const body: Record<string, unknown> = { returns };
      if (forecast_steps !== undefined) body.forecast_steps = forecast_steps;
      return {
        content: [
          {
            type: "text",
            text: await quantFetchWithBody(
              labUrl,
              "/api/quant/garch",
              "POST",
              body,
            ),
          },
        ],
      };
    }),
  );

  // ── Hurst Exponent ────────────────────────────────────────

  server.tool(
    "lab_quant_hurst",
    "Estimate Hurst exponent via R/S analysis. H<0.5 = mean-reverting, H=0.5 = random walk, H>0.5 = trending.",
    {
      data: z.array(z.number()).describe("Time series data points"),
    },
    tierGatedTool("tier-2", async ({ data }) => ({
      content: [
        {
          type: "text",
          text: await quantFetchWithBody(labUrl, "/api/quant/hurst", "POST", {
            data,
          }),
        },
      ],
    })),
  );

  // ── EWMA ──────────────────────────────────────────────────

  server.tool(
    "lab_quant_ewma",
    "Compute Exponentially Weighted Moving Average on a time series.",
    {
      data: z.array(z.number()).describe("Time series data points"),
      span: z
        .number()
        .min(2)
        .max(1000)
        .optional()
        .describe("EWMA span / lookback window (default: 20)"),
    },
    tierGatedTool("tier-2", async ({ data, span }) => {
      const body: Record<string, unknown> = { data };
      if (span !== undefined) body.span = span;
      return {
        content: [
          {
            type: "text",
            text: await quantFetchWithBody(
              labUrl,
              "/api/quant/ewma",
              "POST",
              body,
            ),
          },
        ],
      };
    }),
  );

  // ── Jump Detection ────────────────────────────────────────

  server.tool(
    "lab_quant_jump_detection",
    "Detect jumps/discontinuities in a price series using statistical methods.",
    {
      prices: z.array(z.number()).describe("Price series to analyze"),
      threshold: z
        .number()
        .positive()
        .optional()
        .describe("Z-score threshold for jump detection (default: 3.0)"),
    },
    tierGatedTool("tier-2", async ({ prices, threshold }) => {
      const body: Record<string, unknown> = { prices };
      if (threshold !== undefined) body.threshold = threshold;
      return {
        content: [
          {
            type: "text",
            text: await quantFetchWithBody(
              labUrl,
              "/api/quant/jump-detection",
              "POST",
              body,
            ),
          },
        ],
      };
    }),
  );

  // ── Autocorrelation ───────────────────────────────────────

  server.tool(
    "lab_quant_autocorrelation",
    "Compute autocorrelation function (ACF) for a time series at multiple lags.",
    {
      data: z.array(z.number()).describe("Time series data points"),
      max_lag: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Maximum lag to compute (default: 20)"),
    },
    tierGatedTool("tier-2", async ({ data, max_lag }) => {
      const body: Record<string, unknown> = { data };
      if (max_lag !== undefined) body.max_lag = max_lag;
      return {
        content: [
          {
            type: "text",
            text: await quantFetchWithBody(
              labUrl,
              "/api/quant/autocorrelation",
              "POST",
              body,
            ),
          },
        ],
      };
    }),
  );

  // ── ADF Test ──────────────────────────────────────────────

  server.tool(
    "lab_quant_adf",
    "Run Augmented Dickey-Fuller test for stationarity. Returns test statistic, p-value, and critical values.",
    {
      data: z.array(z.number()).describe("Time series data to test"),
      max_lags: z
        .number()
        .min(0)
        .max(50)
        .optional()
        .describe("Maximum number of lags to include (default: auto)"),
    },
    tierGatedTool("tier-2", async ({ data, max_lags }) => {
      const body: Record<string, unknown> = { data };
      if (max_lags !== undefined) body.max_lags = max_lags;
      return {
        content: [
          {
            type: "text",
            text: await quantFetchWithBody(
              labUrl,
              "/api/quant/adf",
              "POST",
              body,
            ),
          },
        ],
      };
    }),
  );

  // ── K-Means Clustering ────────────────────────────────────

  server.tool(
    "lab_quant_kmeans",
    "Run k-means clustering on multi-dimensional data. Returns cluster assignments and centroids.",
    {
      data: z
        .array(z.array(z.number()))
        .describe("Data points as array of feature vectors"),
      k: z.number().min(2).max(20).describe("Number of clusters"),
      max_iter: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .describe("Maximum iterations (default: 100)"),
    },
    tierGatedTool("tier-2", async ({ data, k, max_iter }) => {
      const body: Record<string, unknown> = { data, k };
      if (max_iter !== undefined) body.max_iter = max_iter;
      return {
        content: [
          {
            type: "text",
            text: await quantFetchWithBody(
              labUrl,
              "/api/quant/kmeans",
              "POST",
              body,
            ),
          },
        ],
      };
    }),
  );

  // ── Feature Extraction ────────────────────────────────────

  server.tool(
    "lab_quant_features",
    "Extract statistical features from a time series: mean, std, skew, kurtosis, min, max, autocorrelation.",
    {
      data: z.array(z.number()).describe("Time series data points"),
      window: z
        .number()
        .min(5)
        .max(500)
        .optional()
        .describe("Rolling window size for feature computation (default: 20)"),
    },
    tierGatedTool("tier-2", async ({ data, window }) => {
      const body: Record<string, unknown> = { data };
      if (window !== undefined) body.window = window;
      return {
        content: [
          {
            type: "text",
            text: await quantFetchWithBody(
              labUrl,
              "/api/quant/features",
              "POST",
              body,
            ),
          },
        ],
      };
    }),
  );

  // ── Efficient Frontier ────────────────────────────────────

  server.tool(
    "lab_quant_efficient_frontier",
    "Compute the efficient frontier for a set of assets. Returns portfolio allocations across the risk-return spectrum.",
    {
      expected_returns: z
        .array(z.number())
        .describe("Expected returns for each asset"),
      cov_matrix: z
        .array(z.array(z.number()))
        .describe("Covariance matrix (NxN array of arrays)"),
      num_points: z
        .number()
        .min(5)
        .max(200)
        .optional()
        .describe("Number of points on the frontier (default: 20)"),
      risk_free_rate: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe("Risk-free rate (default: 0.02)"),
    },
    tierGatedTool(
      "tier-2",
      async ({ expected_returns, cov_matrix, num_points, risk_free_rate }) => {
        const body: Record<string, unknown> = {
          expected_returns,
          cov_matrix,
          num_points: num_points ?? 20,
          risk_free_rate: risk_free_rate ?? 0.02,
        };
        return {
          content: [
            {
              type: "text",
              text: await quantFetchWithBody(
                labUrl,
                "/api/quant/efficient-frontier",
                "POST",
                body,
              ),
            },
          ],
        };
      },
    ),
  );
}

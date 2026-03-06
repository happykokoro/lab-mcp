import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { tierGatedTool } from "../auth/tierGate.js";

async function tradFetch(labUrl: string, path: string): Promise<string> {
  const res = await fetch(`${labUrl}${path}`);
  if (!res.ok) {
    const body = await res.text().catch((e) => {
      console.error("Failed to read error body:", e);
      return "";
    });
    return JSON.stringify({ error: `${res.status} ${res.statusText}`, body });
  }
  return JSON.stringify(await res.json(), null, 2);
}

export function registerTradfiTools(server: McpServer, labUrl: string) {
  server.tool(
    "lab_tradfi_positions",
    "List traditional finance positions (equities, options, forex)",
    {},
    tierGatedTool("level1", async () => ({
      content: [
        {
          type: "text",
          text: await tradFetch(labUrl, "/api/tradfi/positions"),
        },
      ],
    })),
  );

  server.tool(
    "lab_tradfi_greeks",
    "Get option Greeks for all options positions (delta, gamma, theta, vega)",
    {},
    tierGatedTool("level1", async () => ({
      content: [
        {
          type: "text",
          text: await tradFetch(labUrl, "/api/tradfi/greeks"),
        },
      ],
    })),
  );

  server.tool(
    "lab_tradfi_risk",
    "Get traditional finance risk metrics (VaR, Sharpe, max drawdown)",
    {},
    tierGatedTool("level1", async () => ({
      content: [
        {
          type: "text",
          text: await tradFetch(labUrl, "/api/tradfi/risk"),
        },
      ],
    })),
  );

  server.tool(
    "lab_tradfi_stress_test",
    "Run stress test scenarios on the traditional finance portfolio",
    {},
    tierGatedTool("level1", async () => ({
      content: [
        {
          type: "text",
          text: await tradFetch(labUrl, "/api/tradfi/stress-test"),
        },
      ],
    })),
  );
}

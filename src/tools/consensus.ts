import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { tierGatedTool } from "../auth/tierGate.js";

async function consFetch(labUrl: string, path: string): Promise<string> {
  try {
    const res = await fetch(`${labUrl}${path}`);
    if (!res.ok) {
      const body = await res.text().catch((e) => {
        console.error("Failed to read error body:", e);
        return "";
      });
      return JSON.stringify({ error: `${res.status} ${res.statusText}`, body });
    }
    return JSON.stringify(await res.json(), null, 2);
  } catch (err) {
    return JSON.stringify({
      error: "service_unavailable",
      message: String(err),
    });
  }
}

async function consFetchWithBody(
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

export function registerConsensusTools(server: McpServer, labUrl: string) {
  server.tool(
    "lab_consensus",
    "Get current consensus view across all factors for tracked tokens",
    {},
    tierGatedTool("free", async () => ({
      content: [
        {
          type: "text",
          text: await consFetch(labUrl, "/api/consensus"),
        },
      ],
    })),
  );

  server.tool(
    "lab_consensus_contribute",
    "Submit a manual signal contribution to the consensus",
    {
      token_mint: z.string().describe("Token mint address"),
      direction: z
        .enum(["long", "short"])
        .describe("Signal direction ('long' or 'short')"),
      confidence: z
        .number()
        .min(0)
        .max(1)
        .describe("Confidence level (0.0 to 1.0)"),
    },
    tierGatedTool("level2", async ({ token_mint, direction, confidence }) => ({
      content: [
        {
          type: "text",
          text: await consFetchWithBody(
            labUrl,
            "/api/consensus/contribute",
            "POST",
            { token_mint, direction, confidence },
          ),
        },
      ],
    })),
  );

  server.tool(
    "lab_consensus_tokens",
    "List tokens with active consensus signals",
    {},
    tierGatedTool("free", async () => ({
      content: [
        {
          type: "text",
          text: await consFetch(labUrl, "/api/consensus/tokens"),
        },
      ],
    })),
  );
}

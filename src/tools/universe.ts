import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { tierGatedTool } from "../auth/tierGate.js";

async function univFetch(labUrl: string, path: string): Promise<string> {
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

export function registerUniverseTools(server: McpServer, labUrl: string) {
  server.tool(
    "lab_universe_stats",
    "Get token universe statistics (total tracked, active, volume breakdown)",
    {},
    tierGatedTool("free", async () => ({
      content: [
        {
          type: "text",
          text: await univFetch(labUrl, "/api/universe/stats"),
        },
      ],
    })),
  );

  server.tool(
    "lab_universe_profiles",
    "List all token profiles in the universe with scores and metadata",
    {},
    tierGatedTool("level1", async () => ({
      content: [
        {
          type: "text",
          text: await univFetch(labUrl, "/api/universe/profiles"),
        },
      ],
    })),
  );

  server.tool(
    "lab_universe_profile",
    "Get detailed profile for a specific token by mint address",
    {
      mint: z.string().describe("Token mint address to look up"),
    },
    tierGatedTool("level1", async ({ mint }) => ({
      content: [
        {
          type: "text",
          text: await univFetch(
            labUrl,
            `/api/universe/profiles/${encodeURIComponent(mint as string)}`,
          ),
        },
      ],
    })),
  );
}

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PlatformClient } from "../client/platform.js";
import { tierGatedTool } from "../auth/tierGate.js";

export function registerArtifactTools(server: McpServer, platformUrl: string) {
  const client = new PlatformClient(platformUrl, process.env.API_KEY);

  server.tool(
    "artifact_export",
    "Export the current strategy configuration as a deployable protobuf artifact",
    {},
    tierGatedTool("tier-3", async () => ({
      content: [{ type: "text", text: await client.exportArtifact() }],
    })),
  );

  server.tool(
    "artifact_validate",
    "Validate an artifact without deploying it. Checks schema, factor references, and risk parameters.",
    {
      artifact: z.record(z.unknown()).describe("Artifact object to validate"),
    },
    tierGatedTool("tier-3", async ({ artifact }) => ({
      content: [
        { type: "text", text: await client.validateArtifact(artifact) },
      ],
    })),
  );

  server.tool(
    "artifact_load",
    "Load an artifact from a file path into the system",
    {
      file_path: z.string().describe("Absolute path to the artifact file"),
    },
    tierGatedTool("tier-3", async ({ file_path }) => ({
      content: [
        { type: "text", text: await client.loadArtifact(file_path as string) },
      ],
    })),
  );

  server.tool(
    "artifact_list",
    "List all saved strategy artifacts with version, creation time, and validity status",
    {},
    tierGatedTool("tier-3", async () => ({
      content: [{ type: "text", text: await client.listArtifacts() }],
    })),
  );
}

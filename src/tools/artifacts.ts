import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PlatformClient } from "../client/platform.js";

export function registerArtifactTools(server: McpServer, platformUrl: string) {
  const client = new PlatformClient(platformUrl, process.env.API_KEY);

  server.tool(
    "artifact_export",
    "Export the current strategy configuration as a deployable protobuf artifact",
    {},
    async () => ({
      content: [{ type: "text", text: await client.exportArtifact() }],
    }),
  );

  server.tool(
    "artifact_validate",
    "Validate an artifact without deploying it. Checks schema, factor references, and risk parameters.",
    {
      artifact: z.record(z.unknown()).describe("Artifact object to validate"),
    },
    async ({ artifact }) => ({
      content: [
        { type: "text", text: await client.validateArtifact(artifact) },
      ],
    }),
  );

  server.tool(
    "artifact_load",
    "Load an artifact from a file path into the system",
    {
      file_path: z.string().describe("Absolute path to the artifact file"),
    },
    async ({ file_path }) => ({
      content: [{ type: "text", text: await client.loadArtifact(file_path) }],
    }),
  );

  server.tool(
    "artifact_list",
    "List all saved strategy artifacts with version, creation time, and validity status",
    {},
    async () => ({
      content: [{ type: "text", text: await client.listArtifacts() }],
    }),
  );
}

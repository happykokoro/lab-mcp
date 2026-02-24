import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerLabTools } from "./tools/lab.js";
import { registerEngineTools } from "./tools/engine.js";
import { registerDataSourceTools } from "./tools/data-sources.js";
import { registerArtifactTools } from "./tools/artifacts.js";
import { registerAdminTools } from "./tools/admin.js";

const LAB_URL = process.env.LAB_URL ?? "http://localhost:4000";
const PRICING_URL = process.env.PRICING_URL ?? "http://localhost:4002";
const PLATFORM_URL = process.env.PLATFORM_URL ?? "http://localhost:4000";

const server = new McpServer({
  name: "lab-mcp",
  version: "2.0.0",
});

// Register tool groups
registerLabTools(server, LAB_URL, PRICING_URL);
registerEngineTools(server, PLATFORM_URL);
registerDataSourceTools(server, PLATFORM_URL);
registerArtifactTools(server, PLATFORM_URL);
registerAdminTools(server, PLATFORM_URL);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

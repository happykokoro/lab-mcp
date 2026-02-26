import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { ServiceRegistry } from "./clients/registry.js";
import { registerAllTools } from "./tools/index.js";
import { registerAllResources } from "./resources/index.js";
import { registerAllPrompts } from "./prompts/index.js";

async function main() {
  const config = loadConfig();

  const server = new McpServer({
    name: "lab-mcp",
    version: "3.0.0",
  });

  const registry = new ServiceRegistry(config);

  // Register all MCP primitives
  registerAllTools(server, registry);
  registerAllResources(server, registry);
  registerAllPrompts(server, registry);

  // Start periodic health checks
  registry.startHealthChecks();

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Graceful shutdown
  process.on("SIGINT", async () => {
    registry.stopHealthChecks();
    await server.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

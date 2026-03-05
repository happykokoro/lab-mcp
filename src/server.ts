import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerLabTools } from "./tools/lab.js";
import { registerEngineTools } from "./tools/engine.js";
import { registerDataSourceTools } from "./tools/data-sources.js";
import { registerArtifactTools } from "./tools/artifacts.js";
import { registerAdminTools } from "./tools/admin.js";

export interface ServerUrls {
  labUrl: string;
  pricingUrl: string;
  platformUrl: string;
}

export function createMcpServer(urls: ServerUrls): McpServer {
  const server = new McpServer({
    name: "lab-mcp",
    version: "2.0.0",
  });

  registerLabTools(server, urls.labUrl, urls.pricingUrl);
  registerEngineTools(server, urls.platformUrl);
  registerDataSourceTools(server, urls.platformUrl);
  registerArtifactTools(server, urls.platformUrl);
  registerAdminTools(server, urls.platformUrl);

  return server;
}

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceRegistry } from "../clients/registry.js";
import { registerLabResources } from "./lab.js";

export function registerAllResources(server: McpServer, registry: ServiceRegistry): void {
  registerLabResources(server, registry);
}

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceRegistry } from "../clients/registry.js";
import { registerAnalysisPrompts } from "./analysis.js";

export function registerAllPrompts(server: McpServer, registry: ServiceRegistry): void {
  registerAnalysisPrompts(server, registry);
}

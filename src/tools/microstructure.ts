import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceRegistry } from "../clients/registry.js";
import { McpServiceError } from "../types/errors.js";

export function registerMicrostructureTools(server: McpServer, reg: ServiceRegistry) {
  server.registerTool(
    "get_microstructure_state",
    {
      description: "Get microstructure state: order flow (OFI, momentum), whale signals, cluster activity, convergence gate, momentum consensus",
    },
    async () => {
      try {
        const data = await reg.lab.getMicrostructureState();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );
}

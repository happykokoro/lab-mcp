import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ServiceRegistry } from "../clients/registry.js";
import { McpServiceError } from "../types/errors.js";

export function registerSignalTools(server: McpServer, reg: ServiceRegistry) {
  server.registerTool(
    "get_signals",
    {
      description: "List all active factor signals with direction, confidence, token, and metadata",
    },
    async () => {
      try {
        const data = await reg.lab.getSignals();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );

  server.registerTool(
    "get_pending_signals",
    {
      description: "List signals awaiting manual approval before execution (risk-checked, pending human confirmation)",
    },
    async () => {
      try {
        const data = await reg.lab.getPendingSignals();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );

  server.registerTool(
    "approve_signal",
    {
      description: "Approve a pending signal for paper execution. The signal must be in 'pending' status.",
      inputSchema: { signal_id: z.string().describe("The ID of the pending signal to approve") },
    },
    async ({ signal_id }) => {
      try {
        const data = await reg.lab.approveSignal(signal_id);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        if (e instanceof McpServiceError) return e.toToolResult();
        throw e;
      }
    },
  );
}

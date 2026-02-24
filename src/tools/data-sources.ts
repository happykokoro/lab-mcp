import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PlatformClient } from "../client/platform.js";

export function registerDataSourceTools(
  server: McpServer,
  platformUrl: string,
) {
  const client = new PlatformClient(platformUrl, process.env.API_KEY);

  server.tool(
    "data_list_sources",
    "List available data source adapters with their asset class and connection status",
    {},
    async () => ({
      content: [{ type: "text", text: await client.listDataSources() }],
    }),
  );

  server.tool(
    "data_start_adapter",
    "Start a data source adapter by name. Optionally pass configuration overrides.",
    {
      name: z
        .string()
        .describe("Adapter name (e.g. 'binance-spot', 'pyth-solana')"),
      config: z
        .record(z.unknown())
        .optional()
        .describe("Optional configuration overrides for the adapter"),
    },
    async ({ name, config }) => ({
      content: [
        { type: "text", text: await client.startAdapter(name, config) },
      ],
    }),
  );

  server.tool(
    "data_stop_adapter",
    "Stop a running data source adapter by name",
    {
      name: z.string().describe("Adapter name to stop"),
    },
    async ({ name }) => ({
      content: [{ type: "text", text: await client.stopAdapter(name) }],
    }),
  );

  server.tool(
    "data_upload",
    "Upload market data (JSONL or CSV) for replay backtesting",
    {
      format: z
        .enum(["jsonl", "csv"])
        .describe("Data format: 'jsonl' or 'csv'"),
      data: z.string().describe("Raw data content to upload"),
    },
    async ({ format, data }) => ({
      content: [{ type: "text", text: await client.uploadData(format, data) }],
    }),
  );

  server.tool(
    "data_adapter_status",
    "Check health and event rates for a specific data source adapter",
    {
      name: z.string().describe("Adapter name to check"),
    },
    async ({ name }) => ({
      content: [{ type: "text", text: await client.getAdapterStatus(name) }],
    }),
  );
}

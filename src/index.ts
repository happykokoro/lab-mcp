import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./server.js";
import { startHttpServer } from "./transport/http.js";

const LAB_URL = process.env.LAB_URL ?? "http://localhost:4100";
const PRICING_URL = process.env.PRICING_URL ?? "http://localhost:4002";
const PLATFORM_URL = process.env.PLATFORM_URL ?? "http://localhost:4000";
const TERMINAL_URL = process.env.TERMINAL_URL ?? "http://localhost:4200";
const MCP_TRANSPORT = process.env.MCP_TRANSPORT ?? "http";
const MCP_PORT = parseInt(process.env.MCP_PORT ?? "3100", 10);

const urls = {
  labUrl: LAB_URL,
  pricingUrl: PRICING_URL,
  platformUrl: PLATFORM_URL,
  terminalUrl: TERMINAL_URL,
};

async function main() {
  if (MCP_TRANSPORT === "stdio") {
    const server = createMcpServer(urls);
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } else {
    startHttpServer(urls, MCP_PORT);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

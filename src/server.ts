import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerLabTools } from "./tools/lab.js";
import { registerEngineTools } from "./tools/engine.js";
import { registerDataSourceTools } from "./tools/data-sources.js";
import { registerArtifactTools } from "./tools/artifacts.js";
import { registerAdminTools } from "./tools/admin.js";
import { registerPolymarketTools } from "./tools/polymarket.js";
import { registerBacktestJobTools } from "./tools/backtest-jobs.js";
import { registerAlertTools } from "./tools/alerts.js";
import { registerRebalanceTools } from "./tools/rebalance.js";
import { registerTradfiTools } from "./tools/tradfi.js";
import { registerUniverseTools } from "./tools/universe.js";
import { registerConsensusTools } from "./tools/consensus.js";

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
  registerPolymarketTools(server, urls.labUrl);
  registerBacktestJobTools(server, urls.labUrl);
  registerAlertTools(server, urls.labUrl);
  registerRebalanceTools(server, urls.labUrl);
  registerTradfiTools(server, urls.labUrl);
  registerUniverseTools(server, urls.labUrl);
  registerConsensusTools(server, urls.labUrl);

  return server;
}

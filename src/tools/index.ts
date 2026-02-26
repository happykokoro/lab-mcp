import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceRegistry } from "../clients/registry.js";
import { registerSignalTools } from "./signals.js";
import { registerPositionTools } from "./positions.js";
import { registerFactorTools } from "./factors.js";
import { registerPredictionTools } from "./predictions.js";
import { registerStrategyTools } from "./strategy.js";
import { registerDiagnosticTools } from "./diagnostics.js";
import { registerExecutionTools } from "./execution.js";
import { registerMicrostructureTools } from "./microstructure.js";
import { registerBacktestTools } from "./backtest.js";
import { registerMarketTools } from "./market.js";
import { registerEventTools } from "./events.js";
import { registerEngineTools } from "./engine.js";
import { registerAdminTools } from "./admin.js";

export function registerAllTools(server: McpServer, registry: ServiceRegistry): void {
  // Lab tools (direct)
  registerSignalTools(server, registry);
  registerPositionTools(server, registry);
  registerFactorTools(server, registry);
  registerPredictionTools(server, registry);
  registerStrategyTools(server, registry);
  registerDiagnosticTools(server, registry);
  registerExecutionTools(server, registry);
  registerMicrostructureTools(server, registry);
  registerBacktestTools(server, registry);
  registerMarketTools(server, registry);
  registerEventTools(server, registry);

  // Platform tools (auth required)
  registerEngineTools(server, registry);
  registerAdminTools(server, registry);
}

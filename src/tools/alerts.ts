import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { tierGatedTool } from "../auth/tierGate.js";

async function alertFetch(
  labUrl: string,
  path: string,
  method = "GET",
): Promise<string> {
  try {
    const res = await fetch(`${labUrl}${path}`, { method });
    if (!res.ok) {
      const body = await res.text().catch((e) => {
        console.error("Failed to read error body:", e);
        return "";
      });
      return JSON.stringify({ error: `${res.status} ${res.statusText}`, body });
    }
    return JSON.stringify(await res.json(), null, 2);
  } catch (err) {
    return JSON.stringify({
      error: "service_unavailable",
      message: String(err),
    });
  }
}

async function alertFetchWithBody(
  labUrl: string,
  path: string,
  method: string,
  body: unknown,
): Promise<string> {
  try {
    const res = await fetch(`${labUrl}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch((e) => {
        console.error("Failed to read error body:", e);
        return "";
      });
      return JSON.stringify({
        error: `${res.status} ${res.statusText}`,
        body: text,
      });
    }
    return JSON.stringify(await res.json(), null, 2);
  } catch (err) {
    return JSON.stringify({
      error: "service_unavailable",
      message: String(err),
    });
  }
}

export function registerAlertTools(server: McpServer, labUrl: string) {
  server.tool(
    "lab_alert_channels",
    "List all configured alert channels (Discord, Telegram, webhook, etc.)",
    {},
    tierGatedTool("level1", async () => ({
      content: [
        {
          type: "text",
          text: await alertFetch(labUrl, "/api/alerts/channels"),
        },
      ],
    })),
  );

  server.tool(
    "lab_alert_channel_create",
    "Create a new alert channel",
    {
      type: z
        .string()
        .describe("Channel type (e.g. 'discord', 'telegram', 'webhook')"),
      config: z
        .record(z.unknown())
        .describe("Channel configuration (url, chat_id, etc.)"),
    },
    tierGatedTool("level2", async ({ type, config }) => ({
      content: [
        {
          type: "text",
          text: await alertFetchWithBody(
            labUrl,
            "/api/alerts/channels",
            "POST",
            { type, config },
          ),
        },
      ],
    })),
  );

  server.tool(
    "lab_alert_channel_delete",
    "Delete an alert channel by ID",
    {
      channel_id: z.string().describe("The alert channel ID to delete"),
    },
    tierGatedTool("level2", async ({ channel_id }) => ({
      content: [
        {
          type: "text",
          text: await alertFetch(
            labUrl,
            `/api/alerts/channels/${encodeURIComponent(channel_id as string)}`,
            "DELETE",
          ),
        },
      ],
    })),
  );

  server.tool(
    "lab_alert_channel_test",
    "Send a test alert to a channel to verify configuration",
    {
      channel_id: z.string().describe("The alert channel ID to test"),
    },
    tierGatedTool("level2", async ({ channel_id }) => ({
      content: [
        {
          type: "text",
          text: await alertFetch(
            labUrl,
            `/api/alerts/channels/${encodeURIComponent(channel_id as string)}/test`,
            "POST",
          ),
        },
      ],
    })),
  );

  server.tool(
    "lab_alert_preferences",
    "Get current alert preferences (which events trigger alerts, thresholds)",
    {},
    tierGatedTool("level1", async () => ({
      content: [
        {
          type: "text",
          text: await alertFetch(labUrl, "/api/alerts/preferences"),
        },
      ],
    })),
  );

  server.tool(
    "lab_alert_preferences_update",
    "Update alert preferences",
    {
      preferences: z
        .record(z.unknown())
        .describe("Alert preference settings to update"),
    },
    tierGatedTool("level2", async ({ preferences }) => ({
      content: [
        {
          type: "text",
          text: await alertFetchWithBody(
            labUrl,
            "/api/alerts/preferences",
            "PUT",
            preferences,
          ),
        },
      ],
    })),
  );

  server.tool(
    "lab_alert_history",
    "Get recent alert history (sent alerts with timestamps and delivery status)",
    {},
    tierGatedTool("level1", async () => ({
      content: [
        {
          type: "text",
          text: await alertFetch(labUrl, "/api/alerts/history"),
        },
      ],
    })),
  );
}

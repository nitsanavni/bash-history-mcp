#!/usr/bin/env bun

/**
 * Atuin MCP Server - Read access to atuin history
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "atuin-history",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_history",
        description: "Search command history using atuin. Returns matching commands with timestamps and context.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query to find matching commands",
            },
            limit: {
              type: "number",
              description: "Maximum number of results to return (default: 5)",
              default: 5,
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_recent_history",
        description: "Get recent command history from atuin with timestamps and exit codes.",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Number of recent commands to retrieve (default: 5)",
              default: 5,
            },
          },
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "search_history") {
    const query = args.query as string;
    const limit = (args.limit as number) || 5;

    try {
      const proc = Bun.spawn(
        [
          "atuin",
          "search",
          "--limit",
          String(limit),
          "--search-mode",
          "fuzzy",
          "--filter-mode",
          "global",
          "--cmd-only",
          query,
        ],
        {
          stdout: "pipe",
          stderr: "pipe",
        }
      );

      const exitCode = await proc.exited;
      const stdout = await Bun.readableStreamToText(proc.stdout);
      const stderr = await Bun.readableStreamToText(proc.stderr);

      if (exitCode !== 0) {
        return {
          content: [
            {
              type: "text",
              text: `Error searching history: ${stderr}`,
            },
          ],
        };
      }

      const commands = stdout.trim().split("\n").filter((line) => line.length > 0);

      return {
        content: [
          {
            type: "text",
            text: `Found ${commands.length} matching commands:\n\n${commands.join("\n")}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error}`,
          },
        ],
      };
    }
  }

  if (name === "get_recent_history") {
    const limit = (args.limit as number) || 5;

    try {
      const proc = Bun.spawn(
        [
          "atuin",
          "search",
          "--limit",
          String(limit),
          "--search-mode",
          "fuzzy",
          "--filter-mode",
          "global",
          "--cmd-only",
          "",
        ],
        {
          stdout: "pipe",
          stderr: "pipe",
        }
      );

      const exitCode = await proc.exited;
      const stdout = await Bun.readableStreamToText(proc.stdout);
      const stderr = await Bun.readableStreamToText(proc.stderr);

      if (exitCode !== 0) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting recent history: ${stderr}`,
            },
          ],
        };
      }

      const commands = stdout.trim().split("\n").filter((line) => line.length > 0);

      return {
        content: [
          {
            type: "text",
            text: `Recent ${commands.length} commands:\n\n${commands.join("\n")}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error}`,
          },
        ],
      };
    }
  }

  return {
    content: [
      {
        type: "text",
        text: `Unknown tool: ${name}`,
      },
    ],
  };
});

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);

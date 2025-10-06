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
        description: "Search command history using atuin. Returns matching commands with timestamps and context. You can also use atuin directly via bash - try 'atuin --help' to learn more.",
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
            include_failed: {
              type: "boolean",
              description: "Include commands that failed (non-zero exit code). Default: false",
              default: false,
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_recent_history",
        description: "Get recent command history from atuin with timestamps and exit codes. You can also use atuin directly via bash - try 'atuin --help' to learn more.",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Number of recent commands to retrieve (default: 5)",
              default: 5,
            },
            include_failed: {
              type: "boolean",
              description: "Include commands that failed (non-zero exit code). Default: false",
              default: false,
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
    const includeFailed = (args.include_failed as boolean) || false;

    try {
      const proc = Bun.spawn(
        [
          "atuin",
          "search",
          "--limit",
          String(limit * 2), // Request more to account for filtering
          "--search-mode",
          "fuzzy",
          "--filter-mode",
          "global",
          "--format",
          "{exit}\t{command}",
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

      const lines = stdout.trim().split("\n").filter((line) => line.length > 0);
      let commands = lines
        .map((line) => {
          const [exitCodeStr, ...commandParts] = line.split("\t");
          return {
            exitCode: parseInt(exitCodeStr, 10),
            command: commandParts.join("\t"),
          };
        })
        .filter((item) => includeFailed || item.exitCode === 0)
        .map((item) => item.command)
        .slice(0, limit);

      const atuinCommand = `atuin search --limit ${limit * 2} --search-mode fuzzy --filter-mode global --format "{exit}\\t{command}" "${query}"`;

      return {
        content: [
          {
            type: "text",
            text: `Found ${commands.length} matching commands:\n\n${commands.join("\n")}\n\n---\nAtuin command used:\n${atuinCommand}`,
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
    const includeFailed = (args.include_failed as boolean) || false;

    try {
      const proc = Bun.spawn(
        [
          "atuin",
          "search",
          "--limit",
          String(limit * 2), // Request more to account for filtering
          "--search-mode",
          "fuzzy",
          "--filter-mode",
          "global",
          "--format",
          "{exit}\t{command}",
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

      const lines = stdout.trim().split("\n").filter((line) => line.length > 0);
      let commands = lines
        .map((line) => {
          const [exitCodeStr, ...commandParts] = line.split("\t");
          return {
            exitCode: parseInt(exitCodeStr, 10),
            command: commandParts.join("\t"),
          };
        })
        .filter((item) => includeFailed || item.exitCode === 0)
        .map((item) => item.command)
        .slice(0, limit);

      const atuinCommand = `atuin search --limit ${limit * 2} --search-mode fuzzy --filter-mode global --format "{exit}\\t{command}" ""`;

      return {
        content: [
          {
            type: "text",
            text: `Recent ${commands.length} commands:\n\n${commands.join("\n")}\n\n---\nAtuin command used:\n${atuinCommand}`,
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

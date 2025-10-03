#!/usr/bin/env bun

const subcommand = process.argv[2];

if (subcommand === "hook") {
  await import("./index.ts");
} else if (subcommand === "mcp") {
  await import("./server.ts");
} else {
  console.error(`Usage: bash-history-mcp <hook|mcp>`);
  process.exit(1);
}

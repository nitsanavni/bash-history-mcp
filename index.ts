#!/usr/bin/env bun

/**
 * Claude Code PostToolUse hook for atuin integration
 * Adds bash commands to atuin history
 */

interface ToolInput {
  command: string;
  description?: string;
  timeout?: number;
}

interface HookInput {
  tool_name: string;
  tool_input: ToolInput;
  tool_response?: {
    exit_code?: number;
  };
}

async function main() {
  try {
    // Read JSON from stdin
    const input = await Bun.stdin.text();
    const data: HookInput = JSON.parse(input);

    // Only process Bash tool calls
    if (data.tool_name !== "Bash") {
      process.exit(0);
    }

    const command = data.tool_input.command;
    const exitCode = data.tool_response?.exit_code ?? 0;

    // Step 1: Start the command to get an ID
    const startProc = Bun.spawn(["atuin", "history", "start", command], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const startExitCode = await startProc.exited;
    if (startExitCode !== 0) {
      const stderr = await Bun.readableStreamToText(startProc.stderr);
      console.error(`Failed to start atuin history entry: ${stderr}`);
      process.exit(0);
    }

    const id = (await Bun.readableStreamToText(startProc.stdout)).trim();

    // Step 2: End the command with the exit code
    const endProc = Bun.spawn(
      ["atuin", "history", "end", "--exit", String(exitCode), "--duration", "0", id],
      {
        stderr: "pipe",
      }
    );

    const endExitCode = await endProc.exited;
    if (endExitCode !== 0) {
      const stderr = await Bun.readableStreamToText(endProc.stderr);
      console.error(`Failed to end atuin history entry: ${stderr}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("Hook error:", error);
    process.exit(1);
  }
}

main();

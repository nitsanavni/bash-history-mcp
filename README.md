# Atuin Integration for Claude Code

Bidirectional bash history integration between Claude Code and [atuin](https://github.com/atuinsh/atuin).

## Problem
- Claude Code runs bash commands but they don't appear in your shell history
- Claude Code can't learn from your command patterns

## Architecture

### Write: Hook
**Claude Code hook** → writes to atuin after each bash command

```bash
# Post-bash-execution hook calls:
id=$(atuin history start "$COMMAND")
atuin history end --exit "$EXIT_CODE" --duration 0 "$id"
```

### Read: MCP Server
**MCP server** → Claude queries your atuin history

Tools:
- `search_history(query)` - find commands matching a pattern
- `get_recent_history(limit)` - recent commands
- `get_stats()` - command usage patterns

## Benefits
- Rerun commands Claude executed
- Claude learns from your workflow
- Rich metadata (timestamps, cwd, exit codes, duration)
- Syncs across machines (if atuin sync enabled)

## Setup

### Write Hook Installation

1. **Install from GitHub:**

```bash
# Using Claude Code CLI
claude mcp add -s user atuin-hook bunx -- --bun github:nitsanavni/bash-history-mcp
```

Or manually add to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bunx --bun github:nitsanavni/bash-history-mcp"
          }
        ]
      }
    ]
  }
}
```

2. **Requirements:**
   - [atuin](https://github.com/atuinsh/atuin) installed and configured
   - [Bun](https://bun.sh) installed

3. **How it works:**
   - After each bash command Claude executes, the hook:
     - Captures command and exit code
     - Calls `atuin history start` to create an entry
     - Calls `atuin history end` with exit code and duration
     - Fails silently if atuin is not available

4. **Verify it's working:**
   ```bash
   # After Claude runs some commands, check:
   atuin history last
   ```

## Implementation Plan
1. ✅ Write hook with atuin integration
2. ✅ Test hook integration
3. ⏳ MCP server with read-only atuin access

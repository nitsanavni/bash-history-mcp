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

### Prerequisites
- [atuin](https://github.com/atuinsh/atuin) installed and configured
- [Bun](https://bun.sh) installed

### Write Hook Installation

**Step 1: Locate your settings file**

Claude Code settings are in `~/.claude/settings.json`. Create it if it doesn't exist:

```bash
mkdir -p ~/.claude
touch ~/.claude/settings.json
```

**Step 2: Add the hook configuration**

Edit `~/.claude/settings.json` and add:

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

**If you already have hooks configured**, merge with your existing configuration:

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
      },
      // ... your other PostToolUse hooks
    ]
    // ... your other hook types (PreToolUse, etc.)
  }
}
```

**Step 3: Restart Claude Code**

The hook will be active in your next Claude Code session.

**Step 4: Verify it's working**

After Claude runs some bash commands:

```bash
atuin history last
```

You should see the commands Claude executed.

### How It Works

After each bash command Claude executes:
1. Hook receives JSON with command and exit code via stdin
2. Calls `atuin history start "$COMMAND"` to get an entry ID
3. Calls `atuin history end --exit $EXIT --duration 0 $ID`
4. Fails silently if atuin is unavailable

### Troubleshooting

**Hook not running?**
```bash
# Check if hook is registered
claude --debug
# Run a command in Claude and look for hook execution logs
```

**Commands not appearing in atuin?**
```bash
# Test atuin manually
atuin history start "test command"
atuin history last
```

## Implementation Plan
1. ✅ Write hook with atuin integration
2. ✅ Test hook integration
3. ⏳ MCP server with read-only atuin access

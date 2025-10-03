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
- `search_history(query, limit?)` - find commands matching a pattern
- `get_recent_history(limit?)` - recent commands

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

**Note:** If you've previously installed this package and are updating to a new version, clear Bun's cache first:
```bash
bun pm cache rm
```

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
            "command": "bunx --bun github:nitsanavni/bash-history-mcp hook"
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
            "command": "bunx --bun github:nitsanavni/bash-history-mcp hook"
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

### MCP Server Installation

**Note:** If you've previously installed this package and are updating to a new version, clear Bun's cache first:
```bash
bun pm cache rm
```

**Configure Claude Code to use the MCP server:**

```bash
claude mcp add -s user bash-history bunx -- github:nitsanavni/bash-history-mcp mcp
```

Or manually add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "bash-history": {
      "command": "bunx",
      "args": ["github:nitsanavni/bash-history-mcp", "mcp"]
    }
  }
}
```

**Available Tools:**

- `search_history(query, limit?)` - Search for commands matching a pattern
  ```
  Example: search_history("git commit", 5)
  ```

- `get_recent_history(limit?)` - Get recent commands
  ```
  Example: get_recent_history(10)
  ```

## Implementation Status
1. ✅ Write hook with atuin integration
2. ✅ Test hook integration
3. ✅ MCP server with read-only atuin access

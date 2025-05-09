# MCP Wait Server

Simple Model Context Protocol server providing a `wait` tool for Claude Desktop and other MCP clients. This tool allows Claude to pause execution for a specified number of seconds, which is useful when you need to wait for long-running operations to complete.

## Implementation

- Written in TypeScript
- Located in `src/index.ts` (source) and `build/index.js` (compiled)
- Run with: `npm start` or directly with `node build/index.js`

## Installation

### Option 1: Use with npx (Recommended - No Installation Required)

The simplest approach is to use npx, which runs the package without installing it. Configure Claude Desktop as shown in the "Usage" section below.

### Option 2: Install from npm

If you prefer to install the package:

```bash
# Install globally
npm install -g mcp-wait-server
```

### Option 3: Clone and Build from Source

For development or customization:

```bash
# Clone repository
git clone https://github.com/Amico1285/mcp-wait-server.git
cd mcp-wait-server

# Install dependencies
npm install

# Build the project
npm run build

# You can run it directly
npm start
```

## Usage in Claude Desktop

1. Create or edit your Claude Desktop configuration file:
   - Location: `~/.anthropic/config.json` on macOS/Linux
   - Location: `%APPDATA%\anthropic\config.json` on Windows
   - Create directories/file if needed

2. **Recommended Method: Using npx (No Installation Required)**

This is the simplest approach that works across all environments without requiring global installation:

```json
{
  "mcpServers": {
    "wait_server": {
      "command": "npx",
      "args": [
        "mcp-wait-server@latest"
      ],
      "env": {
        "MCP_WAIT_MAX_DURATION_SECONDS": "210",
        "MCP_WAIT_TOOL_DESCRIPTION": "Waits for a specified number of seconds. Use this to create a delay after starting a long-running operation (like a script or download via another tool), allowing it time to complete before you proceed or check its status."
      }
    }
  }
}
```

3. **Alternative Methods:**

If you installed globally:

```json
{
  "mcpServers": {
    "wait_server": {
      "command": "mcp-wait-server",
      "env": {
        "MCP_WAIT_MAX_DURATION_SECONDS": "210",
        "MCP_WAIT_TOOL_DESCRIPTION": "Waits for a specified number of seconds. Use this to create a delay after starting a long-running operation (like a script or download via another tool), allowing it time to complete before you proceed or check its status."
      }
    }
  }
}
```

If you installed from source:

```json
{
  "mcpServers": {
    "wait_server": {
      "command": "/path/to/your/mcp-wait-server/build/index.js",
      "env": {
        "MCP_WAIT_MAX_DURATION_SECONDS": "210",
        "MCP_WAIT_TOOL_DESCRIPTION": "Waits for a specified number of seconds. Use this to create a delay after starting a long-running operation (like a script or download via another tool), allowing it time to complete before you proceed or check its status."
      }
    }
  }
}
```

4. Restart Claude Desktop

5. The `wait` tool will now be available to Claude Desktop

## Environment Variables

- `MCP_WAIT_MAX_DURATION_SECONDS` - Maximum duration for one wait call (default: 210 seconds)
- `MCP_WAIT_TOOL_DESCRIPTION` - Custom description for the wait tool

## How It Works

When Claude is given the `wait` tool, it can use it to wait for a specified number of seconds. This is particularly useful in scenarios like:

- Waiting for a long-running script to complete
- Pausing before checking the status of a process
- Adding delays between API calls to avoid rate limits
- Allowing time for downloads or uploads to complete

The tool has a maximum single wait duration (default 210 seconds), but will automatically handle longer waits by instructing Claude to call it again with the remaining time.

## Development

- Node.js 18+ required  
- Install dependencies: `npm install`
- Build: `npm run build`
- Run: `npm start`
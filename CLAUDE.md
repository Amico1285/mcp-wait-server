# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands
- Run server: `npm start`
- Build TypeScript: `npm run build`

## Code Style Guidelines
- **Imports**: Standard library first, then third-party modules
- **Formatting**: 4-space indentation, 100-char line limit
- **Types**: Use TypeScript type annotations for all functions and variables
- **Naming**: camelCase for variables/functions, UPPER_CASE for constants
- **Error Handling**: Use try/catch blocks with specific error types
- **Logging**: Use the log function that writes to stderr for Claude Desktop compatibility
- **Environment Variables**: Read via process.env with default values
- **Constants**: Define at module top level with UPPER_CASE names
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './mcp-server.js';

async function runStdioMcp() {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log only to stderr so stdout remains clean JSON-RPC for MCP clients
  console.error('AWMS MCP Server running via stdio.');
}

runStdioMcp().catch((err) => {
  console.error('Fatal MCP Server error:', err);
  process.exit(1);
});

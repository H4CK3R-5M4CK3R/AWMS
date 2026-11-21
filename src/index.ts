import { WebServer } from './web-server.js';
import { createMcpServer } from './mcp-server.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { adb } from './adb.js';
import { exec } from 'child_process';
import * as os from 'os';

function openBrowser(url: string) {
  const platform = os.platform();
  if (platform === 'win32') {
    exec(`start "" "${url}"`);
  } else if (platform === 'darwin') {
    exec(`open "${url}"`);
  } else {
    exec(`xdg-open "${url}"`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isMcpOnly = args.includes('--mcp-only') || args.includes('--stdio');
  const noBrowser = args.includes('--no-browser');

  let port = 7171;
  const portIndex = args.indexOf('--port');
  if (portIndex !== -1 && args[portIndex + 1]) {
    port = parseInt(args[portIndex + 1], 10) || 7171;
  }

  // 1. Pure Stdio MCP Mode (for AI IDE / Desktop spawners)
  if (isMcpOnly) {
    const server = createMcpServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`[AWMS] MCP Server active on stdio.`);
    return;
  }

  // 2. Full Service Mode: Web Dashboard + Screen Stream + ADB Bridge
  const webServer = new WebServer({ port, host: '127.0.0.1' });
  const dashboardUrl = await webServer.start();

  // Check connected devices and initialize ADB optimizations
  let connectedCount = 0;
  try {
    const devices = await adb.listDevices();
    connectedCount = devices.length;
    if (connectedCount > 0) {
      await adb.initDevice();
    }
  } catch {}

  console.log(`
==============================================================
   _     _ _ _ __  __ ____  
  / \\   | | | |  \\/  / ___|   AWMS by LogicSpine
 / _ \\  | | | | |\\/| \\___ \\   v0.1.1 (Portable Edition)
/ ___ \\ | | | | |  | |___) |  Web ADB • Wireless • MCP Server
/_/   \\_\\_|_|_|_|  |_|____/   Creator: LogicSpine
==============================================================

  Dashboard:       ${dashboardUrl}
  Status:          Active (${connectedCount} device${connectedCount === 1 ? '' : 's'} detected)
  MCP Server URL:  ${dashboardUrl}/sse

--------------------------------------------------------------
  AI MCP CONFIGURATION (Paste into Claude, Cursor, Antigravity):
  
  {
    "mcpServers": {
      "awms": {
        "url": "${dashboardUrl}/sse"
      }
    }
  }
--------------------------------------------------------------
  Developed by LogicSpine | Free to use with Creator Attribution
  Press Ctrl+C to stop AWMS.
`);

  // Auto-launch the browser dashboard
  if (!noBrowser) {
    console.log(`[AWMS] Opening Web Dashboard in default browser...`);
    openBrowser(dashboardUrl);
  }

  // Handle graceful exit
  process.on('SIGINT', async () => {
    console.log('\n[AWMS] Shutting down service...');
    await webServer.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('[AWMS] Fatal startup error:', err);
  process.exit(1);
});

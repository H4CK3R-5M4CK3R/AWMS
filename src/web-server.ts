import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { ChildProcess } from 'child_process';
import { WebSocketServer, WebSocket } from 'ws';
import { adb } from './adb.js';
import { DASHBOARD_HTML } from './dashboard-html.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createMcpServer } from './mcp-server.js';

export interface WebServerOptions {
  port?: number;
  host?: string;
}

export class WebServer {
  private server: http.Server;
  private wss: WebSocketServer;
  private port: number;
  private host: string;
  private streamingClients: Set<WebSocket> = new Set();
  private screenrecordChild: ChildProcess | null = null;
  private cachedHeader: Buffer | null = null;
  private isRestartingStream: boolean = false;
  private currentStreamWidth: number = 720;
  private currentBitRate: number = 4000000;
  private sseTransports: Map<string, SSEServerTransport> = new Map();

  constructor(options: WebServerOptions = {}) {
    this.port = options.port || 7171;
    this.host = options.host || '127.0.0.1';

    this.server = http.createServer((req, res) => this.handleHttpRequest(req, res));
    this.wss = new WebSocketServer({ noServer: true });

    this.setupWebSocket();
  }

  private parseJsonBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (err) {
          reject(err);
        }
      });
      req.on('error', reject);
    });
  }

  private sendJson(res: http.ServerResponse, data: any, statusCode: number = 200) {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
  }

  private async handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    const urlObj = new URL(req.url || '/', `http://${req.headers.host}`);
    const pathname = urlObj.pathname;

    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      return res.end();
    }

    try {
      // 1. Dashboard UI
      if (pathname === '/' || pathname === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(DASHBOARD_HTML);
      }

      if (pathname === '/jmuxer.min.js') {
        const pathsToTry = [
          path.resolve('src/jmuxer.min.js'),
          path.resolve('dist/jmuxer.min.js'),
          path.resolve(process.cwd(), 'src/jmuxer.min.js')
        ];
        for (const p of pathsToTry) {
          if (fs.existsSync(p)) {
            res.writeHead(200, { 'Content-Type': 'application/javascript' });
            return res.end(fs.readFileSync(p));
          }
        }
      }

      // 2. MCP SSE Transport endpoints
      if (pathname === '/sse' && req.method === 'GET') {
        const transport = new SSEServerTransport('/messages', res);
        const mcpServer = createMcpServer();
        await mcpServer.connect(transport);
        this.sseTransports.set(transport.sessionId, transport);

        req.on('close', () => {
          this.sseTransports.delete(transport.sessionId);
        });
        return;
      }

      if (pathname === '/messages' && req.method === 'POST') {
        const sessionId = urlObj.searchParams.get('sessionId');
        if (sessionId && this.sseTransports.has(sessionId)) {
          const transport = this.sseTransports.get(sessionId)!;
          await transport.handlePostMessage(req, res);
          return;
        }
        return this.sendJson(res, { error: 'Invalid or missing sessionId' }, 400);
      }

      // 3. REST API Endpoints
      if (pathname === '/api/devices' && req.method === 'GET') {
        const devices = await adb.listDevices();
        return this.sendJson(res, {
          selected: adb.getSelectedSerial(),
          devices
        });
      }

      if (pathname === '/api/select-device' && req.method === 'POST') {
        const { serial } = await this.parseJsonBody(req);
        adb.setSelectedSerial(serial);
        this.stopHardwareStream();
        if (this.streamingClients.size > 0) {
          this.startHardwareStream(serial);
        }
        return this.sendJson(res, { success: true, selected: serial });
      }

      if (pathname === '/api/info' && req.method === 'GET') {
        const info = await adb.getDeviceInfo();
        return this.sendJson(res, info);
      }

      if (pathname === '/api/wifi-ip' && req.method === 'GET') {
        const ip = await adb.getWifiIp();
        return this.sendJson(res, { ip });
      }

      if (pathname === '/api/auto-wireless/start' && req.method === 'POST') {
        const { serial, port } = await this.parseJsonBody(req);
        const data = await adb.prepareAutoWireless(serial, port || 5555);
        return this.sendJson(res, { success: true, ...data });
      }

      if (pathname === '/api/auto-wireless/wait-disconnect' && req.method === 'POST') {
        const { usbSerial, ip, port } = await this.parseJsonBody(req);
        const result = await adb.finalizeAutoWireless(usbSerial, ip, port || 5555);
        return this.sendJson(res, result);
      }

      if (pathname === '/api/connect' && req.method === 'POST') {
        const { ip, port } = await this.parseJsonBody(req);
        const result = await adb.connectWireless(ip, port || 5555);
        return this.sendJson(res, { result });
      }

      if (pathname === '/api/disconnect' && req.method === 'POST') {
        const { ip, port } = await this.parseJsonBody(req);
        const result = await adb.disconnectWireless(ip, port);
        return this.sendJson(res, { result });
      }

      if (pathname === '/api/pair' && req.method === 'POST') {
        const { ip, port, code } = await this.parseJsonBody(req);
        const result = await adb.pairWireless(ip, port, code);
        return this.sendJson(res, { result });
      }

      if (pathname === '/api/tcpip' && req.method === 'POST') {
        const { port } = await this.parseJsonBody(req);
        const result = await adb.enableTcpip(port || 5555);
        return this.sendJson(res, { result });
      }

      if (pathname === '/api/tap' && req.method === 'POST') {
        const { x, y } = await this.parseJsonBody(req);
        await adb.tap(x, y);
        return this.sendJson(res, { success: true });
      }

      if (pathname === '/api/swipe' && req.method === 'POST') {
        const { x1, y1, x2, y2, duration } = await this.parseJsonBody(req);
        await adb.swipe(x1, y1, x2, y2, duration || 300);
        return this.sendJson(res, { success: true });
      }

      if (pathname === '/api/key' && req.method === 'POST') {
        const { key } = await this.parseJsonBody(req);
        await adb.pressKey(key);
        return this.sendJson(res, { success: true });
      }

      if (pathname === '/api/text' && req.method === 'POST') {
        const { text } = await this.parseJsonBody(req);
        await adb.inputText(text);
        return this.sendJson(res, { success: true });
      }

      if (pathname === '/api/screenshot' && req.method === 'GET') {
        const buffer = await adb.takeScreenshot();
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': buffer.length,
          'Cache-Control': 'no-cache, no-store'
        });
        return res.end(buffer);
      }

      if (pathname === '/api/install' && req.method === 'POST') {
        const { apkPath } = await this.parseJsonBody(req);
        const result = await adb.installApk(apkPath);
        return this.sendJson(res, { result });
      }

      if (pathname === '/api/uninstall' && req.method === 'POST') {
        const { packageName } = await this.parseJsonBody(req);
        const result = await adb.uninstallApp(packageName);
        return this.sendJson(res, { result });
      }

      if (pathname === '/api/launch' && req.method === 'POST') {
        const { packageName } = await this.parseJsonBody(req);
        const result = await adb.launchApp(packageName);
        return this.sendJson(res, { result });
      }

      if (pathname === '/api/stop' && req.method === 'POST') {
        const { packageName } = await this.parseJsonBody(req);
        await adb.stopApp(packageName);
        return this.sendJson(res, { success: true });
      }

      if (pathname === '/api/apps' && req.method === 'GET') {
        const filter = (urlObj.searchParams.get('filter') as any) || 'third_party';
        const apps = await adb.listApps(filter);
        return this.sendJson(res, { apps });
      }

      if (pathname === '/api/files' && req.method === 'GET') {
        const dir = urlObj.searchParams.get('path') || '/sdcard';
        const files = await adb.listFiles(dir);
        return this.sendJson(res, { path: dir, files });
      }

      if (pathname === '/api/push' && req.method === 'POST') {
        const { pcPath, devicePath } = await this.parseJsonBody(req);
        const result = await adb.pushFile(pcPath, devicePath);
        return this.sendJson(res, { result });
      }

      if (pathname === '/api/pull' && req.method === 'POST') {
        const { devicePath, pcPath } = await this.parseJsonBody(req);
        const result = await adb.pullFile(devicePath, pcPath);
        return this.sendJson(res, { result });
      }

      if (pathname === '/api/delete' && req.method === 'POST') {
        const { devicePath } = await this.parseJsonBody(req);
        const result = await adb.deleteFile(devicePath);
        return this.sendJson(res, { result });
      }

      if (pathname === '/api/open-url' && req.method === 'POST') {
        const { url } = await this.parseJsonBody(req);
        await adb.openUrl(url);
        return this.sendJson(res, { success: true });
      }

      if (pathname === '/api/shell' && req.method === 'POST') {
        const { command } = await this.parseJsonBody(req);
        const output = await adb.shell(command);
        return this.sendJson(res, { output });
      }

      // Not found
      this.sendJson(res, { error: 'Not found' }, 404);
    } catch (err: any) {
      console.error(`Request error on ${pathname}:`, err.message);
      this.sendJson(res, { error: err.message }, 500);
    }
  }

  private setupWebSocket() {
    this.server.on('upgrade', (request, socket, head) => {
      const url = new URL(request.url || '/', `http://${request.headers.host}`);
      if (url.pathname === '/stream') {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    });

    this.wss.on('connection', async (ws: WebSocket) => {
      this.streamingClients.add(ws);

      // Send screen resolution and current stream parameters on connect
      try {
        const res = await adb.getScreenResolution();
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'resolution',
            width: res.width,
            height: res.height,
            streamWidth: this.currentStreamWidth,
            bitRate: this.currentBitRate
          }));
        }
      } catch {}

      // If we already captured SPS/PPS H.264 headers, send them to the new client
      if (this.cachedHeader && ws.readyState === WebSocket.OPEN) {
        ws.send(this.cachedHeader);
      }

      // Start hardware video encoder stream if not already active
      this.startHardwareStream();

      ws.on('close', () => {
        this.streamingClients.delete(ws);
        if (this.streamingClients.size === 0) {
          this.stopHardwareStream();
        }
      });

      ws.on('message', async (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.action === 'tap') {
            await adb.tap(msg.x, msg.y);
          } else if (msg.action === 'swipe') {
            await adb.swipe(msg.x1, msg.y1, msg.x2, msg.y2, msg.duration || 300);
          } else if (msg.action === 'key') {
            await adb.pressKey(msg.key);
          } else if (msg.action === 'set_quality') {
            const width = parseInt(msg.width, 10) || 720;
            const bitRate = parseInt(msg.bitRate, 10) || 4000000;
            this.currentStreamWidth = width;
            this.currentBitRate = bitRate;
            this.stopHardwareStream();
            await this.startHardwareStream();
            for (const client of this.streamingClients) {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'quality_update',
                  streamWidth: this.currentStreamWidth,
                  bitRate: this.currentBitRate
                }));
              }
            }
          }
        } catch {}
      });
    });
  }

  private async startHardwareStream(targetSerial?: string) {
    if (this.screenrecordChild) {
      return;
    }

    try {
      const serial = targetSerial || adb.getSelectedSerial();
      if (!serial) return;

      const res = await adb.getScreenResolution(serial);
      // Bound stream width to native width
      const streamWidth = Math.min(this.currentStreamWidth, res.width);
      // Dimensions must be divisible by 4 for hardware encoder
      const streamHeight = Math.floor(((streamWidth / res.width) * res.height) / 4) * 4;

      const child = adb.spawnScreenRecordStream(serial, {
        width: streamWidth,
        height: streamHeight,
        bitRate: this.currentBitRate
      });

      this.screenrecordChild = child;

      child.stdout.on('data', (chunk: Buffer) => {
        // Cache SPS/PPS if found in chunk for instant client onboarding
        for (let i = 0; i < chunk.length - 4; i++) {
          if (chunk[i] === 0 && chunk[i + 1] === 0 && chunk[i + 2] === 0 && chunk[i + 3] === 1) {
            const nalType = chunk[i + 4] & 0x1f;
            if (nalType === 7 || nalType === 8) {
              this.cachedHeader = Buffer.from(chunk);
              break;
            }
          }
        }

        // Broadcast binary H.264 NAL chunks to all connected WebSocket clients
        for (const client of this.streamingClients) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(chunk);
          }
        }
      });

      child.stderr.on('data', (d) => {
        const str = d.toString();
        if (!str.includes('WARNING')) {
          console.warn('[screenrecord]', str.trim());
        }
      });

      child.on('close', () => {
        this.screenrecordChild = null;
        // If clients are still connected, restart stream seamlessly (handles 180s timeout or rotation)
        if (this.streamingClients.size > 0 && !this.isRestartingStream) {
          this.isRestartingStream = true;
          setTimeout(() => {
            this.isRestartingStream = false;
            if (this.streamingClients.size > 0) {
              this.startHardwareStream(serial);
            }
          }, 250);
        }
      });

      child.on('error', (err) => {
        console.error('[screenrecord error]', err.message);
        this.screenrecordChild = null;
      });
    } catch (err: any) {
      console.error('Failed to start hardware stream:', err.message);
    }
  }

  private stopHardwareStream() {
    if (this.screenrecordChild) {
      try {
        this.screenrecordChild.kill();
      } catch {}
      this.screenrecordChild = null;
    }
    this.cachedHeader = null;
  }

  public async start(): Promise<string> {
    return new Promise((resolve) => {
      this.server.listen(this.port, this.host, () => {
        const url = `http://${this.host}:${this.port}`;
        resolve(url);
      });
    });
  }

  public async stop(): Promise<void> {
    this.stopHardwareStream();
    return new Promise((resolve) => {
      this.wss.close(() => {
        this.server.close(() => resolve());
      });
    });
  }
}

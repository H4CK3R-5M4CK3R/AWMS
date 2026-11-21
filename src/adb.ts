import { spawn, execFile, exec, ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { fileURLToPath } from 'url';

const execPromise = promisify(exec);
const execFilePromise = promisify(execFile);

export interface AdbDevice {
  serial: string;
  state: 'device' | 'offline' | 'unauthorized' | 'unknown';
  model?: string;
  product?: string;
  device?: string;
  transportId?: string;
  isWireless?: boolean;
}

export interface DeviceInfo {
  serial: string;
  model: string;
  manufacturer: string;
  androidVersion: string;
  sdkVersion: string;
  batteryLevel: number;
  batteryStatus: string;
  resolution: { width: number; height: number };
  density: number;
  ipAddress?: string;
}

export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  permissions: string;
  date: string;
}

export interface InteractiveElement {
  index: number;
  type: string;
  text: string;
  contentDesc: string;
  resourceId: string;
  className: string;
  clickable: boolean;
  focusable: boolean;
  bounds: [number, number, number, number]; // [x1, y1, x2, y2]
  center: [number, number]; // [x, y]
}

export interface AppNotification {
  packageName: string;
  title: string;
  text: string;
}

export interface AppPerformanceMetrics {
  packageName: string;
  cpuPercent: number;
  ramMB: {
    totalPss: number;
    nativeHeap: number;
    dalvikHeap: number;
  };
  fps: {
    totalFrames: number;
    jankyFrames: number;
    jankPercentage: number;
  };
  threads: number;
}

export interface NetworkConnection {
  protocol: string;
  state: string;
  localAddress: string;
  localPort: string;
  peerAddress: string;
  peerPort: string;
}

export interface ActiveLogRecorderSession {
  child: ChildProcess;
  lines: string[];
  startTime: number;
  maxLines: number;
  packageName?: string;
  tag?: string;
  filter?: string;
  targetSerial?: string;
}

export interface SearchElementOptions {
  type?: 'any' | 'button' | 'input' | 'text';
  scroll?: boolean;
  maxSwipes?: number;
  preferInput?: boolean;
  minConfidence?: number;
}

export interface SearchElementResult {
  found: boolean;
  element?: InteractiveElement;
  confidence?: number;
  matchType?: 'exact' | 'prefix' | 'contains' | 'phonetic' | 'fuzzy' | 'resource_id' | 'none';
  swipesPerformed: number;
  reason?: 'found' | 'not_found' | 'reached_bottom';
  message: string;
}

export interface ElementMatchScore {
  score: number; // 0 to 100+
  matchType: 'exact' | 'prefix' | 'contains' | 'phonetic' | 'fuzzy' | 'resource_id' | 'none';
}

export function consonantSkeleton(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/[aeiou]/g, '');
}

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const d: number[][] = [];
  for (let i = 0; i <= m; i++) d[i] = [i];
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
    }
  }
  return d[m][n];
}

export function calculateFuzzySimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(a, b);
  return Math.max(0, 1 - dist / maxLen);
}

export function normalizeSearchText(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/aa+/g, 'a')
    .replace(/ee+/g, 'e')
    .replace(/oo+/g, 'o')
    .replace(/ii+/g, 'i')
    .replace(/uu+/g, 'u')
    .replace(/\s+/g, ' ')
    .trim();
}

export function scoreElementForQuery(
  el: InteractiveElement,
  rawQuery: string,
  res: { width: number; height: number },
  options?: { preferInput?: boolean; type?: 'any' | 'button' | 'input' | 'text' }
): ElementMatchScore {
  const [cx, cy] = el.center;
  // Skip out-of-screen bounds
  if (cx <= 0 || cy <= 0 || cx >= res.width || cy >= res.height) {
    return { score: -1, matchType: 'none' };
  }
  // Skip zero-dimension elements
  const [x1, y1, x2, y2] = el.bounds;
  if (x2 <= x1 || y2 <= y1) {
    return { score: -1, matchType: 'none' };
  }

  const isInput = el.type === 'input' || el.className.toLowerCase().includes('edittext');
  const isIcon = el.type === 'icon' || (!el.text && (el.contentDesc || el.resourceId));

  // If specific element type requested, enforce or penalize
  if (options?.type && options.type !== 'any') {
    if (options.type === 'input' && !isInput) return { score: -1, matchType: 'none' };
    if (options.type === 'button' && el.type !== 'button' && el.type !== 'icon' && el.type !== 'tab' && !el.clickable) {
      return { score: -1, matchType: 'none' };
    }
    if (options.type === 'text' && el.type !== 'text') return { score: -1, matchType: 'none' };
  }

  // When searching content/buttons without preferInput, exclude edittext
  if (!options?.preferInput && isInput && options?.type !== 'input') {
    return { score: -1, matchType: 'none' };
  }

  // Detect query intent & modifiers: icon/tab vs bar/input vs bottom/top
  const isIconQuery = /\b(icon|tab|button|btn|symbol)\b/i.test(rawQuery);
  const isBarOrInputQuery = /\b(bar|box|input|field|edittext)\b/i.test(rawQuery);
  const isBottomQuery = /\b(bottom|footer|nav|navigation)\b/i.test(rawQuery);
  const isTopQuery = /\b(top|header|appbar|actionbar)\b/i.test(rawQuery);

  // Strip modifiers for clean semantic matching
  const cleanedQuery = rawQuery
    .replace(/\b(icon|tab|button|btn|bar|box|input|field|bottom|top|nav|footer|header|symbol)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  const q = (cleanedQuery.length >= 2 ? cleanedQuery : rawQuery).trim().toLowerCase();

  const normQ = normalizeSearchText(q);
  const skelQ = consonantSkeleton(q);

  const t = el.text.toLowerCase();
  const d = el.contentDesc.toLowerCase();
  const r = el.resourceId.toLowerCase();

  const normT = normalizeSearchText(t);
  const normD = normalizeSearchText(d);
  const normR = normalizeSearchText(r);

  const skelT = consonantSkeleton(t);
  const skelD = consonantSkeleton(d);

  // Extract entry name tokens from Android resource-id (e.g. com.instagram.android:id/search_tab -> search, tab)
  const entryMatch = r.match(/(?:id\/|\/)([\w_]+)$/);
  const entryName = entryMatch ? entryMatch[1] : r;
  const entryTokens = entryName.split(/[_.\-]+/).filter((token) => token.length >= 2);

  let score = 0;
  let matchType: ElementMatchScore['matchType'] = 'none';

  // Tier 1: Visible Text Match
  if (t && (t === q || normT === normQ)) {
    score = 100;
    matchType = 'exact';
  } else if (t && (t.startsWith(q) || normT.startsWith(normQ))) {
    score = 88;
    matchType = 'prefix';
  } else if (t && (t.includes(q) || normT.includes(normQ))) {
    score = 78;
    matchType = 'contains';
  }
  // Tier 2: Icon Semantic (Content Description) Match
  else if (d && (d === q || normD === normQ)) {
    score = 95;
    matchType = 'exact';
  } else if (d && (d.startsWith(q) || normD.startsWith(normQ))) {
    score = 86;
    matchType = 'prefix';
  } else if (d && (d.includes(q) || normD.includes(normQ))) {
    score = 80;
    matchType = 'contains';
  }
  // Tier 3: Consonant / Phonetic Match (e.g. "prynsh" -> "Pryanshu")
  else if (skelQ.length >= 3 && (skelT.includes(skelQ) || skelD.includes(skelQ))) {
    score = 75;
    matchType = 'phonetic';
  }
  // Tier 4: Resource ID Match (e.g. id/search_tab or id/nav_search)
  else if (entryTokens.includes(q) || entryTokens.some((tok) => tok === normQ)) {
    score = 80; // High confidence for exact token match in resource-id
    matchType = 'resource_id';
  } else if (entryName.includes(q) || normR.includes(normQ)) {
    score = 70;
    matchType = 'resource_id';
  }
  // Tier 5: Fuzzy Levenshtein Match
  else if (q.length >= 3) {
    const textWords = normT.split(/\s+/).concat(normD.split(/\s+/)).filter((w) => w.length >= 3);
    let maxSim = 0;
    for (const tw of textWords) {
      const sim = calculateFuzzySimilarity(normQ, tw);
      if (sim > maxSim) maxSim = sim;
    }
    if (maxSim >= 0.70) {
      score = Math.round(58 + maxSim * 20);
      matchType = 'fuzzy';
    }
  }

  // Multi-word query overlap
  if (score === 0) {
    const words = normQ.split(/\s+/).filter((w) => w.length > 2);
    if (words.length > 0) {
      const matched = words.filter((w) => normT.includes(w) || normD.includes(w) || entryTokens.includes(w));
      if (matched.length > 0) {
        score = 35 + Math.round((matched.length / words.length) * 45);
        matchType = 'contains';
      }
    }
  }

  if (score > 0) {
    if (el.clickable) score += 10;

    // Intent-based Layer Adjustments
    if (isIconQuery) {
      if (isIcon) score += 25; // User specifically asked for "search icon" / "search tab"
      if (t) score -= 15;
    }

    if (isBarOrInputQuery) {
      if (isInput) score += 30; // User asked for "search bar" / "input box"
    }

    if (options?.preferInput && isInput) {
      score += 35;
    }

    if (isBottomQuery) {
      if (cy >= res.height - 250) score += 25; // User asked for bottom/nav element
    }

    if (isTopQuery) {
      if (cy < 250) score += 25; // User asked for top/header element
    }

    // Default heuristics: penalize edittext in top bar unless looking for input
    if (!options?.preferInput && !isBarOrInputQuery && isInput && cy < 250) {
      score -= 40;
    }

    // Viewport & feed relevance bonus
    if (cy >= 250 && cy < res.height - 200) score += 10;
    const positionBonus = Math.max(0, Math.round((1 - cy / res.height) * 8));
    score += positionBonus;
  }

  return { score, matchType };
}

export class AdbManager {
  private adbPath: string = 'adb';
  private selectedSerial: string | null = null;
  private activeLogRecorder: ActiveLogRecorderSession | null = null;
  private uiCache: {
    xml: string;
    serial: string;
    timestamp: number;
  } | null = null;
  private readonly UI_CACHE_TTL_MS = 1800; // 1.8 seconds cache TTL

  public invalidateUiCache(): void {
    this.uiCache = null;
  }

  constructor() {
    this.findAdb();
  }

  private findAdb(): void {
    const exeDir = path.dirname(process.execPath);
    const cwd = process.cwd();
    let appDir = '';
    try {
      if (typeof import.meta !== 'undefined' && import.meta.url) {
        appDir = path.dirname(fileURLToPath(import.meta.url));
      }
    } catch {}
    const localAppData = process.env.LOCALAPPDATA || (os.homedir ? path.join(os.homedir(), 'AppData', 'Local') : '');

    const candidates = [
      path.join(exeDir, 'bin', 'adb.exe'),
      path.join(exeDir, 'adb.exe'),
      path.join(cwd, 'bin', 'adb.exe'),
      path.join(cwd, 'adb.exe'),
      appDir ? path.join(appDir, '..', 'bin', 'adb.exe') : '',
      appDir ? path.join(appDir, 'bin', 'adb.exe') : '',
      localAppData ? path.join(localAppData, 'LogicSpine', 'AWMS', 'bin', 'adb.exe') : '',
      'C:\\Users\\Pryanshu Sharma\\Documents\\ADB\\android-sdk-platform-tools-adb-37-0-1\\platform-tools\\adb.exe'
    ].filter(Boolean);

    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        this.adbPath = cand;
        return;
      }
    }

    this.adbPath = 'adb';
  }

  public setAdbPath(customPath: string): void {
    this.adbPath = customPath;
  }

  public async initDevice(targetSerial?: string): Promise<void> {
    try {
      // 1. Kill stale/zombie uiautomator processes that can block accessibility service
      await this.shell('pkill -f uiautomator 2>/dev/null || true', targetSerial);
      // 2. Clean temporary dump files in /data/local/tmp
      await this.shell('rm -f /data/local/tmp/awms_*.xml 2>/dev/null || true', targetSerial);
      // 3. Ensure global animations remain at standard 1 (preserving smooth Android experience)
      await this.shell(
        'settings put global window_animation_scale 1; settings put global transition_animation_scale 1; settings put global animator_duration_scale 1',
        targetSerial
      );
    } catch {}
  }

  public setSelectedSerial(serial: string | null): void {
    this.selectedSerial = serial;
    if (serial) {
      this.initDevice(serial).catch(() => {});
    }
  }

  public getSelectedSerial(): string | null {
    return this.selectedSerial;
  }

  private async execute(args: string[], binary: boolean = false): Promise<Buffer | string> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.adbPath, args);
      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];

      child.stdout.on('data', (chunk) => stdoutChunks.push(Buffer.from(chunk)));
      child.stderr.on('data', (chunk) => stderrChunks.push(Buffer.from(chunk)));

      child.on('close', (code) => {
        const stderrStr = Buffer.concat(stderrChunks).toString('utf-8');
        if (code !== 0 && !stderrStr.includes('WARNING') && !stderrStr.includes('SecurityException')) {
          return reject(new Error(`ADB exited with code ${code}: ${stderrStr}`));
        }
        const fullBuffer = Buffer.concat(stdoutChunks);
        if (binary) {
          resolve(fullBuffer);
        } else {
          resolve(fullBuffer.toString('utf-8'));
        }
      });

      child.on('error', (err) => {
        reject(new Error(`Failed to spawn ADB process: ${err.message}`));
      });
    });
  }

  private getDeviceTargetArgs(targetSerial?: string): string[] {
    const serial = targetSerial || this.selectedSerial;
    if (serial) {
      return ['-s', serial];
    }
    return [];
  }

  // ==========================================
  // 1. DEVICE DISCOVERY & CONNECTION
  // ==========================================

  public async listDevices(): Promise<AdbDevice[]> {
    const output = (await this.execute(['devices', '-l'])) as string;
    const lines = output.split('\n');
    const devices: AdbDevice[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('List of devices') || line.startsWith('*')) {
        continue;
      }

      const parts = line.split(/\s+/);
      if (parts.length >= 2) {
        const serial = parts[0];
        const state = parts[1] as AdbDevice['state'];
        const device: AdbDevice = {
          serial,
          state,
          isWireless: serial.includes(':')
        };

        for (let i = 2; i < parts.length; i++) {
          const [key, val] = parts[i].split(':');
          if (key === 'product') device.product = val;
          if (key === 'model') device.model = val;
          if (key === 'device') device.device = val;
          if (key === 'transport_id') device.transportId = val;
        }

        devices.push(device);
      }
    }

    if (devices.length > 0) {
      const selectedExists = devices.some((d) => d.serial === this.selectedSerial);
      if (!this.selectedSerial || !selectedExists) {
        this.selectedSerial = devices[0].serial;
        this.initDevice(this.selectedSerial).catch(() => {});
      }
    } else {
      this.selectedSerial = null;
    }

    return devices;
  }

  public async connectWireless(ip: string, port: number = 5555): Promise<string> {
    const target = `${ip}:${port}`;
    const output = (await this.execute(['connect', target])) as string;
    await this.listDevices();
    this.initDevice(target).catch(() => {});
    return output.trim();
  }

  public async disconnectWireless(ip: string, port?: number): Promise<string> {
    const target = port ? `${ip}:${port}` : ip;
    const output = (await this.execute(['disconnect', target])) as string;
    await this.listDevices();
    return output.trim();
  }

  public async pairWireless(ip: string, port: number, code: string): Promise<string> {
    const target = `${ip}:${port}`;
    const output = (await this.execute(['pair', target, code])) as string;
    return output.trim();
  }

  public async enableTcpip(port: number = 5555, targetSerial?: string): Promise<string> {
    const target = this.getDeviceTargetArgs(targetSerial);
    const output = (await this.execute([...target, 'tcpip', port.toString()])) as string;
    return output.trim();
  }

  public async getWifiIp(targetSerial?: string): Promise<string | null> {
    const serial = targetSerial || this.selectedSerial || undefined;

    // 1. ip -f inet addr show wlan0
    try {
      const out1 = await this.shell('ip -f inet addr show wlan0', serial);
      const m1 = out1.match(/inet\s+(\d+\.\d+\.\d+\.\d+)/);
      if (m1 && m1[1] && m1[1] !== '127.0.0.1') return m1[1];
    } catch {}

    // 2. ip route get 1.1.1.1
    try {
      const out2 = await this.shell('ip route get 1.1.1.1', serial);
      const m2 = out2.match(/src\s+(\d+\.\d+\.\d+\.\d+)/);
      if (m2 && m2[1] && m2[1] !== '127.0.0.1') return m2[1];
    } catch {}

    // 3. ifconfig wlan0
    try {
      const out3 = await this.shell('ifconfig wlan0', serial);
      const m3 = out3.match(/inet\s+(?:addr:)?(\d+\.\d+\.\d+\.\d+)/);
      if (m3 && m3[1] && m3[1] !== '127.0.0.1') return m3[1];
    } catch {}

    // 4. getprop dhcp.wlan0.ipaddress
    try {
      const out4 = await this.shell('getprop dhcp.wlan0.ipaddress', serial);
      const ip = out4.trim();
      if (/^\d+\.\d+\.\d+\.\d+$/.test(ip) && ip !== '127.0.0.1') return ip;
    } catch {}

    return null;
  }

  public async prepareAutoWireless(targetSerial?: string, port: number = 5555): Promise<{
    usbSerial: string;
    ip: string;
    port: number;
  }> {
    const serial = targetSerial || this.selectedSerial;
    if (!serial) {
      throw new Error('No device connected. Please plug in your phone via USB first.');
    }
    if (serial.includes(':')) {
      throw new Error(`Device (${serial}) is already connected wirelessly!`);
    }

    const ip = await this.getWifiIp(serial);
    if (!ip) {
      throw new Error(
        'Could not detect Wi-Fi IP address on your device. Please ensure phone Wi-Fi is turned ON and connected to the same network as your PC.'
      );
    }

    await this.enableTcpip(port, serial);

    try {
      await this.connectWireless(ip, port);
    } catch {}

    return { usbSerial: serial, ip, port };
  }

  public async finalizeAutoWireless(
    usbSerial: string,
    ip: string,
    port: number = 5555,
    timeoutMs: number = 30000
  ): Promise<{ success: boolean; serial: string; message: string }> {
    const targetWireless = `${ip}:${port}`;
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const devices = await this.listDevices();
      const usbStillConnected = devices.some((d) => d.serial === usbSerial);

      if (!usbStillConnected) {
        await this.connectWireless(ip, port);
        this.selectedSerial = targetWireless;
        return {
          success: true,
          serial: targetWireless,
          message: `USB cable disconnected! Device successfully switched to wireless at ${targetWireless}`
        };
      }

      await new Promise((resolve) => setTimeout(resolve, 600));
    }

    await this.connectWireless(ip, port);
    this.selectedSerial = targetWireless;
    return {
      success: true,
      serial: targetWireless,
      message: `Wireless connection established at ${targetWireless}. You can remove the USB cable at any time.`
    };
  }

  // ==========================================
  // 2. SHELL, INPUT & GESTURES
  // ==========================================

  public async shell(command: string, targetSerial?: string): Promise<string> {
    const target = this.getDeviceTargetArgs(targetSerial);
    const output = (await this.execute([...target, 'shell', command])) as string;
    return output.trim();
  }

  public async tap(x: number, y: number, targetSerial?: string): Promise<string> {
    this.invalidateUiCache();
    return this.shell(`input tap ${Math.round(x)} ${Math.round(y)}`, targetSerial);
  }

  public async doubleTap(x: number, y: number, intervalMs: number = 100, targetSerial?: string): Promise<string> {
    this.invalidateUiCache();
    await this.tap(x, y, targetSerial);
    if (intervalMs > 0) {
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    return this.tap(x, y, targetSerial);
  }

  public async longPress(x: number, y: number, durationMs: number = 1000, targetSerial?: string): Promise<string> {
    this.invalidateUiCache();
    const rx = Math.round(x);
    const ry = Math.round(y);
    return this.shell(`input swipe ${rx} ${ry} ${rx} ${ry} ${Math.round(durationMs)}`, targetSerial);
  }

  public async swipe(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    durationMs: number = 300,
    targetSerial?: string
  ): Promise<string> {
    this.invalidateUiCache();
    return this.shell(
      `input swipe ${Math.round(x1)} ${Math.round(y1)} ${Math.round(x2)} ${Math.round(y2)} ${Math.round(durationMs)}`,
      targetSerial
    );
  }

  public async dragAndDrop(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    durationMs: number = 800,
    targetSerial?: string
  ): Promise<string> {
    this.invalidateUiCache();
    return this.swipe(x1, y1, x2, y2, durationMs, targetSerial);
  }

  public async inputText(text: string, targetSerial?: string): Promise<string> {
    this.invalidateUiCache();
    const escaped = text
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/'/g, "\\'")
      .replace(/&/g, '\\&')
      .replace(/</g, '\\<')
      .replace(/>/g, '\\>')
      .replace(/\|/g, '\\|')
      .replace(/;/g, '\\;')
      .replace(/\s/g, '%s');
    return this.shell(`input text "${escaped}"`, targetSerial);
  }

  public async pressKey(key: string | number, targetSerial?: string): Promise<string> {
    this.invalidateUiCache();
    const keyMap: Record<string, string> = {
      BACK: 'KEYCODE_BACK',
      HOME: 'KEYCODE_HOME',
      RECENTS: 'KEYCODE_APP_SWITCH',
      APP_SWITCH: 'KEYCODE_APP_SWITCH',
      POWER: 'KEYCODE_POWER',
      ENTER: 'KEYCODE_ENTER',
      ESCAPE: 'KEYCODE_ESCAPE',
      TAB: 'KEYCODE_TAB',
      SPACE: 'KEYCODE_SPACE',
      VOLUME_UP: 'KEYCODE_VOLUME_UP',
      VOLUME_DOWN: 'KEYCODE_VOLUME_DOWN',
      MUTE: 'KEYCODE_VOLUME_MUTE',
      NOTIFICATION: 'KEYCODE_NOTIFICATION'
    };

    let keycode = key.toString();
    const upperKey = keycode.toUpperCase();
    if (keyMap[upperKey]) {
      keycode = keyMap[upperKey];
    } else if (!keycode.startsWith('KEYCODE_') && isNaN(Number(keycode))) {
      keycode = `KEYCODE_${upperKey}`;
    }

    return this.shell(`input keyevent ${keycode}`, targetSerial);
  }

  // ==========================================
  // 3. SCREENSHOT & HARDWARE VIDEO STREAM
  // ==========================================

  public async takeScreenshot(targetSerial?: string): Promise<Buffer> {
    const target = this.getDeviceTargetArgs(targetSerial);
    const buffer = (await this.execute([...target, 'exec-out', 'screencap', '-p'], true)) as Buffer;
    return buffer;
  }

  public spawnScreenRecordStream(
    targetSerial?: string,
    options: { width?: number; height?: number; bitRate?: number } = {}
  ) {
    const target = this.getDeviceTargetArgs(targetSerial);
    const width = options.width || 480;
    const height = options.height || 1040;
    const bitRate = options.bitRate || 1500000;

    const args = [
      ...target,
      'exec-out',
      'screenrecord',
      '--output-format=h264',
      '--size',
      `${width}x${height}`,
      '--bit-rate',
      bitRate.toString(),
      '--time-limit',
      '180',
      '-'
    ];

    return spawn(this.adbPath, args);
  }

  public async getScreenResolution(targetSerial?: string): Promise<{ width: number; height: number }> {
    const output = await this.shell('wm size', targetSerial);
    const match = output.match(/(\d+)x(\d+)/);
    if (match) {
      return {
        width: parseInt(match[1], 10),
        height: parseInt(match[2], 10)
      };
    }
    return { width: 1080, height: 2400 };
  }

  // ==========================================
  // 4. UI HIERARCHY & SEMANTIC ELEMENT EXTRACTION
  // ==========================================

  public async isKeyboardShown(targetSerial?: string): Promise<boolean> {
    try {
      const out = await this.shell("dumpsys input_method | grep -E 'mInputShown'", targetSerial);
      return out.includes('mInputShown=true');
    } catch {
      return false;
    }
  }

  public async dismissKeyboardIfShown(targetSerial?: string): Promise<boolean> {
    const shown = await this.isKeyboardShown(targetSerial);
    if (shown) {
      await this.pressKey('BACK', targetSerial);
      await new Promise((r) => setTimeout(r, 250));
      return true;
    }
    return false;
  }

  public async getDumpsysUiHierarchy(targetSerial?: string): Promise<string> {
    try {
      const output = await this.shell('dumpsys activity top', targetSerial);
      const lines = output.split('\n');
      const xmlNodes: string[] = ['<?xml version="1.0" encoding="utf-8"?><hierarchy rotation="0">'];

      let inHierarchy = false;
      const regex =
        /([a-zA-Z0-9._$]+)\{([a-f0-9]+)\s+([A-Z.]{8,})\s+[^\s]+\s+(-?\d+),(-?\d+)-(-?\d+),(-?\d+)(?:\s+#([a-f0-9]+)\s+([a-zA-Z0-9_:/]+))?\}(?:\s*-\s*([^\r\n]+))?/;

      for (const line of lines) {
        if (line.includes('View Hierarchy:')) {
          inHierarchy = true;
          continue;
        }
        if (inHierarchy) {
          if (
            line.trim().startsWith('Looper') ||
            line.trim().startsWith('TASK') ||
            line.trim().startsWith('ACTIVITY')
          ) {
            inHierarchy = false;
            continue;
          }

          const match = line.match(regex);
          if (match) {
            const className = match[1];
            const flags = match[3];
            const isVisible = flags.charAt(0) === 'V';
            if (!isVisible) continue;

            const x1 = parseInt(match[4], 10);
            const y1 = parseInt(match[5], 10);
            const x2 = parseInt(match[6], 10);
            const y2 = parseInt(match[7], 10);
            if (x1 === 0 && y1 === 0 && x2 === 0 && y2 === 0) continue;

            const resId = match[9] || '';
            let text = (match[10] || '').replace(/[<>&"']/g, '').trim();
            // If text is not exposed in dumpsys, derive a clean semantic label from resourceId
            if (!text && resId) {
              const parts = resId.split('/');
              text = parts[parts.length - 1].replace(/_/g, ' ');
            }
            const isClickable = flags.includes('C');
            const isFocusable = flags.includes('F');

            xmlNodes.push(
              `<node index="0" text="${text}" resource-id="${resId}" class="${className}" package="unknown" content-desc="${text}" checkable="false" checked="false" clickable="${isClickable}" enabled="true" focusable="${isFocusable}" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[${x1},${y1}][${x2},${y2}]" />`
            );
          }
        }
      }

      xmlNodes.push('</hierarchy>');
      return xmlNodes.join('\n');
    } catch (err: any) {
      return `<error>Dumpsys fallback failed: ${err.message}</error>`;
    }
  }

  public async getUiHierarchy(
    targetSerial?: string,
    timeoutMs: number = 3500,
    forceRefresh: boolean = false
  ): Promise<string> {
    const serial = targetSerial || this.selectedSerial || 'default';
    const now = Date.now();

    // Check in-memory UI hierarchy cache (avoids repeated 2.5s dumps in back-to-back tool calls)
    if (!forceRefresh && this.uiCache && this.uiCache.serial === serial && now - this.uiCache.timestamp < this.UI_CACHE_TTL_MS) {
      return this.uiCache.xml;
    }

    const tempFile = '/data/local/tmp/awms_dump.xml';
    const target = this.getDeviceTargetArgs(targetSerial);

    let resultXml = '';

    // 1. Fast attempt via uiautomator dump --compressed with 3500ms timeout
    try {
      await new Promise<void>((resolve, reject) => {
        const child = spawn(this.adbPath, [...target, 'shell', `uiautomator dump --compressed ${tempFile}`]);
        let timedOut = false;
        const timer = setTimeout(() => {
          timedOut = true;
          try {
            child.kill();
          } catch {}
          reject(new Error('uiautomator dump timed out'));
        }, timeoutMs);

        child.on('close', (code) => {
          clearTimeout(timer);
          if (timedOut) return;
          if (code === 0) resolve();
          else reject(new Error(`uiautomator dump exited with code ${code}`));
        });
        child.on('error', (err) => {
          clearTimeout(timer);
          reject(err);
        });
      });

      const xml = (await this.execute([...target, 'shell', `cat ${tempFile}`])) as string;
      if (xml && xml.includes('<hierarchy')) {
        this.shell(`rm -f ${tempFile}`, targetSerial).catch(() => {});
        resultXml = xml;
      }
    } catch {
      // Immediately kill any lingering uiautomator process so it doesn't lock accessibility
      this.shell('pkill -f uiautomator 2>/dev/null || true', targetSerial).catch(() => {});
    }

    // 2. Instant fallback: dumpsys activity top (completes in ~30-50ms with 0 delay)
    if (!resultXml) {
      resultXml = await this.getDumpsysUiHierarchy(targetSerial);
    }

    // Save in cache
    this.uiCache = { xml: resultXml, serial, timestamp: Date.now() };
    return resultXml;
  }

  public async getCurrentApp(targetSerial?: string): Promise<{ packageName: string; activity: string }> {
    try {
      const output = await this.shell("dumpsys window | grep -E 'mCurrentFocus'", targetSerial);
      const match = output.match(/([a-zA-Z0-9._]+)\/([a-zA-Z0-9._]+)/);
      if (match) {
        return { packageName: match[1], activity: match[2] };
      }
    } catch {}
    return { packageName: 'unknown', activity: 'unknown' };
  }

  public parseUiElements(xml: string): InteractiveElement[] {
    const elements: InteractiveElement[] = [];
    const nodeRegex = /<node\s+([^>]+)>/g;
    let match: RegExpExecArray | null;
    let index = 0;

    while ((match = nodeRegex.exec(xml)) !== null) {
      const attrs = match[1];
      const getAttr = (name: string): string => {
        const m = attrs.match(new RegExp(`${name}="([^"]*)"`));
        return m ? m[1] : '';
      };

      const boundsStr = getAttr('bounds');
      const boundsMatch = boundsStr.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
      if (!boundsMatch) continue;

      const x1 = parseInt(boundsMatch[1], 10);
      const y1 = parseInt(boundsMatch[2], 10);
      const x2 = parseInt(boundsMatch[3], 10);
      const y2 = parseInt(boundsMatch[4], 10);

      const clickable = getAttr('clickable') === 'true';
      const focusable = getAttr('focusable') === 'true';
      const text = getAttr('text');
      const contentDesc = getAttr('content-desc');
      const resourceId = getAttr('resource-id');
      const className = getAttr('class');

      // Keep if interactive or has semantic text/id
      if (clickable || focusable || text || contentDesc || resourceId) {
        let type = 'clickable';
        const lowerClass = className.toLowerCase();
        if (lowerClass.includes('edittext')) type = 'input';
        else if (lowerClass.includes('button')) type = 'button';
        else if (lowerClass.includes('imageview') || lowerClass.includes('imagebutton') || lowerClass.includes('icon')) type = 'icon';
        else if (lowerClass.includes('switch') || lowerClass.includes('checkbox') || lowerClass.includes('radio')) type = 'switch';
        else if (lowerClass.includes('seekbar') || lowerClass.includes('slider')) type = 'slider';
        else if (lowerClass.includes('tab')) type = 'tab';
        else if (clickable && (text || contentDesc)) type = 'button';
        else if (clickable) type = 'clickable';
        else type = 'text';

        elements.push({
          index: ++index,
          type,
          text,
          contentDesc,
          resourceId,
          className,
          clickable,
          focusable,
          bounds: [x1, y1, x2, y2],
          center: [Math.round((x1 + x2) / 2), Math.round((y1 + y2) / 2)]
        });
      }
    }

    return elements;
  }

  public async inspectScreen(targetSerial?: string): Promise<{
    currentApp: { packageName: string; activity: string };
    screenResolution: { width: number; height: number };
    totalInteractiveElements: number;
    interactiveElements: InteractiveElement[];
    aiGuidance: string;
  }> {
    const [currentApp, res, xml] = await Promise.all([
      this.getCurrentApp(targetSerial),
      this.getScreenResolution(targetSerial),
      this.getUiHierarchy(targetSerial)
    ]);
    const elements = this.parseUiElements(xml);

    return {
      currentApp,
      screenResolution: res,
      totalInteractiveElements: elements.length,
      interactiveElements: elements,
      aiGuidance:
        'FAST-PATH FOR AI: Use center [x, y] with tap(x, y) or tap_element(text/id) for instant navigation. DO NOT call take_screenshot unless you specifically need to visually inspect layout responsiveness, images, colors, or canvas games.'
    };
  }

  public async tapElement(
    criteria: { id?: number; text?: string; resourceId?: string; contentDesc?: string },
    targetSerial?: string
  ): Promise<{ tapped: boolean; element?: InteractiveElement; message: string }> {
    const xml = await this.getUiHierarchy(targetSerial);
    const elements = this.parseUiElements(xml);

    let target: InteractiveElement | undefined;
    if (criteria.id !== undefined) {
      target = elements.find((e) => e.index === criteria.id);
    } else if (criteria.text) {
      const q = criteria.text.toLowerCase();
      target =
        elements.find((e) => e.text.toLowerCase() === q) ||
        elements.find((e) => e.text.toLowerCase().includes(q)) ||
        elements.find((e) => e.contentDesc.toLowerCase().includes(q));
    } else if (criteria.resourceId) {
      target = elements.find((e) => e.resourceId.includes(criteria.resourceId!));
    } else if (criteria.contentDesc) {
      const q = criteria.contentDesc.toLowerCase();
      target = elements.find((e) => e.contentDesc.toLowerCase().includes(q));
    }

    if (!target) {
      return {
        tapped: false,
        message: `Element not found on current screen. Available elements sample: ${elements
          .slice(0, 10)
          .map((e) => e.text || e.contentDesc || e.resourceId || e.index)
          .join(', ')}`
      };
    }

    await this.tap(target.center[0], target.center[1], targetSerial);
    return {
      tapped: true,
      element: target,
      message: `Tapped "${target.text || target.contentDesc || target.resourceId}" (Type: ${target.type}) at (${target.center[0]}, ${target.center[1]})`
    };
  }

  public async smartTap(
    query: string,
    targetSerial?: string,
    options?: { preferInput?: boolean }
  ): Promise<{
    success: boolean;
    tappedAt?: [number, number];
    element?: InteractiveElement;
    message: string;
  }> {
    // 1. Auto-dismiss soft keyboard if open so it doesn't block buttons or rows
    const keyboardDismissed = await this.dismissKeyboardIfShown(targetSerial);
    if (keyboardDismissed) {
      this.invalidateUiCache();
    }

    // 2. Fetch screen elements & display resolution (utilizes in-memory cache if fresh)
    const xml = await this.getUiHierarchy(targetSerial);
    const elements = this.parseUiElements(xml);
    const res = await this.getScreenResolution(targetSerial);

    const q = query.trim().toLowerCase();
    const normQ = normalizeSearchText(q);

    // 3. Intelligent Scoring & Coordinate Resolution Algorithm
    let bestElement: InteractiveElement | null = null;
    let bestScore = -1;

    for (const el of elements) {
      const { score } = scoreElementForQuery(el, query, res, { preferInput: options?.preferInput });
      if (score > bestScore) {
        bestScore = score;
        bestElement = el;
      }
    }

    if (bestElement && bestScore > 0) {
      const [tx, ty] = bestElement.center;
      await this.tap(tx, ty, targetSerial);
      return {
        success: true,
        tappedAt: [tx, ty],
        element: bestElement,
        message: `Smart tap hit "${bestElement.text || bestElement.contentDesc || bestElement.resourceId}" (Type: ${bestElement.type}) at exact coordinates (${tx}, ${ty}) [confidence: ${bestScore}%]`
      };
    }

    return {
      success: false,
      message: `No matching element found on screen for "${query}". Found ${elements.length} other elements.`
    };
  }

  public async searchElement(
    query: string,
    targetSerial?: string,
    options?: SearchElementOptions
  ): Promise<SearchElementResult> {
    const res = await this.getScreenResolution(targetSerial);
    const scroll = options?.scroll ?? false;
    const maxSwipes = Math.min(Math.max(1, options?.maxSwipes ?? 3), 5);
    const minConfidence = options?.minConfidence ?? 55;

    // Helper to evaluate an element list
    const findBestOnScreen = (elements: InteractiveElement[]) => {
      let best: InteractiveElement | null = null;
      let highestScore = -1;
      let bestMatchType: SearchElementResult['matchType'] = 'none';

      for (const el of elements) {
        const { score, matchType } = scoreElementForQuery(el, query, res, options);
        if (score > highestScore) {
          highestScore = score;
          best = el;
          bestMatchType = matchType;
        }
      }
      return { best, highestScore, bestMatchType };
    };

    // Helper for screen fingerprint to detect end of scroll
    const getScreenFingerprint = (elements: InteractiveElement[]) => {
      return elements.map((e) => `${e.resourceId}:${e.text}:${e.bounds.join(',')}`).join('|');
    };

    // 1. Initial screen check (0 swipes)
    let xml = await this.getUiHierarchy(targetSerial);
    let elements = this.parseUiElements(xml);
    let { best, highestScore, bestMatchType } = findBestOnScreen(elements);

    if (best && highestScore >= minConfidence) {
      const [tx, ty] = best.center;
      return {
        found: true,
        element: best,
        confidence: highestScore,
        matchType: bestMatchType,
        swipesPerformed: 0,
        reason: 'found',
        message: `Found element "${best.text || best.contentDesc || best.resourceId}" (Type: ${best.type}) at coordinates (${tx}, ${ty}) [confidence: ${highestScore}%, match: ${bestMatchType}]`
      };
    }

    // If not found and scroll is disabled, return immediately
    if (!scroll) {
      return {
        found: false,
        swipesPerformed: 0,
        reason: 'not_found',
        message: `Element matching "${query}" was not found on the current screen. Evaluated ${elements.length} elements.`
      };
    }

    // 2. Speed-swipe scroll loop with end-of-scroll detection
    let prevFingerprint = getScreenFingerprint(elements);
    let swipesPerformed = 0;

    const cx = Math.round(res.width / 2);
    const startY = Math.round(res.height * 0.72);
    const endY = Math.round(res.height * 0.28);
    const swipeDuration = 140; // ultra-fast 140ms flick

    for (let i = 0; i < maxSwipes; i++) {
      swipesPerformed++;
      // Speed flick
      await this.swipe(cx, startY, cx, endY, swipeDuration, targetSerial);
      // Ultra-short settling delay (220ms)
      await new Promise((r) => setTimeout(r, 220));

      // Dump fresh UI bypassing cache
      xml = await this.getUiHierarchy(targetSerial, 3500, true);
      elements = this.parseUiElements(xml);

      // Check for bottom of scroll (stagnant screen)
      const currentFingerprint = getScreenFingerprint(elements);
      if (currentFingerprint === prevFingerprint) {
        return {
          found: false,
          swipesPerformed,
          reason: 'reached_bottom',
          message: `Reached bottom of scroll after ${swipesPerformed} swipe(s). Element matching "${query}" does not exist in this view.`
        };
      }
      prevFingerprint = currentFingerprint;

      // Evaluate new screen
      const result = findBestOnScreen(elements);
      if (result.best && result.highestScore >= minConfidence) {
        const [tx, ty] = result.best.center;
        return {
          found: true,
          element: result.best,
          confidence: result.highestScore,
          matchType: result.bestMatchType,
          swipesPerformed,
          reason: 'found',
          message: `Found element "${result.best.text || result.best.contentDesc || result.best.resourceId}" (Type: ${result.best.type}) at coordinates (${tx}, ${ty}) after ${swipesPerformed} swipe(s) [confidence: ${result.highestScore}%, match: ${result.bestMatchType}]`
        };
      }
    }

    return {
      found: false,
      swipesPerformed,
      reason: 'not_found',
      message: `Element matching "${query}" was not found after ${swipesPerformed} swipe(s).`
    };
  }

  public async smartType(
    text: string,
    fieldQuery?: string,
    pressEnter: boolean = false,
    targetSerial?: string
  ): Promise<{ success: boolean; message: string }> {
    if (fieldQuery) {
      await this.smartTap(fieldQuery, targetSerial, { preferInput: true });
      await new Promise((r) => setTimeout(r, 200));
    }
    await this.inputText(text, targetSerial);
    if (pressEnter) {
      await this.pressKey('ENTER', targetSerial);
    }
    return {
      success: true,
      message: `Typed "${text}"${pressEnter ? ' and pressed ENTER' : ''}${fieldQuery ? ` into field "${fieldQuery}"` : ''}`
    };
  }

  public async playMusic(
    songQuery: string,
    app: 'spotify' | 'youtube' | 'auto' = 'spotify',
    targetSerial?: string
  ): Promise<{ success: boolean; message: string; details?: any }> {
    const encoded = encodeURIComponent(songQuery);

    if (app === 'spotify' || app === 'auto') {
      try {
        // Step 1: Fire native media search & play intent
        await this.shell(
          `am start -a android.media.action.MEDIA_PLAY_FROM_SEARCH -e query "${songQuery}" com.spotify.music`,
          targetSerial
        );
        // Step 2: Open deep link to search results
        await this.shell(
          `am start -a android.intent.action.VIEW -d "spotify:search:${encoded}"`,
          targetSerial
        );

        await new Promise((r) => setTimeout(r, 1200));
        await this.dismissKeyboardIfShown(targetSerial);

        // Step 3: Automatically tap top song row
        const tapResult = await this.smartTap(songQuery, targetSerial);
        if (!tapResult.success) {
          // Fallback to top result coordinates for Spotify
          await this.tap(400, 350, targetSerial);
        }

        // Verify media playback status
        const mediaSession = await this.shell('dumpsys media_session', targetSerial);
        const isPlaying =
          mediaSession.includes('package=com.spotify.music') && mediaSession.includes('state=PLAYING');

        return {
          success: true,
          message: `Successfully playing "${songQuery}" on Spotify.`,
          details: {
            isPlaying,
            songQuery,
            tappedAt: tapResult.tappedAt || [400, 350]
          }
        };
      } catch (err: any) {
        return {
          success: false,
          message: `Spotify play error: ${err.message}`
        };
      }
    }

    if (app === 'youtube') {
      await this.shell(
        `am start -a android.intent.action.VIEW -d "vnd.youtube://results?search_query=${encoded}"`,
        targetSerial
      );
      await new Promise((r) => setTimeout(r, 1200));
      await this.dismissKeyboardIfShown(targetSerial);
      await this.tap(540, 500, targetSerial);
      return {
        success: true,
        message: `Playing "${songQuery}" on YouTube.`
      };
    }

    throw new Error(`Unsupported music app: ${app}`);
  }

  public async searchInApp(
    app: 'spotify' | 'youtube' | 'chrome' | 'play_store' | 'maps' | 'settings',
    query: string,
    targetSerial?: string
  ): Promise<{ success: boolean; message: string; targetApp: string }> {
    this.invalidateUiCache();
    const encoded = encodeURIComponent(query);
    let cmd = '';
    switch (app) {
      case 'spotify':
        cmd = `am start -a android.intent.action.VIEW -d "spotify:search:${encoded}" com.spotify.music`;
        break;
      case 'youtube':
        cmd = `am start -a android.intent.action.VIEW -d "vnd.youtube://results?search_query=${encoded}" com.google.android.youtube`;
        break;
      case 'chrome':
        cmd = `am start -a android.intent.action.VIEW -d "https://www.google.com/search?q=${encoded}" com.android.chrome`;
        break;
      case 'play_store':
        cmd = `am start -a android.intent.action.VIEW -d "market://search?q=${encoded}" com.android.vending`;
        break;
      case 'maps':
        cmd = `am start -a android.intent.action.VIEW -d "geo:0,0?q=${encoded}" com.google.android.apps.maps`;
        break;
      case 'settings':
        cmd = `am start -a android.settings.SETTINGS`;
        break;
      default:
        throw new Error(`Unsupported app for deep search: ${app}`);
    }
    await this.shell(cmd, targetSerial);
    return {
      success: true,
      message: `Directly opened search results for "${query}" in ${app}`,
      targetApp: app
    };
  }

  public async waitForForegroundApp(targetPackagePart: string, timeoutMs: number = 3000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const app = await this.getCurrentApp();
      if (app.packageName.toLowerCase().includes(targetPackagePart.toLowerCase())) {
        return true;
      }
      await new Promise((r) => setTimeout(r, 80));
    }
    return false;
  }

  // ==========================================
  // 5. COMPOUND MULTI-ACTIONS
  // ==========================================

  public async tapAndInspect(
    x: number,
    y: number,
    delayMs: number = 600,
    includeScreenshot: boolean = false,
    targetSerial?: string
  ): Promise<{ screenshot?: Buffer; xml: string; elements: InteractiveElement[] }> {
    await this.tap(x, y, targetSerial);
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
    const [screenshot, xml] = await Promise.all([
      includeScreenshot ? this.takeScreenshot(targetSerial) : Promise.resolve(undefined),
      this.getUiHierarchy(targetSerial)
    ]);
    const elements = this.parseUiElements(xml);
    return { screenshot, xml, elements };
  }

  public async swipeAndInspect(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    durationMs: number = 300,
    delayMs: number = 600,
    includeScreenshot: boolean = false,
    targetSerial?: string
  ): Promise<{ screenshot?: Buffer; xml: string; elements: InteractiveElement[] }> {
    await this.swipe(x1, y1, x2, y2, durationMs, targetSerial);
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
    const [screenshot, xml] = await Promise.all([
      includeScreenshot ? this.takeScreenshot(targetSerial) : Promise.resolve(undefined),
      this.getUiHierarchy(targetSerial)
    ]);
    const elements = this.parseUiElements(xml);
    return { screenshot, xml, elements };
  }

  public async typeAndInspect(
    text: string,
    pressEnter: boolean = false,
    delayMs: number = 600,
    includeScreenshot: boolean = false,
    targetSerial?: string
  ): Promise<{ screenshot?: Buffer; xml: string; elements: InteractiveElement[] }> {
    await this.inputText(text, targetSerial);
    if (pressEnter) {
      await this.pressKey('ENTER', targetSerial);
    }
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
    const [screenshot, xml] = await Promise.all([
      includeScreenshot ? this.takeScreenshot(targetSerial) : Promise.resolve(undefined),
      this.getUiHierarchy(targetSerial)
    ]);
    const elements = this.parseUiElements(xml);
    return { screenshot, xml, elements };
  }

  public async launchAndInspect(
    packageName: string,
    delayMs: number = 1200,
    includeScreenshot: boolean = false,
    targetSerial?: string
  ): Promise<{ screenshot?: Buffer; xml: string; elements: InteractiveElement[]; startupLogs: string }> {
    await this.launchApp(packageName, targetSerial);
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
    const [screenshot, xml, startupLogs] = await Promise.all([
      includeScreenshot ? this.takeScreenshot(targetSerial) : Promise.resolve(undefined),
      this.getUiHierarchy(targetSerial),
      this.getLogs({ lines: 30, packageName }, targetSerial).catch(() => '')
    ]);
    const elements = this.parseUiElements(xml);
    return { screenshot, xml, elements, startupLogs };
  }

  public async openUrlAndInspect(
    url: string,
    delayMs: number = 1500,
    includeScreenshot: boolean = false,
    targetSerial?: string
  ): Promise<{ screenshot?: Buffer; xml: string; elements: InteractiveElement[] }> {
    await this.openUrl(url, targetSerial);
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
    const [screenshot, xml] = await Promise.all([
      includeScreenshot ? this.takeScreenshot(targetSerial) : Promise.resolve(undefined),
      this.getUiHierarchy(targetSerial)
    ]);
    const elements = this.parseUiElements(xml);
    return { screenshot, xml, elements };
  }

  // ==========================================
  // 6. LOGS & LIVE LOG RECORDING
  // ==========================================

  public async getLogs(
    options: {
      lines?: number;
      packageName?: string;
      tag?: string;
      level?: 'V' | 'D' | 'I' | 'W' | 'E' | 'F';
      filter?: string;
    } = {},
    targetSerial?: string
  ): Promise<string> {
    const lines = options.lines || 100;
    const target = this.getDeviceTargetArgs(targetSerial);

    let pid: string | null = null;
    if (options.packageName) {
      try {
        const pidOut = await this.shell(`pidof ${options.packageName}`, targetSerial);
        const pids = pidOut.trim().split(/\s+/).filter(Boolean);
        if (pids.length > 0) {
          pid = pids[0];
        }
      } catch {}
    }

    const args = [...target, 'logcat', '-d', '-t', lines.toString()];
    if (pid) {
      args.push(`--pid=${pid}`);
    }

    if (options.tag) {
      const lvl = options.level || 'V';
      args.push(`${options.tag}:${lvl}`, '*:S');
    } else if (options.level) {
      args.push(`*:${options.level}`);
    }

    try {
      let output = (await this.execute(args)) as string;
      if (options.filter) {
        const q = options.filter.toLowerCase();
        output = output
          .split('\n')
          .filter((line) => line.toLowerCase().includes(q))
          .join('\n');
      }
      return output.trim();
    } catch (err: any) {
      // Fallback for older devices if --pid is not supported
      if (pid) {
        const fallback = (await this.execute([...target, 'logcat', '-d', '-t', (lines * 3).toString()])) as string;
        return fallback
          .split('\n')
          .filter((line) => line.includes(pid!) || (options.packageName && line.includes(options.packageName)))
          .slice(-lines)
          .join('\n')
          .trim();
      }
      throw err;
    }
  }

  public async clearLogs(targetSerial?: string): Promise<string> {
    const target = this.getDeviceTargetArgs(targetSerial);
    await this.execute([...target, 'logcat', '-c']);
    return 'Logcat buffer cleared successfully.';
  }

  public startLogRecording(
    options: {
      packageName?: string;
      tag?: string;
      filter?: string;
      maxLines?: number;
    } = {},
    targetSerial?: string
  ): { success: boolean; message: string; startedAt: string } {
    if (this.activeLogRecorder) {
      try {
        this.activeLogRecorder.child.kill();
      } catch {}
      this.activeLogRecorder = null;
    }

    const target = this.getDeviceTargetArgs(targetSerial);
    const args = [...target, 'logcat', '-v', 'time'];
    if (options.tag) {
      args.push(`${options.tag}:V`, '*:S');
    }

    const child = spawn(this.adbPath, args);
    const maxLines = options.maxLines || 3000;
    const session: ActiveLogRecorderSession = {
      child,
      lines: [],
      startTime: Date.now(),
      maxLines,
      packageName: options.packageName,
      tag: options.tag,
      filter: options.filter,
      targetSerial
    };

    let leftover = '';
    child.stdout.on('data', (chunk: Buffer) => {
      const text = leftover + chunk.toString('utf-8');
      const split = text.split('\n');
      leftover = split.pop() || '';

      for (const line of split) {
        if (!line.trim()) continue;
        if (session.packageName && !line.includes(session.packageName)) continue;
        if (session.filter && !line.toLowerCase().includes(session.filter.toLowerCase())) continue;

        session.lines.push(line);
        if (session.lines.length > session.maxLines) {
          session.lines.splice(0, session.lines.length - session.maxLines);
        }
      }
    });

    child.on('error', () => {});

    this.activeLogRecorder = session;
    return {
      success: true,
      message: 'Background log recording started. Perform your app actions, then call stop_log_recording to retrieve all captured logs.',
      startedAt: new Date(session.startTime).toISOString()
    };
  }

  public stopLogRecording(): { success: boolean; totalLines: number; durationSeconds: number; logs: string } {
    if (!this.activeLogRecorder) {
      return {
        success: false,
        totalLines: 0,
        durationSeconds: 0,
        logs: 'No active log recording session found.'
      };
    }

    const session = this.activeLogRecorder;
    try {
      session.child.kill();
    } catch {}
    this.activeLogRecorder = null;

    const durationSeconds = Math.round((Date.now() - session.startTime) / 1000);
    return {
      success: true,
      totalLines: session.lines.length,
      durationSeconds,
      logs: session.lines.join('\n')
    };
  }

  public getRecordedLogs(clearAfterRead: boolean = false): { totalLines: number; durationSeconds: number; logs: string } {
    if (!this.activeLogRecorder) {
      return {
        totalLines: 0,
        durationSeconds: 0,
        logs: 'No active log recording session found.'
      };
    }

    const session = this.activeLogRecorder;
    const logs = session.lines.join('\n');
    const totalLines = session.lines.length;
    const durationSeconds = Math.round((Date.now() - session.startTime) / 1000);

    if (clearAfterRead) {
      session.lines = [];
    }

    return {
      totalLines,
      durationSeconds,
      logs
    };
  }

  // ==========================================
  // 7. APP MANAGEMENT & DETAILS
  // ==========================================

  public async installApk(apkPath: string, targetSerial?: string): Promise<string> {
    const resolvedPath = path.resolve(apkPath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`APK file not found at: ${resolvedPath}`);
    }
    const target = this.getDeviceTargetArgs(targetSerial);
    const output = (await this.execute([...target, 'install', '-r', '-g', resolvedPath])) as string;
    return output.trim();
  }

  public async uninstallApp(packageName: string, targetSerial?: string): Promise<string> {
    const target = this.getDeviceTargetArgs(targetSerial);
    const output = (await this.execute([...target, 'uninstall', packageName])) as string;
    return output.trim();
  }

  public async clearAppData(packageName: string, targetSerial?: string): Promise<string> {
    const output = await this.shell(`pm clear ${packageName}`, targetSerial);
    return output.trim(); // typically 'Success'
  }

  public async launchApp(packageName: string, targetSerial?: string): Promise<string> {
    this.invalidateUiCache();
    try {
      const output = await this.shell(`monkey -p ${packageName} -c android.intent.category.LAUNCHER 1`, targetSerial);
      await this.waitForForegroundApp(packageName, 2000);
      if (output.includes('Events injected: 1')) {
        return `Launched ${packageName} successfully.`;
      }
    } catch {}

    await this.shell(`monkey -p ${packageName} 1`, targetSerial);
    await this.waitForForegroundApp(packageName, 2000);
    return `Launched ${packageName} successfully.`;
  }

  public async stopApp(packageName: string, targetSerial?: string): Promise<string> {
    return this.shell(`am force-stop ${packageName}`, targetSerial);
  }

  public async listApps(filter: 'all' | 'third_party' | 'system' = 'third_party', targetSerial?: string): Promise<string[]> {
    let flag = '';
    if (filter === 'third_party') flag = '-3';
    if (filter === 'system') flag = '-s';

    // Specify --user 0 to bypass Samsung secure folder/dual messenger permission errors
    const output = await this.shell(`pm list packages --user 0 ${flag}`, targetSerial);
    return output
      .split('\n')
      .map((line) => line.trim().replace(/^package:/, ''))
      .filter((pkg) => pkg.length > 0 && !pkg.startsWith('Error:'))
      .sort();
  }

  public async searchApps(query: string, filter: 'all' | 'third_party' | 'system' = 'all', targetSerial?: string): Promise<string[]> {
    const all = await this.listApps(filter, targetSerial);
    const q = query.toLowerCase();
    return all.filter((pkg) => pkg.toLowerCase().includes(q));
  }

  public async getAppInfo(packageName: string, targetSerial?: string): Promise<any> {
    const output = await this.shell(`dumpsys package ${packageName}`, targetSerial);
    if (!output || output.includes('Unable to find package')) {
      throw new Error(`Package ${packageName} not found on device.`);
    }

    const versionNameMatch = output.match(/versionName=([^\s]+)/);
    const versionCodeMatch = output.match(/versionCode=([^\s]+)/);
    const minSdkMatch = output.match(/minSdk=([^\s]+)/);
    const targetSdkMatch = output.match(/targetSdk=([^\s]+)/);
    const firstInstallMatch = output.match(/firstInstallTime=([^\r\n]+)/);
    const lastUpdateMatch = output.match(/lastUpdateTime=([^\r\n]+)/);

    // Extract declared permissions
    const permissions: string[] = [];
    const permRegex = /android\.permission\.[A-Z0-9_]+/g;
    let pMatch: RegExpExecArray | null;
    while ((pMatch = permRegex.exec(output)) !== null) {
      if (!permissions.includes(pMatch[0])) {
        permissions.push(pMatch[0]);
      }
    }

    return {
      packageName,
      versionName: versionNameMatch ? versionNameMatch[1] : 'unknown',
      versionCode: versionCodeMatch ? versionCodeMatch[1] : 'unknown',
      minSdk: minSdkMatch ? minSdkMatch[1] : 'unknown',
      targetSdk: targetSdkMatch ? targetSdkMatch[1] : 'unknown',
      firstInstallTime: firstInstallMatch ? firstInstallMatch[1].trim() : 'unknown',
      lastUpdateTime: lastUpdateMatch ? lastUpdateMatch[1].trim() : 'unknown',
      permissionsCount: permissions.length,
      samplePermissions: permissions.slice(0, 15)
    };
  }

  // ==========================================
  // 8. STORAGE & CRISS-CROSS FILE MANAGEMENT
  // ==========================================

  public async pushFile(localPath: string, remotePath: string, targetSerial?: string): Promise<string> {
    const resolved = path.resolve(localPath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Local file not found at: ${resolved}`);
    }
    const target = this.getDeviceTargetArgs(targetSerial);
    const output = (await this.execute([...target, 'push', resolved, remotePath])) as string;
    return output.trim();
  }

  public async pullFile(remotePath: string, localPath: string, targetSerial?: string): Promise<string> {
    const resolved = path.resolve(localPath);
    const dir = path.dirname(resolved);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const target = this.getDeviceTargetArgs(targetSerial);
    const output = (await this.execute([...target, 'pull', remotePath, resolved])) as string;
    return output.trim();
  }

  public async deleteFile(remotePath: string, targetSerial?: string): Promise<string> {
    if (!remotePath || remotePath === '/' || remotePath === '/sdcard' || remotePath === '/sdcard/') {
      throw new Error('Refusing to delete root or base storage directory!');
    }
    const output = await this.shell(`rm -rf "${remotePath}"`, targetSerial);
    return output || `Deleted ${remotePath}`;
  }

  public async listFiles(remotePath: string = '/sdcard', targetSerial?: string): Promise<FileItem[]> {
    const output = await this.shell(`ls -la "${remotePath}"`, targetSerial);
    const lines = output.split('\n');
    const items: FileItem[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('total')) continue;

      const parts = line.split(/\s+/);
      if (parts.length >= 8) {
        const permissions = parts[0];
        const isDirectory = permissions.startsWith('d');
        const size = parseInt(parts[4], 10) || 0;
        const date = `${parts[5]} ${parts[6]}`;
        const name = parts.slice(7).join(' ');

        if (name === '.' || name === '..') continue;

        items.push({
          name,
          path: `${remotePath.replace(/\/+$/, '')}/${name}`,
          isDirectory,
          size,
          permissions,
          date
        });
      }
    }

    return items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  public async readFileText(devicePath: string, maxLines: number = 200, targetSerial?: string): Promise<string> {
    return this.shell(`head -n ${maxLines} "${devicePath}"`, targetSerial);
  }

  public async writeFileText(
    devicePath: string,
    content: string,
    append: boolean = false,
    targetSerial?: string
  ): Promise<string> {
    const base64Content = Buffer.from(content, 'utf-8').toString('base64');
    const op = append ? '>>' : '>';
    const cmd = `echo '${base64Content}' | base64 -d ${op} "${devicePath}"`;
    await this.shell(cmd, targetSerial);
    return `Successfully wrote ${content.length} characters to ${devicePath}`;
  }

  // ==========================================
  // 9. NETWORK INSPECTION & TRAFFIC
  // ==========================================

  public async getNetworkConnections(limit: number = 50, targetSerial?: string): Promise<NetworkConnection[]> {
    const output = await this.shell('ss -tupn || netstat -tlpn', targetSerial);
    const lines = output.split('\n');
    const connections: NetworkConnection[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('Netid') || line.startsWith('Proto') || line.startsWith('Cannot')) {
        continue;
      }

      const parts = line.split(/\s+/);
      if (parts.length >= 5) {
        const protocol = parts[0].toLowerCase();
        const state = parts[1];
        const local = parts[parts.length - 2];
        const peer = parts[parts.length - 1];

        const [localAddress, localPort] = this.splitHostPort(local);
        const [peerAddress, peerPort] = this.splitHostPort(peer);

        connections.push({
          protocol,
          state,
          localAddress,
          localPort,
          peerAddress,
          peerPort
        });

        if (connections.length >= limit) break;
      }
    }

    return connections;
  }

  private splitHostPort(addressPort: string): [string, string] {
    if (!addressPort) return ['*', '*'];
    const lastColon = addressPort.lastIndexOf(':');
    if (lastColon === -1) return [addressPort, '*'];
    return [addressPort.slice(0, lastColon), addressPort.slice(lastColon + 1)];
  }

  public async getNetworkState(targetSerial?: string): Promise<any> {
    const [wifiIp, airplaneMode, ifaceStats] = await Promise.all([
      this.getWifiIp(targetSerial).catch(() => null),
      this.getSystemSetting('global', 'airplane_mode_on', targetSerial).catch(() => '0'),
      this.shell('cat /proc/net/dev', targetSerial).catch(() => '')
    ]);

    const activeInterfaces: Array<{ iface: string; rxBytes: number; txBytes: number }> = [];
    const lines = ifaceStats.split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      const match = line.match(/^([a-zA-Z0-9_-]+):\s*(\d+)\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+(\d+)/);
      if (match) {
        const iface = match[1];
        const rx = parseInt(match[2], 10);
        const tx = parseInt(match[3], 10);
        if (rx > 0 || tx > 0) {
          activeInterfaces.push({ iface, rxBytes: rx, txBytes: tx });
        }
      }
    }

    return {
      wifiConnected: !!wifiIp,
      wifiIpAddress: wifiIp,
      airplaneMode: airplaneMode === '1',
      activeInterfaces
    };
  }

  public async toggleNetwork(
    type: 'wifi' | 'mobile_data' | 'airplane',
    enabled: boolean,
    targetSerial?: string
  ): Promise<string> {
    if (type === 'wifi') {
      const cmd = enabled ? 'svc wifi enable' : 'svc wifi disable';
      await this.shell(cmd, targetSerial);
      return `Wi-Fi turned ${enabled ? 'ON' : 'OFF'}`;
    }

    if (type === 'mobile_data') {
      const cmd = enabled ? 'svc data enable' : 'svc data disable';
      await this.shell(cmd, targetSerial);
      return `Mobile data turned ${enabled ? 'ON' : 'OFF'}`;
    }

    if (type === 'airplane') {
      const val = enabled ? '1' : '0';
      await this.shell(`settings put global airplane_mode_on ${val}`, targetSerial);
      await this.shell(`am broadcast -a android.intent.action.AIRPLANE_MODE --ez state ${enabled}`, targetSerial);
      return `Airplane mode set to ${enabled ? 'ON' : 'OFF'}`;
    }

    throw new Error(`Unknown network type: ${type}`);
  }

  public async toggleBluetooth(enabled: boolean, targetSerial?: string): Promise<string> {
    const cmd = enabled ? 'cmd bluetooth_manager enable' : 'cmd bluetooth_manager disable';
    try {
      await this.shell(cmd, targetSerial);
    } catch {
      await this.shell(enabled ? 'svc bluetooth enable' : 'svc bluetooth disable', targetSerial);
    }
    return `Bluetooth set to ${enabled ? 'ON' : 'OFF'}`;
  }

  public async toggleAutoRotate(enabled: boolean, targetSerial?: string): Promise<string> {
    const val = enabled ? 1 : 0;
    await this.shell(`settings put system accelerometer_rotation ${val}`, targetSerial);
    return `Auto-rotation set to ${enabled ? 'ON' : 'OFF'}`;
  }

  public async setRingerMode(
    mode: 'normal' | 'vibrate' | 'silent',
    targetSerial?: string
  ): Promise<string> {
    const val = mode === 'normal' ? 2 : mode === 'vibrate' ? 1 : 0;
    try {
      await this.shell(`cmd audio set-ringer-mode ${val}`, targetSerial);
    } catch {}
    await this.shell(`settings put global mode_ringer ${val}`, targetSerial);
    return `Ringer mode set to "${mode}"`;
  }

  public async setVolume(
    action: 'up' | 'down' | 'mute' | 'unmute',
    targetSerial?: string
  ): Promise<string> {
    if (action === 'up') {
      await this.pressKey('VOLUME_UP', targetSerial);
      return 'Volume increased';
    }
    if (action === 'down') {
      await this.pressKey('VOLUME_DOWN', targetSerial);
      return 'Volume decreased';
    }
    if (action === 'mute' || action === 'unmute') {
      await this.pressKey('MUTE', targetSerial);
      return `Volume ${action}d`;
    }
    throw new Error(`Invalid volume action: ${action}`);
  }

  public async goHome(targetSerial?: string): Promise<string> {
    await this.pressKey('HOME', targetSerial);
    return 'Returned to Home screen';
  }

  public async openRecentApps(targetSerial?: string): Promise<string> {
    await this.pressKey('RECENTS', targetSerial);
    return 'Opened Recent Apps switcher';
  }

  public async openNotifications(targetSerial?: string): Promise<string> {
    await this.shell('cmd statusbar expand-notifications', targetSerial);
    return 'Expanded notifications panel';
  }

  public async openQuickSettings(targetSerial?: string): Promise<string> {
    await this.shell('cmd statusbar expand-settings', targetSerial);
    return 'Expanded quick settings panel';
  }

  // ==========================================
  // 10. ANDROID SETTINGS & CLIPBOARD
  // ==========================================

  public async getSystemSetting(
    namespace: 'system' | 'secure' | 'global',
    key: string,
    targetSerial?: string
  ): Promise<string> {
    const output = await this.shell(`settings get ${namespace} ${key}`, targetSerial);
    return output.trim();
  }

  public async putSystemSetting(
    namespace: 'system' | 'secure' | 'global',
    key: string,
    value: string,
    targetSerial?: string
  ): Promise<string> {
    await this.shell(`settings put ${namespace} ${key} "${value}"`, targetSerial);
    return `Setting ${namespace}/${key} set to "${value}"`;
  }

  public async getClipboard(targetSerial?: string): Promise<string> {
    try {
      const out = await this.shell('cmd clipboard get 2>/dev/null', targetSerial);
      if (out && !out.includes('No shell command')) {
        return out.trim();
      }
    } catch {}
    return 'Clipboard reading directly via shell is restricted by Android security on this OS version.';
  }

  public async setClipboard(text: string, targetSerial?: string): Promise<string> {
    try {
      await this.shell(`cmd clipboard set "${text.replace(/"/g, '\\"')}" 2>/dev/null`, targetSerial);
      return `Clipboard text updated to "${text}"`;
    } catch {
      return `Clipboard service not accessible directly via shell. Use type_text instead to paste text into input fields.`;
    }
  }

  // ==========================================
  // 11. DEVICE LIFECYCLE, NOTIFICATIONS & PROFILING
  // ==========================================

  public async unlockDevice(pin?: string, targetSerial?: string): Promise<{ success: boolean; message: string }> {
    await this.shell('input keyevent KEYCODE_WAKEUP', targetSerial);
    await new Promise((r) => setTimeout(r, 200));

    const res = await this.getScreenResolution(targetSerial).catch(() => ({ width: 1080, height: 2340 }));
    const cx = Math.round(res.width / 2);
    const y1 = Math.round(res.height * 0.82);
    const y2 = Math.round(res.height * 0.22);
    await this.swipe(cx, y1, cx, y2, 180, targetSerial);
    await new Promise((r) => setTimeout(r, 350));

    if (pin) {
      await this.inputText(pin, targetSerial);
      await this.pressKey('ENTER', targetSerial);
      await new Promise((r) => setTimeout(r, 400));
    }

    this.invalidateUiCache();
    return {
      success: true,
      message: pin ? 'Woke device screen, swiped lockscreen, and delivered PIN' : 'Woke device screen and swiped lockscreen'
    };
  }

  public async getDeviceState(targetSerial?: string): Promise<{
    battery: { level: number; status: string; temperatureC: number; isCharging: boolean };
    screen: { isScreenOn: boolean; isLocked: boolean; orientation: 'portrait' | 'landscape'; resolution: { width: number; height: number } };
    audio: { ringerMode: string; isMusicActive: boolean };
    network: { wifiConnected: boolean; ipAddress?: string; airplaneMode: boolean };
    foregroundApp: { packageName: string; activity: string };
    storage: { total: string; free: string; usedPercent: string };
    serverTime: { serverTimeMs: number; iso: string };
  }> {
    const [batteryDump, powerDump, windowDump, audioDump, netState, currentApp, res, storageOut] = await Promise.all([
      this.shell('dumpsys battery', targetSerial).catch(() => ''),
      this.shell('dumpsys power | grep -E "mHoldingDisplaySuspendBlocker|mScreenOn|Display Power"', targetSerial).catch(() => ''),
      this.shell('dumpsys window | grep -E "mDreamingLockscreen|mShowingDream|mKeyguardShowing|mCurrentFocus"', targetSerial).catch(() => ''),
      this.shell('dumpsys audio | grep -E "Ringer mode|isMusicActive"', targetSerial).catch(() => ''),
      this.getNetworkState(targetSerial).catch(() => ({ wifiConnected: false, airplaneMode: false })),
      this.getCurrentApp(targetSerial).catch(() => ({ packageName: '', activity: '' })),
      this.getScreenResolution(targetSerial).catch(() => ({ width: 1080, height: 2340 })),
      this.shell('df -h /data | tail -n 1', targetSerial).catch(() => '')
    ]);

    const levelMatch = batteryDump.match(/level:\s*(\d+)/);
    const statusMatch = batteryDump.match(/status:\s*(\d+)/);
    const tempMatch = batteryDump.match(/temperature:\s*(\d+)/);
    const batteryLevel = levelMatch ? parseInt(levelMatch[1], 10) : 0;
    const isCharging = statusMatch ? statusMatch[1] === '2' || statusMatch[1] === '5' : false;
    const tempC = tempMatch ? parseInt(tempMatch[1], 10) / 10 : 0;

    const isScreenOn = powerDump.includes('true') || powerDump.includes('ON') || powerDump.includes('mScreenOn=true');
    const isLocked = windowDump.includes('mKeyguardShowing=true') || windowDump.includes('mShowingDream=true');
    const orientation: 'portrait' | 'landscape' = res.width > res.height ? 'landscape' : 'portrait';

    const ringerMatch = audioDump.match(/Ringer mode:\s*(\w+)/);
    const isMusicActive = audioDump.includes('isMusicActive()=true');

    let total = 'Unknown';
    let free = 'Unknown';
    let usedPercent = 'Unknown';
    const storageParts = storageOut.trim().split(/\s+/);
    if (storageParts.length >= 5) {
      total = storageParts[1];
      free = storageParts[3];
      usedPercent = storageParts[4];
    }

    return {
      battery: {
        level: batteryLevel,
        status: isCharging ? 'Charging' : 'Discharging',
        temperatureC: tempC,
        isCharging
      },
      screen: {
        isScreenOn,
        isLocked,
        orientation,
        resolution: res
      },
      audio: {
        ringerMode: ringerMatch ? ringerMatch[1] : 'normal',
        isMusicActive
      },
      network: {
        wifiConnected: (netState as any).wifiConnected,
        ipAddress: (netState as any).wifiIpAddress,
        airplaneMode: (netState as any).airplaneMode
      },
      foregroundApp: currentApp,
      storage: {
        total,
        free,
        usedPercent
      },
      serverTime: {
        serverTimeMs: Date.now(),
        iso: new Date().toISOString()
      }
    };
  }

  public async getNotifications(limit: number = 20, targetSerial?: string): Promise<AppNotification[]> {
    const output = await this.shell('dumpsys notification --noredact 2>/dev/null || dumpsys notification', targetSerial);
    const notifications: AppNotification[] = [];

    const blocks = output.split(/NotificationRecord\(/g);
    for (let i = 1; i < blocks.length; i++) {
      const b = blocks[i];
      const pkgMatch = b.match(/pkg=([a-zA-Z0-9._]+)/);
      const titleMatch = b.match(/android\.title=String\s*\(([^)]*)\)/);
      const textMatch = b.match(/android\.text=String\s*\(([^)]*)\)/);

      const pkg = pkgMatch ? pkgMatch[1] : '';
      const title = titleMatch ? titleMatch[1].trim() : '';
      const text = textMatch ? textMatch[1].trim() : '';

      if (title || text) {
        notifications.push({
          packageName: pkg,
          title,
          text
        });
      }
    }

    return notifications.slice(0, limit);
  }

  public async readLatestOtp(targetSerial?: string): Promise<{
    found: boolean;
    otp?: string;
    sourceApp?: string;
    messageSnippet?: string;
    message: string;
  }> {
    const notifications = await this.getNotifications(30, targetSerial);
    const otpKeywords = ['otp', 'code', 'verification', 'verify', 'pin', 'login', 'security', 'one time', 'one-time'];
    const digitRegex = /\b(\d{4,8})\b/;

    for (const notif of notifications) {
      const full = `${notif.title} ${notif.text}`.toLowerCase();
      const hasKeyword = otpKeywords.some((kw) => full.includes(kw));

      if (hasKeyword) {
        const match = notif.text.match(digitRegex) || notif.title.match(digitRegex);
        if (match) {
          const otp = match[1];
          return {
            found: true,
            otp,
            sourceApp: notif.packageName,
            messageSnippet: notif.text || notif.title,
            message: `Found verification OTP code ${otp} from ${notif.packageName}`
          };
        }
      }
    }

    return {
      found: false,
      message: 'No OTP or verification code detected in active notifications.'
    };
  }

  public async autoDismissDialog(
    action: 'allow' | 'deny' | 'dismiss' = 'allow',
    targetSerial?: string
  ): Promise<{ dismissed: boolean; buttonTapped?: string; message: string }> {
    const xml = await this.getUiHierarchy(targetSerial, 3500, true);
    const elements = this.parseUiElements(xml);

    const allowKeywords = [
      'while using the app',
      'only this time',
      'allow',
      'agree',
      'accept',
      'ok',
      'yes',
      'continue',
      'got it',
      'confirm'
    ];

    const denyKeywords = [
      "don't allow",
      'dont allow',
      'deny',
      'decline',
      'reject',
      'not now',
      'cancel',
      'dismiss',
      'skip',
      'later',
      'no thanks',
      'close'
    ];

    const targetList = action === 'allow' ? allowKeywords : denyKeywords;

    for (const kw of targetList) {
      const el = elements.find((e) => {
        const s = `${e.text} ${e.contentDesc}`.toLowerCase();
        return s === kw || (s.includes(kw) && e.clickable);
      });

      if (el) {
        await this.tap(el.center[0], el.center[1], targetSerial);
        this.invalidateUiCache();
        return {
          dismissed: true,
          buttonTapped: el.text || el.contentDesc || kw,
          message: `Dismissed dialog by tapping "${el.text || el.contentDesc || kw}" at (${el.center[0]}, ${el.center[1]})`
        };
      }
    }

    return {
      dismissed: false,
      message: 'No matching permission or system dialog buttons found on current screen.'
    };
  }

  public async adjustSlider(
    query: string,
    percentage: number,
    targetSerial?: string
  ): Promise<{ success: boolean; tappedAt?: [number, number]; message: string }> {
    const pct = Math.min(Math.max(0, percentage), 100);
    const xml = await this.getUiHierarchy(targetSerial);
    const elements = this.parseUiElements(xml);

    let slider = elements.find((e) => {
      const isSliderType =
        e.type === 'slider' ||
        e.className.toLowerCase().includes('seekbar') ||
        e.className.toLowerCase().includes('progressbar');
      const label = `${e.text} ${e.contentDesc} ${e.resourceId}`.toLowerCase();
      return isSliderType && (label.includes(query.toLowerCase()) || query === 'any');
    });

    if (!slider) {
      const match = await this.searchElement(query, targetSerial);
      if (match.found && match.element) {
        const cy = match.element.center[1];
        slider = elements.find(
          (e) =>
            (e.type === 'slider' || e.className.toLowerCase().includes('seekbar')) &&
            Math.abs(e.center[1] - cy) < 200
        );
      }
    }

    if (!slider) {
      slider = elements.find((e) => e.type === 'slider' || e.className.toLowerCase().includes('seekbar'));
    }

    if (!slider) {
      return {
        success: false,
        message: `No slider or seekbar matching "${query}" was found on screen.`
      };
    }

    const [x1, y1, x2, y2] = slider.bounds;
    const targetX = Math.round(x1 + (x2 - x1) * (pct / 100));
    const targetY = Math.round((y1 + y2) / 2);

    await this.tap(targetX, targetY, targetSerial);
    this.invalidateUiCache();

    return {
      success: true,
      tappedAt: [targetX, targetY],
      message: `Adjusted slider to ${pct}% at (${targetX}, ${targetY})`
    };
  }

  public async pinchZoom(
    options: {
      direction: 'in' | 'out';
      center?: [number, number];
      percent?: number;
    },
    targetSerial?: string
  ): Promise<{ success: boolean; message: string }> {
    const res = await this.getScreenResolution(targetSerial).catch(() => ({ width: 1080, height: 2340 }));
    const [cx, cy] = options.center || [Math.round(res.width / 2), Math.round(res.height / 2)];
    const distance = Math.round((res.height * 0.15) * ((options.percent || 50) / 50));

    // Universal double-tap-and-drag gesture
    const dragY = options.direction === 'in' ? cy + distance : cy - distance;

    await this.tap(cx, cy, targetSerial);
    await new Promise((r) => setTimeout(r, 65));
    await this.swipe(cx, cy, cx, dragY, 320, targetSerial);
    this.invalidateUiCache();

    return {
      success: true,
      message: `Executed zoom ${options.direction.toUpperCase()} gesture at (${cx}, ${cy})`
    };
  }

  public async getAppPerformance(
    packageName?: string,
    targetSerial?: string
  ): Promise<AppPerformanceMetrics> {
    const pkg = packageName || (await this.getCurrentApp(targetSerial)).packageName;
    if (!pkg) throw new Error('No package name specified or currently in foreground');

    const [topOut, memOut, gfxOut] = await Promise.all([
      this.shell(`top -b -n 1 -q | grep "${pkg}" | head -n 1`, targetSerial).catch(() => ''),
      this.shell(`dumpsys meminfo ${pkg} | grep -E "TOTAL PSS:|Native Heap|Dalvik Heap"`, targetSerial).catch(() => ''),
      this.shell(`dumpsys gfxinfo ${pkg} framestats`, targetSerial).catch(() => '')
    ]);

    let cpuPercent = 0;
    const topParts = topOut.trim().split(/\s+/);
    for (const p of topParts) {
      if (/^\d+\.\d+$/.test(p) || /^\d+%?$/.test(p)) {
        const num = parseFloat(p.replace('%', ''));
        if (!isNaN(num) && num <= 1000) {
          cpuPercent = num;
          break;
        }
      }
    }

    let totalPss = 0;
    let nativeHeap = 0;
    let dalvikHeap = 0;

    const pssMatch = memOut.match(/TOTAL PSS:\s*(\d+)/i) || memOut.match(/TOTAL\s+(\d+)/);
    if (pssMatch) totalPss = Math.round(parseInt(pssMatch[1], 10) / 1024);

    const nativeMatch = memOut.match(/Native Heap\s+(\d+)/i);
    if (nativeMatch) nativeHeap = Math.round(parseInt(nativeMatch[1], 10) / 1024);

    const dalvikMatch = memOut.match(/Dalvik Heap\s+(\d+)/i);
    if (dalvikMatch) dalvikHeap = Math.round(parseInt(dalvikMatch[1], 10) / 1024);

    let totalFrames = 0;
    let jankyFrames = 0;
    let jankPercentage = 0;

    const totalMatch = gfxOut.match(/Total frames rendered:\s*(\d+)/);
    const jankMatch = gfxOut.match(/Janky frames:\s*(\d+)\s*\(([\d.]+)%\)/);

    if (totalMatch) totalFrames = parseInt(totalMatch[1], 10);
    if (jankMatch) {
      jankyFrames = parseInt(jankMatch[1], 10);
      jankPercentage = parseFloat(jankMatch[2]);
    }

    return {
      packageName: pkg,
      cpuPercent,
      ramMB: {
        totalPss,
        nativeHeap,
        dalvikHeap
      },
      fps: {
        totalFrames,
        jankyFrames,
        jankPercentage
      },
      threads: 1
    };
  }

  // ==========================================
  // 12. TIME SYNCHRONIZATION & EXECUTION TIMERS
  // ==========================================

  public async handleExecutionTimestamp(executeAtTimestamp?: number): Promise<{
    scheduled: boolean;
    delayMs: number;
    jitterMs: number;
    executedAt: number;
    serverTimeMs: number;
  }> {
    const now = Date.now();
    if (executeAtTimestamp && executeAtTimestamp > now) {
      const delayMs = executeAtTimestamp - now;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      const executedAt = Date.now();
      return { scheduled: true, delayMs, jitterMs: 0, executedAt, serverTimeMs: executedAt };
    }
    const jitterMs = executeAtTimestamp ? Math.max(0, now - executeAtTimestamp) : 0;
    return { scheduled: false, delayMs: 0, jitterMs, executedAt: now, serverTimeMs: now };
  }

  public getServerTime(): {
    serverTimeMs: number;
    formattedTime: string;
    iso: string;
    timezoneOffsetMin: number;
    usageInstructions: string;
  } {
    const now = new Date();
    return {
      serverTimeMs: now.getTime(),
      formattedTime: now.toLocaleString(),
      iso: now.toISOString(),
      timezoneOffsetMin: now.getTimezoneOffset(),
      usageInstructions:
        'Use serverTimeMs as your baseline anchor clock. To eliminate LLM token generation jitter and coordinate multi-step actions (like click at T, screenshot at T+300ms), pass target epoch milliseconds as execute_at_timestamp to any action tool.'
    };
  }

  // ==========================================
  // 13. BROWSER & SYSTEM DIAGNOSTICS
  // ==========================================

  public async openUrl(url: string, targetSerial?: string): Promise<string> {
    let targetUrl = url;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }
    return this.shell(`am start -a android.intent.action.VIEW -d "${targetUrl}"`, targetSerial);
  }

  public async getDeviceInfo(targetSerial?: string): Promise<DeviceInfo> {
    const serial = targetSerial || this.selectedSerial || 'unknown';
    const [
      model,
      manufacturer,
      androidVersion,
      sdkVersion,
      batteryOutput,
      resolution,
      densityOutput,
      wifiIp
    ] = await Promise.all([
      this.shell('getprop ro.product.model', serial).catch(() => 'Unknown Model'),
      this.shell('getprop ro.product.manufacturer', serial).catch(() => 'Unknown Manufacturer'),
      this.shell('getprop ro.build.version.release', serial).catch(() => 'Unknown Android'),
      this.shell('getprop ro.build.version.sdk', serial).catch(() => 'Unknown SDK'),
      this.shell('dumpsys battery', serial).catch(() => ''),
      this.getScreenResolution(serial).catch(() => ({ width: 1080, height: 2400 })),
      this.shell('wm density', serial).catch(() => ''),
      this.getWifiIp(serial).catch(() => null)
    ]);

    let batteryLevel = 100;
    let batteryStatus = 'Charging';
    const levelMatch = batteryOutput.match(/level:\s*(\d+)/i);
    if (levelMatch) batteryLevel = parseInt(levelMatch[1], 10);

    const statusMatch = batteryOutput.match(/status:\s*(\d+)/i);
    if (statusMatch) {
      const code = parseInt(statusMatch[1], 10);
      if (code === 2) batteryStatus = 'Charging';
      else if (code === 3) batteryStatus = 'Discharging';
      else if (code === 4) batteryStatus = 'Not charging';
      else if (code === 5) batteryStatus = 'Full';
    }

    let density = 420;
    const densityMatch = densityOutput.match(/density:\s*(\d+)/i);
    if (densityMatch) density = parseInt(densityMatch[1], 10);

    const ipAddress = wifiIp || undefined;

    return {
      serial,
      model,
      manufacturer,
      androidVersion,
      sdkVersion,
      batteryLevel,
      batteryStatus,
      resolution,
      density,
      ipAddress
    };
  }
}

export const adb = new AdbManager();

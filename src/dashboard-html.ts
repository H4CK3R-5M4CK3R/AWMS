export const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AWMS by LogicSpine - Android Web Management Service</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="/jmuxer.min.js"></script>
  <style>
    :root {
      --bg-primary: #0a0c10;
      --bg-secondary: #12161f;
      --bg-card: rgba(22, 28, 40, 0.75);
      --bg-card-hover: rgba(30, 38, 54, 0.85);
      --border: rgba(255, 255, 255, 0.08);
      --border-focus: #3b82f6;
      --accent: #3b82f6;
      --accent-glow: rgba(59, 130, 246, 0.25);
      --accent-green: #10b981;
      --accent-green-glow: rgba(16, 185, 129, 0.2);
      --accent-red: #ef4444;
      --accent-amber: #f59e0b;
      --text-main: #f1f5f9;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Outfit', sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    body {
      background: var(--bg-primary);
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }

    /* Ambient background gradient */
    body::before {
      content: '';
      position: fixed;
      top: -20%;
      left: 20%;
      width: 60vw;
      height: 60vh;
      background: radial-gradient(circle, rgba(59, 130, 246, 0.07) 0%, transparent 70%);
      pointer-events: none;
      z-index: 0;
    }

    header {
      background: rgba(18, 22, 31, 0.85);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--border);
      padding: 14px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 50;
    }

    .logo-container {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-badge {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, #2563eb, #10b981);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 16px var(--accent-glow);
    }

    .logo-badge svg {
      width: 22px;
      height: 22px;
      fill: #fff;
    }

    .logo-text h1 {
      font-size: 1.15rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .logo-text span {
      font-size: 0.75rem;
      color: var(--accent-green);
      background: var(--accent-green-glow);
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid rgba(16, 185, 129, 0.3);
      font-weight: 500;
    }

    .header-device-selector {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    select, input, button {
      outline: none;
      font-size: 0.88rem;
    }

    .styled-select {
      background: var(--bg-secondary);
      color: var(--text-main);
      border: 1px solid var(--border);
      padding: 8px 14px;
      border-radius: 8px;
      cursor: pointer;
      min-width: 200px;
      transition: all 0.2s ease;
    }

    .styled-select:focus {
      border-color: var(--border-focus);
      box-shadow: 0 0 0 2px var(--accent-glow);
    }

    .btn {
      background: var(--bg-card);
      color: var(--text-main);
      border: 1px solid var(--border);
      padding: 8px 14px;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .btn:hover {
      background: var(--bg-card-hover);
      border-color: rgba(255, 255, 255, 0.2);
    }

    .btn-primary {
      background: #2563eb;
      border-color: #3b82f6;
      color: white;
    }

    .btn-primary:hover {
      background: #1d4ed8;
      box-shadow: 0 0 12px var(--accent-glow);
    }

    .btn-success {
      background: #059669;
      border-color: #10b981;
      color: white;
    }

    .btn-success:hover {
      background: #047857;
      box-shadow: 0 0 12px var(--accent-green-glow);
    }

    .btn-danger {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.3);
      color: #f87171;
    }

    .btn-danger:hover {
      background: rgba(239, 68, 68, 0.3);
    }

    .btn-sm {
      padding: 4px 10px;
      font-size: 0.8rem;
    }

    /* Main Layout Grid */
    main {
      flex: 1;
      display: grid;
      grid-template-columns: 460px 1fr;
      gap: 24px;
      padding: 24px;
      max-width: 1750px;
      margin: 0 auto;
      width: 100%;
      position: relative;
      z-index: 1;
    }

    @media (max-width: 1050px) {
      main {
        grid-template-columns: 1fr;
      }
    }

    /* Screen Mirror Column */
    .screen-column {
      display: flex;
      flex-direction: column;
      gap: 16px;
      align-items: center;
    }

    .device-chassis {
      background: #000;
      border: 3px solid #27272a;
      border-radius: 36px;
      padding: 12px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05);
      position: relative;
      width: 100%;
      max-width: 400px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .screen-viewport {
      width: 100%;
      aspect-ratio: 9 / 19.5;
      background: #0d1117;
      border-radius: 26px;
      overflow: hidden;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: crosshair;
      user-select: none;
    }

    #screen-video, #screen-canvas {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
      cursor: crosshair;
      background: #000;
    }

    .screen-overlay-status {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      color: var(--text-dim);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }

    /* Device Hardware Nav Keys */
    .nav-bar {
      display: flex;
      justify-content: space-around;
      align-items: center;
      width: 100%;
      padding: 12px 0 4px 0;
    }

    .nav-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 8px 16px;
      border-radius: 12px;
      transition: all 0.2s;
    }

    .nav-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-main);
    }

    .nav-btn svg {
      width: 20px;
      height: 20px;
      fill: currentColor;
    }

    .quick-type-bar {
      display: flex;
      gap: 8px;
      width: 100%;
      max-width: 400px;
    }

    .quick-type-bar input {
      flex: 1;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px 12px;
      color: var(--text-main);
    }

    .quick-type-bar input:focus {
      border-color: var(--border-focus);
    }

    /* Stream Quality Selector Bar */
    .quality-selector-bar {
      display: flex;
      gap: 4px;
      width: 100%;
      max-width: 400px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 4px;
      justify-content: space-between;
    }

    .quality-btn {
      flex: 1;
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 6px 4px;
      border-radius: 6px;
      font-size: 0.76rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: center;
      white-space: nowrap;
    }

    .quality-btn:hover {
      color: var(--text-main);
      background: rgba(255, 255, 255, 0.05);
    }

    .quality-btn.active {
      color: white;
      background: #2563eb;
      font-weight: 600;
      box-shadow: 0 0 10px var(--accent-glow);
    }

    .custom-quality-panel {
      width: 100%;
      max-width: 400px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px 14px;
      margin-top: -6px;
    }

    .custom-quality-panel input[type="range"] {
      width: 100%;
      accent-color: #3b82f6;
      cursor: pointer;
    }

    .stream-stat-badge {
      font-size: 0.74rem;
      color: var(--text-dim);
      font-family: 'JetBrains Mono', monospace;
      text-align: center;
      padding: 2px 0 6px 0;
    }

    /* Management Column (Tabs & Panels) */
    .management-column {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .card {
      background: var(--bg-card);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 18px 22px;
      position: relative;
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }

    .card-header h2 {
      font-size: 1.02rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Tabbed navigation */
    .tabs-header {
      display: flex;
      gap: 6px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 8px;
      margin-bottom: 16px;
      overflow-x: auto;
    }

    .tab-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 0.88rem;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .tab-btn:hover {
      color: var(--text-main);
      background: rgba(255, 255, 255, 0.05);
    }

    .tab-btn.active {
      color: white;
      background: #2563eb;
      box-shadow: 0 0 12px var(--accent-glow);
    }

    .tab-pane {
      display: none;
    }

    .tab-pane.active {
      display: block;
    }

    /* Info Pill Grid */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 10px;
    }

    .info-item {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px 12px;
    }

    .info-label {
      font-size: 0.72rem;
      color: var(--text-dim);
      text-transform: uppercase;
      font-weight: 600;
    }

    .info-value {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-main);
      margin-top: 2px;
    }

    /* Forms & Inputs */
    .form-row {
      display: flex;
      gap: 10px;
      margin-bottom: 12px;
      align-items: center;
    }

    .input-field {
      flex: 1;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px 12px;
      color: var(--text-main);
      font-size: 0.88rem;
    }

    .input-field:focus {
      border-color: var(--border-focus);
    }

    /* File Table */
    .table-container {
      max-height: 380px;
      overflow-y: auto;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--bg-secondary);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.84rem;
    }

    th {
      background: rgba(255, 255, 255, 0.03);
      padding: 10px 14px;
      text-align: left;
      font-weight: 600;
      color: var(--text-dim);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      backdrop-filter: blur(8px);
    }

    td {
      padding: 8px 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: var(--text-main);
    }

    tr:hover td {
      background: rgba(255, 255, 255, 0.03);
    }

    .file-name-cell {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }

    .file-name-cell:hover {
      color: var(--accent);
    }

    /* Console / Terminal */
    .terminal-box {
      background: #06090e;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 14px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.82rem;
      color: #38bdf8;
      height: 260px;
      overflow-y: auto;
      white-space: pre-wrap;
      margin-bottom: 10px;
    }

    /* MCP JSON snippet box */
    .code-box {
      background: #06090e;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.82rem;
      color: #a7f3d0;
      overflow-x: auto;
      position: relative;
    }

    .copy-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      font-size: 0.75rem;
      padding: 4px 8px;
    }

    /* Modal Styles */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(4, 7, 13, 0.85);
      backdrop-filter: blur(14px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease;
    }

    .modal-card {
      background: rgba(18, 24, 38, 0.95);
      border: 1px solid rgba(59, 130, 246, 0.35);
      border-radius: 20px;
      padding: 32px 28px;
      width: 100%;
      max-width: 440px;
      text-align: center;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(59, 130, 246, 0.2);
    }

    .spin-anim {
      animation: spin 1s linear infinite;
    }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    .unplug-animation-container {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.12);
      border: 2px dashed rgba(16, 185, 129, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
      animation: pulseGlow 1.8s infinite ease-in-out;
    }
    @keyframes pulseGlow {
      0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); transform: scale(1); }
      50% { box-shadow: 0 0 25px 8px rgba(16, 185, 129, 0.2); transform: scale(1.05); }
    }

    .pulsing-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      display: inline-block;
      animation: blink 1s infinite alternate;
    }
    @keyframes blink { 0% { opacity: 0.3; } 100% { opacity: 1; } }

    .magic-switch-card {
      background: linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(16, 185, 129, 0.15));
      border: 1px solid rgba(59, 130, 246, 0.4);
      border-radius: 12px;
      padding: 16px 18px;
      margin-bottom: 20px;
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.1);
    }

    /* Toast Notification */
    #toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #1e293b;
      color: #fff;
      padding: 12px 20px;
      border-radius: 8px;
      border: 1px solid var(--border);
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      display: none;
      z-index: 100;
      font-size: 0.88rem;
    }
  </style>
</head>
<body>

  <header>
    <div class="logo-container">
      <div class="logo-badge">
        <svg viewBox="0 0 24 24"><path d="M16.6 5.5l1.8-3.1c.1-.2 0-.5-.2-.6-.2-.1-.5 0-.6.2l-1.9 3.2C14.3 4.5 12.7 4 11 4s-3.3.5-4.7 1.2L4.4 2c-.1-.2-.4-.3-.6-.2-.2.1-.3.4-.2.6l1.8 3.1C2.5 7.6 1 11.1 1 15h20c0-3.9-1.5-7.4-4.4-9.5zM6 11.5c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5zm10 0c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5zM1 17h20v2H1v-2z"/></svg>
      </div>
      <div class="logo-text">
        <h1>AWMS <span style="font-size: 0.72rem; color: #94a3b8; font-weight: 500; margin-left: 6px;">by LogicSpine • v0.1.1</span></h1>
      </div>
    </div>

    <div class="header-device-selector">
      <select id="device-select" class="styled-select" onchange="onDeviceSelected(this.value)">
        <option value="">Detecting devices...</option>
      </select>
      <button class="btn btn-sm" onclick="fetchDevices()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/></svg>
        Refresh
      </button>
    </div>
  </header>

  <main>
    <!-- Left Column: Interactive Screen Viewport -->
    <div class="screen-column">
      <div class="device-chassis">
        <div class="screen-viewport" id="screen-viewport">
          <video id="screen-video" autoplay muted playsinline></video>
          <canvas id="screen-canvas" style="display: none;"></canvas>
          <div class="screen-overlay-status" id="screen-loader">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            <span>Waiting for device stream...</span>
          </div>
        </div>

        <!-- Hardware Touch Nav Keys -->
        <div class="nav-bar">
          <button class="nav-btn" title="Back" onclick="sendKey('BACK')">
            <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          </button>
          <button class="nav-btn" title="Home" onclick="sendKey('HOME')">
            <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
          </button>
          <button class="nav-btn" title="Recents / App Switcher" onclick="sendKey('RECENTS')">
            <svg viewBox="0 0 24 24"><path d="M3 3h18v18H3V3zm2 2v14h14V5H5z"/></svg>
          </button>
          <button class="nav-btn" title="Power" onclick="sendKey('POWER')">
            <svg viewBox="0 0 24 24"><path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z"/></svg>
          </button>
          <button class="nav-btn" title="Take Screenshot" onclick="downloadScreenshot()">
            <svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
          </button>
        </div>
      </div>

      <!-- Live Stream Quality Controller -->
      <div class="stream-stat-badge" id="stream-stat-badge">Stream: 720p @ 4.0 Mbps • 60 FPS (H.264)</div>

      <div class="quality-selector-bar">
        <button class="quality-btn" id="btn-q-fast" onclick="setQualityPreset('fast')" title="Low bandwidth / Maximum FPS">⚡ Fast (480p)</button>
        <button class="quality-btn active" id="btn-q-balanced" onclick="setQualityPreset('balanced')" title="Crisp text and balanced speed">⚖️ Balanced (720p)</button>
        <button class="quality-btn" id="btn-q-ultra" onclick="setQualityPreset('ultra')" title="Pixel-perfect native resolution">💎 HD (1080p)</button>
        <button class="quality-btn" id="btn-q-custom" onclick="toggleCustomQuality()" title="Custom resolution and bitrate">⚙️ Custom</button>
      </div>

      <div id="custom-quality-panel" class="custom-quality-panel" style="display: none;">
        <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 4px;">
          <span style="color: var(--text-muted);">Resolution:</span>
          <strong id="label-res-val" style="color: #60a5fa;">720p</strong>
        </div>
        <input type="range" id="slider-res" min="360" max="1080" step="120" value="720" oninput="onCustomSliderChange()">

        <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin: 10px 0 4px 0;">
          <span style="color: var(--text-muted);">Bitrate:</span>
          <strong id="label-bitrate-val" style="color: #10b981;">4.0 Mbps</strong>
        </div>
        <input type="range" id="slider-bitrate" min="1" max="16" step="0.5" value="4" oninput="onCustomSliderChange()">

        <button class="btn btn-primary btn-sm" style="width: 100%; margin-top: 10px; justify-content: center;" onclick="applyCustomQuality()">Apply Custom Quality</button>
      </div>

      <!-- Quick Text Typing -->
      <div class="quick-type-bar">
        <input type="text" id="type-input" placeholder="Type text to send to phone input..." onkeydown="if(event.key==='Enter') sendInputText()">
        <button class="btn btn-primary btn-sm" onclick="sendInputText()">Send</button>
      </div>
    </div>

    <!-- Right Column: Management Suite & Shortcuts -->
    <div class="management-column">

      <!-- Device Diagnostics Summary -->
      <div class="card">
        <div class="card-header">
          <h2>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
            Device Diagnostics
          </h2>
          <span id="device-state-tag" class="info-value" style="color: var(--accent-green); font-size: 0.8rem;">Ready</span>
        </div>
        <div class="info-grid" id="info-grid">
          <div class="info-item"><div class="info-label">Model</div><div class="info-value" id="diag-model">-</div></div>
          <div class="info-item"><div class="info-label">Android</div><div class="info-value" id="diag-os">-</div></div>
          <div class="info-item"><div class="info-label">Battery</div><div class="info-value" id="diag-battery">-</div></div>
          <div class="info-item"><div class="info-label">Resolution</div><div class="info-value" id="diag-res">-</div></div>
          <div class="info-item"><div class="info-label">IP Address</div><div class="info-value" id="diag-ip">-</div></div>
        </div>
      </div>

      <!-- Tabs Navigation -->
      <div class="card">
        <div class="tabs-header">
          <button class="tab-btn active" onclick="openTab('tab-wireless')">📡 Wireless ADB</button>
          <button class="tab-btn" onclick="openTab('tab-apk')">📦 APK Installer</button>
          <button class="tab-btn" onclick="openTab('tab-files'); loadFiles()">📁 Storage (Criss-Cross)</button>
          <button class="tab-btn" onclick="openTab('tab-apps'); loadApps()">📱 App Manager</button>
          <button class="tab-btn" onclick="openTab('tab-shell')">💻 Shell Console</button>
          <button class="tab-btn" onclick="openTab('tab-mcp')">🤖 AI / MCP Setup</button>
        </div>

        <!-- Tab 1: Wireless ADB -->
        <div id="tab-wireless" class="tab-pane active">
          <!-- Magic Auto-Switch Card -->
          <div class="magic-switch-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <h3 style="font-size: 1rem; color: #60a5fa; display: flex; align-items: center; gap: 8px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                1-Click Wireless Magic Switch (USB ➔ Wi-Fi)
              </h3>
              <span style="font-size: 0.72rem; background: rgba(59, 130, 246, 0.2); color: #93c5fd; padding: 2px 8px; border-radius: 999px; border: 1px solid rgba(59, 130, 246, 0.3);">Seamless</span>
            </div>
            <p style="font-size: 0.84rem; color: var(--text-muted); margin-bottom: 14px; line-height: 1.4;">
              Connected via USB? Click below to <strong>automatically detect your phone's Wi-Fi IP</strong>, activate TCP/IP, and seamlessly switch to wireless <strong>the exact moment you unplug the USB cable</strong>!
            </p>
            <button class="btn btn-primary" style="width: 100%; justify-content: center; font-size: 0.92rem; padding: 10px;" onclick="startAutoWireless()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/></svg>
              Auto Switch to Wireless
            </button>
          </div>

          <h3 style="font-size: 0.95rem; margin-bottom: 8px;">Manual Wireless Connection</h3>
          <p style="font-size: 0.82rem; color: var(--text-dim); margin-bottom: 12px;">Connect directly via IP and Port (auto-filled from device diagnostics).</p>
          <div class="form-row">
            <input type="text" id="wifi-ip" class="input-field" placeholder="Phone IP (e.g. 192.168.1.105)">
            <input type="number" id="wifi-port" class="input-field" style="max-width: 100px;" value="5555" placeholder="Port">
            <button class="btn btn-primary" onclick="connectWireless()">Connect</button>
            <button class="btn btn-danger" onclick="disconnectWireless()">Disconnect</button>
          </div>

          <div style="margin: 18px 0; border-top: 1px solid var(--border); padding-top: 14px;">
            <h3 style="font-size: 0.95rem; margin-bottom: 8px;">Android 11+ Wireless Debugging Pairing</h3>
            <p style="font-size: 0.82rem; color: var(--text-dim); margin-bottom: 12px;">Settings &gt; Developer Options &gt; Wireless Debugging &gt; Pair device with pairing code.</p>
            <div class="form-row">
              <input type="text" id="pair-ip" class="input-field" placeholder="Pairing IP">
              <input type="number" id="pair-port" class="input-field" style="max-width: 90px;" placeholder="Pairing Port">
              <input type="text" id="pair-code" class="input-field" style="max-width: 110px;" placeholder="6-digit Code">
              <button class="btn btn-primary" onclick="pairWireless()">Pair Device</button>
            </div>
          </div>
        </div>

        <!-- Tab 2: APK Installer -->
        <div id="tab-apk" class="tab-pane">
          <h3 style="font-size: 0.95rem; margin-bottom: 8px;">Shortcut: Install APK from PC</h3>
          <p style="font-size: 0.82rem; color: var(--text-dim); margin-bottom: 14px;">Specify the full file path on your PC or choose an APK to install directly onto the device.</p>
          <div class="form-row">
            <input type="text" id="apk-path-input" class="input-field" placeholder="C:\\path\\to\\application.apk">
            <button class="btn btn-primary" onclick="installApk()">Install APK</button>
          </div>

          <div style="margin-top: 18px; border-top: 1px solid var(--border); padding-top: 14px;">
            <h3 style="font-size: 0.95rem; margin-bottom: 8px;">Shortcut: Open URL in Mobile Browser</h3>
            <div class="form-row">
              <input type="text" id="browser-url-input" class="input-field" placeholder="https://example.com" value="https://google.com">
              <button class="btn btn-success" onclick="openUrl()">Open on Phone</button>
            </div>
          </div>
        </div>

        <!-- Tab 3: Files & Criss-Cross Storage -->
        <div id="tab-files" class="tab-pane">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div style="font-size: 0.86rem; font-family: 'JetBrains Mono', monospace; color: var(--accent);" id="current-dir-display">/sdcard</div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-sm" onclick="navDirUp()">⬆ Up</button>
              <button class="btn btn-sm" onclick="loadFiles()">↻ Refresh</button>
            </div>
          </div>

          <!-- Criss-cross push / pull bar -->
          <div style="background: var(--bg-secondary); padding: 12px; border-radius: 8px; margin-bottom: 12px; border: 1px solid var(--border);">
            <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-bottom: 8px;">Criss-Cross File Transfer:</div>
            <div class="form-row" style="margin-bottom: 8px;">
              <input type="text" id="push-pc-path" class="input-field" placeholder="PC File Path (e.g. D:\\Downloads\\photo.jpg)">
              <input type="text" id="push-dest-path" class="input-field" placeholder="Android Dest (e.g. /sdcard/Download/)">
              <button class="btn btn-sm btn-primary" onclick="pushFile()">Push to Phone</button>
            </div>
            <div class="form-row" style="margin-bottom: 0;">
              <input type="text" id="pull-src-path" class="input-field" placeholder="Android File Path (e.g. /sdcard/Download/test.pdf)">
              <input type="text" id="pull-pc-path" class="input-field" placeholder="PC Dest (e.g. D:\\Downloads\\test.pdf)">
              <button class="btn btn-sm btn-success" onclick="pullFile()">Pull to PC</button>
            </div>
          </div>

          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Size</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody id="files-table-body">
                <tr><td colspan="4" style="text-align: center; color: var(--text-dim);">Loading storage...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Tab 4: App Manager -->
        <div id="tab-apps" class="tab-pane">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <input type="text" id="app-search-input" class="input-field" style="max-width: 280px;" placeholder="Search installed apps..." oninput="filterApps(this.value)">
            <button class="btn btn-sm" onclick="loadApps()">↻ Refresh Apps</button>
          </div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Package Name</th>
                  <th style="text-align: right;">Shortcuts</th>
                </tr>
              </thead>
              <tbody id="apps-table-body">
                <tr><td colspan="2" style="text-align: center; color: var(--text-dim);">Loading applications...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Tab 5: Shell Console -->
        <div id="tab-shell" class="tab-pane">
          <div class="terminal-box" id="terminal-output">// AWMS Shell Ready. Type any command below (e.g. 'pm list packages', 'dumpsys battery', 'ls /sdcard')...&#10;</div>
          <div class="form-row">
            <input type="text" id="shell-cmd-input" class="input-field" placeholder="Enter adb shell command..." onkeydown="if(event.key==='Enter') executeShellCommand()">
            <button class="btn btn-primary" onclick="executeShellCommand()">Execute</button>
            <button class="btn" onclick="document.getElementById('terminal-output').innerText=''">Clear</button>
          </div>
        </div>

        <!-- Tab 6: AI / MCP Setup -->
        <div id="tab-mcp" class="tab-pane">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <h3 style="font-size: 0.95rem; margin: 0; color: #fff;">Connect with AI Assistants (Antigravity, Claude Desktop, Cursor, Cline)</h3>
            <span style="font-size: 0.72rem; padding: 2px 8px; border-radius: 4px; background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.4);">AWMS by LogicSpine v0.1.1</span>
          </div>
          <p style="font-size: 0.82rem; color: var(--text-dim); margin-bottom: 12px;">
            AWMS exposes a high-speed Model Context Protocol (MCP) server directly over HTTP/SSE. Connect strictly via URL without requiring local path commands:
          </p>

          <!-- Offline / Trouble Notice -->
          <div id="mcp-trouble-alert" style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 10px 14px; margin-bottom: 14px;">
            <div style="font-size: 0.82rem; font-weight: 600; color: #f87171; display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              MCP URL Not Reachable or Connection Refused?
            </div>
            <div style="font-size: 0.78rem; color: #cbd5e1; line-height: 1.5;">
              Ensure the AWMS background daemon is running! If closed, double-click <b>awms.0.1.1.exe</b> (or run <code>awms.bat</code>). It is completely portable, has ADB built-in, runs on any PC with zero configuration, and serves the MCP endpoint at <code>http://127.0.0.1:7171/sse</code>.
            </div>
          </div>

          <!-- Step 1: Endpoint & Config -->
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
            <input type="text" id="mcp-sse-url" value="http://127.0.0.1:7171/sse" readonly style="flex: 1; background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; padding: 7px 12px; font-family: monospace; font-size: 0.85rem; color: #60a5fa;" />
            <button class="btn btn-primary" onclick="copyMcpUrl()">Copy URL</button>
          </div>

          <div class="code-box" style="margin-bottom: 16px;">
            <button class="btn btn-sm copy-badge" onclick="copyMcpSnippet()">Copy JSON</button>
            <pre id="mcp-config-snippet">{\n  "mcpServers": {\n    "awms": {\n      "url": "http://127.0.0.1:7171/sse"\n    }\n  }\n}</pre>
          </div>

          <!-- Step 2: AI Starter Prompt (Copy & Send) -->
          <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(59, 130, 246, 0.35); border-radius: 8px; padding: 12px 14px; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 0.85rem; font-weight: 600; color: #93c5fd; display: flex; align-items: center; gap: 6px;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                📋 AI Starter Instructions (Copy & Send to your AI)
              </span>
              <button class="btn btn-sm btn-primary" onclick="copyStarterPrompt()">Copy Starter Prompt</button>
            </div>
            <p style="font-size: 0.76rem; color: var(--text-dim); margin-bottom: 8px;">
              Paste this prompt into your first message to any AI assistant so it operates with maximum speed and zero hallucinations:
            </p>
            <pre id="ai-starter-prompt" style="background: #0b0f17; border: 1px solid var(--border); border-radius: 6px; padding: 10px; font-family: monospace; font-size: 0.76rem; color: #cbd5e1; max-height: 180px; overflow-y: auto; white-space: pre-wrap; line-height: 1.5;">You are connected to an Android device via AWMS MCP Server (http://127.0.0.1:7171/sse) developed by LogicSpine.

CRITICAL OPERATIONAL RULES:
1. TO SEE & NAVIGATE: Use 'inspect_screen()' to retrieve all interactive buttons, text inputs, and exact coordinates [x, y]. DO NOT call 'take_screenshot' for navigation (it wastes tokens and is slower).
2. TO FIND ELEMENTS: Use 'search_element({ query: "keyword", scroll: true })' to find buttons, songs, or text with typo/phonetic tolerance (e.g. "prynsh" matches "Pryanshu") and automatic speed-swipes.
3. TO CLICK: Use 'smart_tap({ query: "ButtonName" })' or 'tap(x, y)' using coordinates from inspect_screen.
4. TO TYPE: Use 'smart_type({ text: "...", field_query: "Search", press_enter: true })'.
5. TIME-SYNCHRONIZED EXECUTION & ANIMATION OBSERVATION:
   Every action tool accepts an optional 'execute_at_timestamp' (Unix epoch in ms). Call 'get_server_time()' to get the baseline clock. To capture transient animations (button ripples, sliding bottom-sheets), emit 'smart_tap(..., execute_at_timestamp: T)' and 'take_screenshot(execute_at_timestamp: T + 350)' in the SAME turn!
6. SUPERPOWERS:
   - unlock_device({ pin? }) - wakes screen and unlocks lockscreen
   - get_device_state() - full battery %, ringer, wifi, storage, foreground app
   - read_latest_otp() - extracts 4-8 digit OTP from incoming notifications
   - auto_dismiss_dialog({ action: "allow" }) - dismisses permission popups
   - adjust_slider({ query, percentage }) - seekbars and volume
   - pinch_zoom({ direction: "in"|"out" }) - maps and browser zoom
   - get_app_performance({ package_name }) - live CPU %, RAM MB, and FPS/jank

Developed by LogicSpine. Attribution required when sharing or modifying.</pre>
          </div>

          <!-- Superpowers Reference -->
          <div style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.6; margin-bottom: 14px;">
            <strong>Built-In Superpowers (Zero Root Required):</strong><br>
            • <b>Autonomous Navigation:</b> <code>search_element(query, scroll)</code>, <code>smart_tap(query)</code>, <code>smart_type(text)</code>, <code>dismiss_keyboard()</code><br>
            • <b>Time Synchronization:</b> <code>get_server_time()</code>, <code>execute_at_timestamp</code> on all 37 action tools for zero-latency animation capture<br>
            • <b>Device State & Metrics:</b> <code>get_device_state()</code>, <code>get_app_performance()</code> (RAM MB + CPU % + Jank %)<br>
            • <b>Security & Input:</b> <code>unlock_device(pin)</code>, <code>read_latest_otp()</code>, <code>auto_dismiss_dialog()</code>, <code>adjust_slider()</code>, <code>pinch_zoom()</code>
          </div>

          <!-- LogicSpine Copyright & Attribution Policy -->
          <div style="padding-top: 12px; border-top: 1px solid var(--border); font-size: 0.76rem; color: var(--text-dim); display: flex; align-items: center; justify-content: space-between; flex-wrap: gap;">
            <div>
              <span style="color: #60a5fa; font-weight: 600;">AWMS by LogicSpine</span> • Free to use and modify.<br>
              Creator Attribution Policy: You must retain credit to <b>LogicSpine</b> in all forks, distributions, and derivative works.
            </div>
            <div style="font-family: monospace; color: #94a3b8;">
              awms.0.1.1.exe (Portable)
            </div>
          </div>
        </div>

      </div>
    </div>
  </main>

  <!-- Wireless Switch Modal -->
  <div id="wireless-modal" class="modal-backdrop" style="display: none;">
    <div class="modal-card">
      <!-- State 1: Configuring -->
      <div id="modal-spinner-state" class="modal-body-state">
        <div style="margin-bottom: 16px;">
          <svg class="spin-anim" width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        </div>
        <h3 style="font-size: 1.15rem; color: #fff;">Detecting Wi-Fi & Configuring...</h3>
        <p style="font-size: 0.86rem; color: var(--text-dim); margin-top: 6px;">Fetching phone's IP address and activating TCP/IP mode</p>
      </div>

      <!-- State 2: Ready to Unplug Cable -->
      <div id="modal-unplug-state" class="modal-body-state" style="display: none;">
        <div class="unplug-animation-container">
          <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="#10b981" stroke-width="2.5">
            <path d="M12 2v8M18 6l-6 6-6-6M5 14h14v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-4z"/>
          </svg>
        </div>
        <h2 style="font-size: 1.25rem; margin-top: 16px; color: #fff; font-weight: 700;">Now You Can Remove The Data Cable!</h2>
        <p style="font-size: 0.88rem; color: var(--text-muted); margin-top: 8px;">
          Detected Phone IP: <strong id="modal-detected-ip" style="color: #60a5fa; font-family: monospace; font-size: 0.95rem;">-</strong>
        </p>
        <p style="font-size: 0.82rem; color: var(--text-dim); margin-top: 6px;">
          As soon as you unplug the USB cable, AWMS will seamlessly connect over Wi-Fi!
        </p>
        <div style="margin-top: 18px; display: inline-flex; align-items: center; gap: 8px; font-size: 0.82rem; color: var(--accent-green); background: rgba(16, 185, 129, 0.1); padding: 6px 14px; border-radius: 999px; border: 1px solid rgba(16, 185, 129, 0.25);">
          <span class="pulsing-dot"></span> Waiting for cable disconnection...
        </div>
      </div>

      <!-- State 3: Connected Successfully -->
      <div id="modal-success-state" class="modal-body-state" style="display: none;">
        <div style="width: 72px; height: 72px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); border: 2px solid #10b981; display: flex; align-items: center; justify-content: center; margin: 0 auto;">
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
        <h2 style="font-size: 1.25rem; margin-top: 16px; color: #10b981;">Cable Disconnected!</h2>
        <p style="font-size: 0.88rem; color: var(--text-main); margin-top: 8px;" id="modal-success-msg">Connected wirelessly over Wi-Fi!</p>
      </div>

      <div style="margin-top: 24px; display: flex; justify-content: center;">
        <button class="btn btn-sm" id="modal-cancel-btn" onclick="cancelAutoWireless()">Cancel</button>
      </div>
    </div>
  </div>

  <div id="toast">Action performed</div>

  <script>
    let currentSerial = null;
    let currentDir = '/sdcard';
    let allApps = [];
    let ws = null;
    let canvas = document.getElementById('screen-canvas');
    let ctx = canvas.getContext('2d');
    let screenViewport = document.getElementById('screen-viewport');
    let screenLoader = document.getElementById('screen-loader');

    // Display Toast
    function showToast(msg) {
      const t = document.getElementById('toast');
      t.innerText = msg;
      t.style.display = 'block';
      setTimeout(() => { t.style.display = 'none'; }, 3000);
    }

    // Tabs
    function openTab(tabId) {
      document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
      document.getElementById(tabId).classList.add('active');
      event.currentTarget.classList.add('active');
    }

    // Fetch Devices
    async function fetchDevices() {
      try {
        const res = await fetch('/api/devices');
        const data = await res.json();
        const select = document.getElementById('device-select');
        select.innerHTML = '';

        if (!data.devices || data.devices.length === 0) {
          select.innerHTML = '<option value="">No devices connected (Plug in USB or connect Wi-Fi)</option>';
          currentSerial = null;
          updateDiagnostics(null);
          return;
        }

        data.devices.forEach(d => {
          const opt = document.createElement('option');
          opt.value = d.serial;
          opt.innerText = (d.model ? d.model + ' (' + d.serial + ')' : d.serial) + (d.isWireless ? ' [Wi-Fi]' : ' [USB]');
          if (d.serial === data.selected) opt.selected = true;
          select.appendChild(opt);
        });

        currentSerial = data.selected || data.devices[0].serial;
        onDeviceSelected(currentSerial);
      } catch (err) {
        console.error('Failed to fetch devices:', err);
      }
    }

    async function onDeviceSelected(serial) {
      if (!serial) return;
      currentSerial = serial;
      try {
        await fetch('/api/select-device', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serial })
        });
        loadDeviceInfo();
        connectScreenStream();
        fetch('/api/wifi-ip').then(r => r.json()).then(d => {
          if (d.ip) document.getElementById('wifi-ip').value = d.ip;
        }).catch(() => {});
      } catch (err) {
        console.error(err);
      }
    }

    // Load Device Diagnostics
    async function loadDeviceInfo() {
      if (!currentSerial) return;
      try {
        const res = await fetch('/api/info');
        const info = await res.json();
        updateDiagnostics(info);
      } catch (err) {
        console.error('Info error:', err);
      }
    }

    function updateDiagnostics(info) {
      if (!info) {
        document.getElementById('diag-model').innerText = '-';
        document.getElementById('diag-os').innerText = '-';
        document.getElementById('diag-battery').innerText = '-';
        document.getElementById('diag-res').innerText = '-';
        document.getElementById('diag-ip').innerText = '-';
        return;
      }
      document.getElementById('diag-model').innerText = info.manufacturer + ' ' + info.model;
      document.getElementById('diag-os').innerText = 'Android ' + info.androidVersion + ' (SDK ' + info.sdkVersion + ')';
      document.getElementById('diag-battery').innerText = info.batteryLevel + '% (' + info.batteryStatus + ')';
      document.getElementById('diag-res').innerText = info.resolution ? (info.resolution.width + 'x' + info.resolution.height) : '-';
      document.getElementById('diag-ip').innerText = info.ipAddress || 'Wi-Fi not assigned';
      if (info.ipAddress) {
        document.getElementById('wifi-ip').value = info.ipAddress;
      }
    }

    // Screen Mirroring Stream
    let isDrawing = false;
    let startX = 0, startY = 0;
    let realWidth = 1080, realHeight = 2400;

    let jmuxer = null;
    let videoEl = document.getElementById('screen-video');

    function initJMuxer() {
      if (typeof JMuxer === 'undefined') {
        console.warn('JMuxer library not loaded yet');
        return;
      }
      if (jmuxer) {
        try { jmuxer.destroy(); } catch {}
      }
      jmuxer = new JMuxer({
        node: 'screen-video',
        mode: 'video',
        flushingTime: 0,
        fps: 30,
        debug: false,
        clearBuffer: true,
        onError: (err) => {
          // silently handle stream frames
        }
      });
    }

    // Stream Quality Management
    let currentPreset = localStorage.getItem('awms_quality_preset') || 'balanced';
    let streamWidthSetting = parseInt(localStorage.getItem('awms_stream_width') || '720', 10);
    let streamBitRateSetting = parseInt(localStorage.getItem('awms_stream_bitrate') || '4000000', 10);

    function updateStreamBadge(width, bitRate) {
      const mbps = (bitRate / 1000000).toFixed(1);
      const resLabel = width >= 1080 ? '1080p' : (width >= 720 ? '720p' : width + 'p');
      const badge = document.getElementById('stream-stat-badge');
      if (badge) badge.innerText = 'Stream: ' + resLabel + ' @ ' + mbps + ' Mbps • 60 FPS (H.264)';
    }

    function applyQualitySettings(width, bitRate, presetName) {
      streamWidthSetting = width;
      streamBitRateSetting = bitRate;
      localStorage.setItem('awms_stream_width', width.toString());
      localStorage.setItem('awms_stream_bitrate', bitRate.toString());

      if (presetName) {
        currentPreset = presetName;
        localStorage.setItem('awms_quality_preset', presetName);
      }

      // Update button active state
      document.querySelectorAll('.quality-btn').forEach(btn => btn.classList.remove('active'));
      const activeBtn = document.getElementById('btn-q-' + (presetName || currentPreset));
      if (activeBtn) activeBtn.classList.add('active');

      updateStreamBadge(width, bitRate);
      initJMuxer();

      // Send to server over WebSocket
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          action: 'set_quality',
          width: streamWidthSetting,
          bitRate: streamBitRateSetting
        }));
        const resLabel = width >= 1080 ? '1080p (HD)' : (width >= 720 ? '720p (Balanced)' : width + 'p');
        showToast('Switched quality to ' + resLabel + ' (' + (bitRate / 1000000).toFixed(1) + ' Mbps)');
      }
    }

    function setQualityPreset(preset) {
      document.getElementById('custom-quality-panel').style.display = 'none';
      if (preset === 'fast') {
        applyQualitySettings(480, 1500000, 'fast');
      } else if (preset === 'balanced') {
        applyQualitySettings(720, 4000000, 'balanced');
      } else if (preset === 'ultra') {
        applyQualitySettings(1080, 8000000, 'ultra');
      }
    }

    function toggleCustomQuality() {
      const panel = document.getElementById('custom-quality-panel');
      const isHidden = panel.style.display === 'none';
      panel.style.display = isHidden ? 'block' : 'none';
      document.querySelectorAll('.quality-btn').forEach(btn => btn.classList.remove('active'));
      if (isHidden) {
        document.getElementById('btn-q-custom').classList.add('active');
        document.getElementById('slider-res').value = streamWidthSetting;
        document.getElementById('slider-bitrate').value = (streamBitRateSetting / 1000000).toString();
        onCustomSliderChange();
      }
    }

    function onCustomSliderChange() {
      const res = document.getElementById('slider-res').value;
      const bitrate = document.getElementById('slider-bitrate').value;
      document.getElementById('label-res-val').innerText = res + 'p';
      document.getElementById('label-bitrate-val').innerText = bitrate + ' Mbps';
    }

    function applyCustomQuality() {
      const res = parseInt(document.getElementById('slider-res').value, 10);
      const bitrate = parseFloat(document.getElementById('slider-bitrate').value) * 1000000;
      applyQualitySettings(res, bitrate, 'custom');
      document.getElementById('custom-quality-panel').style.display = 'none';
    }

    function connectScreenStream() {
      if (ws) {
        try { ws.close(); } catch {}
      }

      initJMuxer();

      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(protocol + '//' + location.host + '/stream?serial=' + encodeURIComponent(currentSerial || ''));
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        screenLoader.style.display = 'none';
        // Send initial saved quality preference if not default 720p
        if (streamWidthSetting !== 720 || streamBitRateSetting !== 4000000) {
          ws.send(JSON.stringify({
            action: 'set_quality',
            width: streamWidthSetting,
            bitRate: streamBitRateSetting
          }));
        }
      };

      ws.onmessage = async (evt) => {
        if (typeof evt.data === 'string') {
          try {
            const msg = JSON.parse(evt.data);
            if (msg.type === 'resolution') {
              realWidth = msg.width;
              realHeight = msg.height;
              if (msg.streamWidth && msg.bitRate) {
                updateStreamBadge(msg.streamWidth, msg.bitRate);
              }
            } else if (msg.type === 'quality_update') {
              updateStreamBadge(msg.streamWidth, msg.bitRate);
            }
          } catch {}
          return;
        }

        screenLoader.style.display = 'none';

        // Feed H.264 data into JMuxer for 30-60 FPS low-latency playback
        if (jmuxer) {
          const bytes = new Uint8Array(evt.data);
          jmuxer.feed({ video: bytes });
        }
      };

      ws.onerror = (e) => {
        screenLoader.style.display = 'flex';
      };

      ws.onclose = () => {
        setTimeout(connectScreenStream, 3000);
      };
    }

    // Touch & Swipe Event forwarder on Video
    function getVideoCoords(evt) {
      const rect = videoEl.getBoundingClientRect();
      const videoAspect = realWidth / realHeight;
      const elementAspect = rect.width / rect.height;

      let actualWidth = rect.width;
      let actualHeight = rect.height;
      let offsetX = 0;
      let offsetY = 0;

      if (elementAspect > videoAspect) {
        actualWidth = rect.height * videoAspect;
        offsetX = (rect.width - actualWidth) / 2;
      } else {
        actualHeight = rect.width / videoAspect;
        offsetY = (rect.height - actualHeight) / 2;
      }

      const clickX = evt.clientX - rect.left - offsetX;
      const clickY = evt.clientY - rect.top - offsetY;

      const scaleX = realWidth / actualWidth;
      const scaleY = realHeight / actualHeight;

      const x = Math.min(Math.max(0, Math.round(clickX * scaleX)), realWidth);
      const y = Math.min(Math.max(0, Math.round(clickY * scaleY)), realHeight);

      return { x, y };
    }

    videoEl.addEventListener('mousedown', (e) => {
      const coords = getVideoCoords(e);
      startX = coords.x;
      startY = coords.y;
      isDrawing = true;
    });

    videoEl.addEventListener('mouseup', async (e) => {
      if (!isDrawing) return;
      isDrawing = false;
      const coords = getVideoCoords(e);
      const dist = Math.hypot(coords.x - startX, coords.y - startY);

      if (dist < 15) {
        // Tap
        fetch('/api/tap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ x: coords.x, y: coords.y })
        });
      } else {
        // Swipe
        fetch('/api/swipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ x1: startX, y1: startY, x2: coords.x, y2: coords.y, duration: 300 })
        });
      }
    });

    // Send Key
    async function sendKey(key) {
      await fetch('/api/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      });
      showToast('Key ' + key + ' sent');
    }

    // Send Input Text
    async function sendInputText() {
      const input = document.getElementById('type-input');
      const text = input.value;
      if (!text) return;
      await fetch('/api/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      input.value = '';
      showToast('Text sent to phone');
    }

    // Download Screenshot
    async function downloadScreenshot() {
      showToast('Capturing high-res screenshot...');
      try {
        const res = await fetch('/api/screenshot');
        const blob = await res.blob();
        const link = document.createElement('a');
        link.download = 'android-screenshot-' + Date.now() + '.png';
        link.href = URL.createObjectURL(blob);
        link.click();
        showToast('Screenshot downloaded');
      } catch (err) {
        showToast('Failed to download screenshot');
      }
    }

    // Wireless ADB Actions & Magic Switch
    let autoWirelessAborted = false;

    async function startAutoWireless() {
      if (!currentSerial) {
        return alert('Please connect your phone via USB first!');
      }
      if (currentSerial.includes(':')) {
        return alert('Device is already connected wirelessly (' + currentSerial + ')!');
      }

      autoWirelessAborted = false;
      const modal = document.getElementById('wireless-modal');
      const spinnerState = document.getElementById('modal-spinner-state');
      const unplugState = document.getElementById('modal-unplug-state');
      const successState = document.getElementById('modal-success-state');
      const cancelBtn = document.getElementById('modal-cancel-btn');

      modal.style.display = 'flex';
      spinnerState.style.display = 'block';
      unplugState.style.display = 'none';
      successState.style.display = 'none';
      cancelBtn.style.display = 'inline-block';

      try {
        // Step 1: Tell backend to enable tcpip & get Wi-Fi IP
        const res = await fetch('/api/auto-wireless/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serial: currentSerial, port: 5555 })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        if (autoWirelessAborted) return;

        // Auto-fill IP in UI and modal
        document.getElementById('wifi-ip').value = data.ip;
        document.getElementById('modal-detected-ip').innerText = data.ip + ':' + data.port;

        // Step 2: Show the UNPLUG prompt
        spinnerState.style.display = 'none';
        unplugState.style.display = 'block';

        // Step 3: Listen for USB disconnect
        const waitRes = await fetch('/api/auto-wireless/wait-disconnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usbSerial: data.usbSerial, ip: data.ip, port: data.port })
        });
        const waitData = await waitRes.json();

        if (autoWirelessAborted) return;

        // Step 4: Show Success!
        unplugState.style.display = 'none';
        successState.style.display = 'block';
        cancelBtn.style.display = 'none';
        document.getElementById('modal-success-msg').innerText = waitData.message || ('Connected wirelessly to ' + data.ip + ':' + data.port);

        setTimeout(async () => {
          modal.style.display = 'none';
          await fetchDevices();
          showToast('Wireless connection active!');
        }, 1800);

      } catch (err) {
        modal.style.display = 'none';
        alert('Auto Wireless Error: ' + err.message);
      }
    }

    function cancelAutoWireless() {
      autoWirelessAborted = true;
      document.getElementById('wireless-modal').style.display = 'none';
    }

    async function connectWireless() {
      let ip = document.getElementById('wifi-ip').value.trim();
      const port = parseInt(document.getElementById('wifi-port').value || '5555', 10);

      // If USB device is connected and user clicks connect without typing IP, run auto wireless!
      if (!ip && currentSerial && !currentSerial.includes(':')) {
        return startAutoWireless();
      }

      if (!ip) return alert('Enter phone IP address or connect phone via USB to auto-detect IP');
      showToast('Connecting to ' + ip + ':' + port + '...');
      const res = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, port })
      });
      const data = await res.json();
      showToast(data.result || data.error);
      fetchDevices();
    }

    async function disconnectWireless() {
      const ip = document.getElementById('wifi-ip').value.trim();
      const port = parseInt(document.getElementById('wifi-port').value || '5555', 10);
      const res = await fetch('/api/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, port })
      });
      const data = await res.json();
      showToast(data.result);
      fetchDevices();
    }

    async function enableTcpip() {
      showToast('Enabling wireless TCP/IP port 5555...');
      const res = await fetch('/api/tcpip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: 5555 })
      });
      const data = await res.json();
      alert('Result: ' + data.result + '\\n\\nYou can now unplug USB and connect using your phone IP!');
      loadDeviceInfo();
    }

    async function pairWireless() {
      const ip = document.getElementById('pair-ip').value.trim();
      const port = parseInt(document.getElementById('pair-port').value, 10);
      const code = document.getElementById('pair-code').value.trim();
      if (!ip || !port || !code) return alert('Fill in IP, port and pairing code');
      showToast('Pairing device...');
      const res = await fetch('/api/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, port, code })
      });
      const data = await res.json();
      alert(data.result || data.error);
      fetchDevices();
    }

    // APK & Browser
    async function installApk() {
      const path = document.getElementById('apk-path-input').value.trim();
      if (!path) return alert('Enter APK file path on PC');
      showToast('Installing APK, please wait...');
      const res = await fetch('/api/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apkPath: path })
      });
      const data = await res.json();
      alert(data.result || data.error);
      loadApps();
    }

    async function openUrl() {
      const url = document.getElementById('browser-url-input').value.trim();
      if (!url) return alert('Enter URL');
      await fetch('/api/open-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      showToast('Opened ' + url + ' on phone');
    }

    // Files (Criss-Cross)
    async function loadFiles(dir = currentDir) {
      currentDir = dir;
      document.getElementById('current-dir-display').innerText = currentDir;
      const tbody = document.getElementById('files-table-body');
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Loading...</td></tr>';

      try {
        const res = await fetch('/api/files?path=' + encodeURIComponent(dir));
        const data = await res.json();
        tbody.innerHTML = '';

        if (!data.files || data.files.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-dim);">Directory is empty</td></tr>';
          return;
        }

        data.files.forEach(f => {
          const tr = document.createElement('tr');
          const icon = f.isDirectory ? '📁' : '📄';
          const sizeStr = f.isDirectory ? '-' : (f.size > 1024 * 1024 ? (f.size / (1024 * 1024)).toFixed(1) + ' MB' : Math.round(f.size / 1024) + ' KB');

          tr.innerHTML = \`
            <td>
              <div class="file-name-cell" onclick="\${f.isDirectory ? \`loadFiles('\${f.path}')\` : \`selectFileForPull('\${f.path}')\`}">
                <span>\${icon}</span>
                <span>\${f.name}</span>
              </div>
            </td>
            <td>\${sizeStr}</td>
            <td style="color: var(--text-dim);">\${f.date}</td>
            <td>
              <button class="btn btn-sm btn-danger" onclick="deleteRemoteFile('\${f.path}')">Delete</button>
            </td>
          \`;
          tbody.appendChild(tr);
        });
      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="4" style="color: red; text-align: center;">Failed to load files</td></tr>';
      }
    }

    function navDirUp() {
      if (currentDir === '/' || currentDir === '/sdcard') return;
      const parts = currentDir.split('/').filter(Boolean);
      parts.pop();
      const parent = '/' + parts.join('/');
      loadFiles(parent || '/sdcard');
    }

    function selectFileForPull(remotePath) {
      document.getElementById('pull-src-path').value = remotePath;
      showToast('Selected ' + remotePath + ' for pull');
    }

    async function pushFile() {
      const pcPath = document.getElementById('push-pc-path').value.trim();
      const destPath = document.getElementById('push-dest-path').value.trim() || currentDir;
      if (!pcPath) return alert('Enter local PC file path');
      showToast('Pushing file to Android storage...');
      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pcPath, devicePath: destPath })
      });
      const data = await res.json();
      alert(data.result || data.error);
      loadFiles(currentDir);
    }

    async function pullFile() {
      const devicePath = document.getElementById('pull-src-path').value.trim();
      const pcPath = document.getElementById('pull-pc-path').value.trim();
      if (!devicePath || !pcPath) return alert('Enter both device source path and destination PC path');
      showToast('Pulling file to PC storage...');
      const res = await fetch('/api/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devicePath, pcPath })
      });
      const data = await res.json();
      alert(data.result || data.error);
    }

    async function deleteRemoteFile(path) {
      if (!confirm('Are you sure you want to delete:\\n' + path)) return;
      const res = await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devicePath: path })
      });
      const data = await res.json();
      showToast(data.result || data.error);
      loadFiles(currentDir);
    }

    // Apps Management
    async function loadApps() {
      const tbody = document.getElementById('apps-table-body');
      tbody.innerHTML = '<tr><td colspan="2" style="text-align: center;">Loading apps...</td></tr>';
      try {
        const res = await fetch('/api/apps?filter=third_party');
        const data = await res.json();
        allApps = data.apps || [];
        renderApps(allApps);
      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="2" style="color: red; text-align: center;">Failed to load apps</td></tr>';
      }
    }

    function renderApps(list) {
      const tbody = document.getElementById('apps-table-body');
      tbody.innerHTML = '';
      if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; color: var(--text-dim);">No apps found</td></tr>';
        return;
      }

      list.forEach(pkg => {
        const tr = document.createElement('tr');
        tr.innerHTML = \`
          <td style="font-family: 'JetBrains Mono', monospace; font-size: 0.8rem;">\${pkg}</td>
          <td style="text-align: right; white-space: nowrap;">
            <button class="btn btn-sm btn-success" onclick="launchApp('\${pkg}')">Launch</button>
            <button class="btn btn-sm" onclick="stopApp('\${pkg}')">Stop</button>
            <button class="btn btn-sm btn-danger" onclick="uninstallApp('\${pkg}')">Uninstall</button>
          </td>
        \`;
        tbody.appendChild(tr);
      });
    }

    function filterApps(q) {
      const query = q.toLowerCase();
      renderApps(allApps.filter(p => p.toLowerCase().includes(query)));
    }

    async function launchApp(pkg) {
      await fetch('/api/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageName: pkg })
      });
      showToast('Launched ' + pkg);
    }

    async function stopApp(pkg) {
      await fetch('/api/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageName: pkg })
      });
      showToast('Stopped ' + pkg);
    }

    async function uninstallApp(pkg) {
      if (!confirm('Are you sure you want to uninstall ' + pkg + '?')) return;
      const res = await fetch('/api/uninstall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageName: pkg })
      });
      const data = await res.json();
      alert(data.result || data.error);
      loadApps();
    }

    // Shell
    async function executeShellCommand() {
      const input = document.getElementById('shell-cmd-input');
      const cmd = input.value.trim();
      if (!cmd) return;
      const term = document.getElementById('terminal-output');
      term.innerText += '\\n$ ' + cmd + '\\n';

      const res = await fetch('/api/shell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd })
      });
      const data = await res.json();
      term.innerText += (data.output || data.error || '(no output)') + '\\n';
      term.scrollTop = term.scrollHeight;
      input.value = '';
    }

    // Copy MCP URL
    function copyMcpUrl() {
      const url = document.getElementById('mcp-sse-url').value;
      navigator.clipboard.writeText(url);
      showToast('Copied MCP URL: ' + url);
    }

    // Copy MCP JSON
    function copyMcpSnippet() {
      const text = document.getElementById('mcp-config-snippet').innerText;
      navigator.clipboard.writeText(text);
      showToast('Copied MCP configuration JSON!');
    }

    // Copy AI Starter Prompt
    function copyStarterPrompt() {
      const promptEl = document.getElementById('ai-starter-prompt');
      if (promptEl) {
        navigator.clipboard.writeText(promptEl.innerText);
        showToast('Copied AI Starter Prompt to clipboard!');
      }
    }

    // Initialize
    window.onload = () => {
      document.querySelectorAll('.quality-btn').forEach(btn => btn.classList.remove('active'));
      const activeBtn = document.getElementById('btn-q-' + currentPreset);
      if (activeBtn) activeBtn.classList.add('active');
      updateStreamBadge(streamWidthSetting, streamBitRateSetting);

      fetchDevices();
    };
  </script>
</body>
</html>
`;

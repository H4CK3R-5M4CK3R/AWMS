# AWMS by [LogicSpine](https://logicspine.in) — Android Web Management Service (v0.1.1)

**AWMS** is an autonomous Android device management engine and **Model Context Protocol (MCP)** server running on static port `7171`, created by [**LogicSpine**](https://logicspine.in).

It provides:
1. **Interactive Web Dashboard** (`http://127.0.0.1:7171`): Hardware-accelerated H.264 screen mirroring (30–60 FPS), touch/drag control, quality presets, 1-click wireless USB-to-Wi-Fi magic switch, APK installer, criss-cross file explorer, app manager, and terminal console.
2. **Strict URL-based MCP Server** (`http://127.0.0.1:7171/sse`): Comprehensive autonomous control tools for AI assistants (Antigravity, Cursor, Claude Desktop, Cline) with **semantic UI tree navigation**, live background logcat recording, app cache/data clearing, network socket inspection, compound action-inspect tools, and time-synchronized execution.
3. **Portable Standalone Executable** (`awms.0.1.1.exe`): A single zero-dependency Windows executable with built-in ADB engine that runs portably on any Windows PC without requiring Node.js or Android SDK installation.

---

## ⚡ Quick Start

### Option A: Portable Windows Executable
Double-click `awms.0.1.1.exe` in the application root directory. It runs out of the box with portable ADB included.

### Option B: Batch / Node.js
Double-click `awms.bat` in this folder, or run:
```bash
npm start
```

* Starts the service on static port `7171`.
* Opens the Web Dashboard directly in your default browser.
* Exposes the MCP SSE endpoint at **`http://127.0.0.1:7171/sse`**.

---

## 🤖 AI / MCP Setup (Strict URL-Based)

Paste this configuration directly into your AI assistant settings (Claude Desktop, Cursor, Antigravity, Cline):

```json
{
  "mcpServers": {
    "awms": {
      "url": "http://127.0.0.1:7171/sse"
    }
  }
}
```

*No local file paths or command args required. Simply connect via the HTTP/SSE URL.*

---

## 🧠 Semantic UI Inspection (Fast Navigation Without Screenshots)

> [!TIP]
> **The Golden Rule for AI Agents:**
> AI agents do **NOT** need to take screenshots to navigate apps or tap buttons.
>
> 1. Call **`inspect_screen`**: Returns the active app package, resolution, and a clean list of all interactive buttons, inputs, switches, and sliders with their exact center coordinates `[x, y]` and pixel `bounds`.
> 2. Call **`tap_element({ text: "Login" })`** or **`tap(x, y)`**: Hits the exact center with 100% mathematical precision.
> 3. **`take_screenshot`** is reserved strictly for visual verification (e.g., verifying UI layout responsiveness across screen sizes, checking colors/styling, viewing photos, or canvas games).

---

## 🛠️ Complete MCP Tool Catalog (53 Tools)

### 1. Screen Vision & Semantic UI Inspection
| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| **`inspect_screen`** | *(none)* | **Primary AI tool**: Returns active app, resolution, and all interactive buttons, inputs, and widgets with exact center coordinates `[x, y]` and pixel `bounds`. |
| **`tap_element`** | `text`, `element_id`, `resource_id` | Taps a button or widget directly by visible label or ID without needing coordinates. |
| **`take_screenshot`** | *(none)* | Captures visual PNG image. Use *only* when visual styling, responsiveness, or canvas graphics require validation. |
| **`get_ui_tree`** | *(none)* | Dumps complete Android UI hierarchy XML (`uiautomator dump`). |
| **`get_interactive_elements`** | *(none)* | Returns parsed JSON list of all clickable buttons, inputs, and links on screen. |

### 2. Fast Compound Multi-Actions
| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| **`tap_and_inspect`** | `x`, `y`, `delay_ms`, `include_screenshot` | Taps at (x, y), waits, and returns updated UI elements in a single tool call. |
| **`swipe_and_inspect`** | `x1`, `y1`, `x2`, `y2`, `duration_ms`, `delay_ms` | Swipes and returns updated UI elements. |
| **`type_and_inspect`** | `text`, `press_enter`, `delay_ms` | Types text into focused input and returns updated UI elements. |
| **`launch_and_inspect`** | `package_name`, `delay_ms` | Launches an app and returns its UI elements plus recent startup logs. |
| **`open_url_and_inspect`** | `url`, `delay_ms` | Opens URL in mobile browser and returns page UI elements. |

### 3. Touch, Gestures & Hardware Input
| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| `tap` | `x`, `y` | Tap coordinate on screen. |
| `double_tap` | `x`, `y`, `interval_ms` | Double tap in rapid succession. |
| `long_press` | `x`, `y`, `duration_ms` | Long press (touch and hold). |
| `swipe` | `x1`, `y1`, `x2`, `y2`, `duration_ms` | Swipe gesture between two points. |
| `drag_and_drop` | `x1`, `y1`, `x2`, `y2`, `duration_ms` | Drag from source and drop at target. |
| `type_text` | `text` | Types text into the currently focused input field. |
| `press_key` | `key` | Simulates hardware key (`BACK`, `HOME`, `RECENTS`, `POWER`, `ENTER`, `VOLUME_UP`, etc.). |

### 4. Deep Logcat & Live Log Recording
| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| **`get_logs`** | `lines`, `package_name`, `tag`, `level`, `filter` | Reads logcat with filters for app package, tag, or minimum level (`V`, `D`, `I`, `W`, `E`, `F`). |
| **`start_log_recording`** | `package_name`, `tag`, `filter`, `max_lines` | Starts background live logcat recorder into memory buffer before performing actions. |
| **`stop_log_recording`** | *(none)* | Stops background recording and returns all captured logcat output. |
| **`get_recorded_logs`** | `clear_after_read` | Reads current captured log buffer without stopping active recording. |
| `clear_logs` | *(none)* | Clears Android logcat buffer. |

### 5. App Management & Data Reset
| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| **`clear_app_data`** | `package_name` | Clears app cache and data (`pm clear <package>`), resetting it to fresh install. |
| `install_apk` | `apk_path` | Installs an APK from host PC (`pm install -r -g`). |
| `uninstall_app` | `package_name` | Uninstalls an application. |
| `launch_app` | `package_name` | Launches an app. |
| `stop_app` | `package_name` | Force-stops an application. |
| `list_apps` | `filter` (`third_party`, `system`, `all`) | Lists installed packages. |
| `search_apps` | `query`, `filter` | Searches installed apps by keyword. |
| `get_app_info` | `package_name` | Deep package info: version name/code, target SDK, permissions, install dates. |

### 6. Criss-Cross Storage & File Management
| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| **`read_file_text`** | `device_path`, `max_lines` | Reads text file content directly from Android storage into conversation. |
| **`write_file_text`** | `device_path`, `content`, `append` | Writes text content directly to a file on Android storage. |
| `push_file` | `pc_path`, `device_path` | Copies file/directory from PC to phone. |
| `pull_file` | `device_path`, `pc_path` | Copies file/directory from phone to PC. |
| `delete_file` | `device_path` | Deletes file or directory on phone (`rm -rf`). |
| `list_files` | `device_path` | Lists directory contents with permissions, size, date. |

### 7. Network Inspection & Control
| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| **`get_network_connections`** | `limit` | Lists active TCP/UDP sockets with local and remote IP:port and connection state. |
| **`get_network_state`** | *(none)* | Wi-Fi IP, SSID, airplane mode, and interface data counters from `/proc/net/dev`. |
| **`toggle_network`** | `type` (`wifi`, `mobile_data`, `airplane`), `enabled` | Enables or disables network connections. |

### 8. System Settings & Clipboard
| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| `get_system_setting` | `namespace` (`system`, `secure`, `global`), `key` | Reads Android system setting. |
| `put_system_setting` | `namespace`, `key`, `value` | Modifies Android system setting. |
| `get_clipboard` | *(none)* | Reads text from Android clipboard. |
| `set_clipboard` | `text` | Sets text into Android clipboard. |

### 10. Agent Superpowers & System Health
| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| **`unlock_device`** | `pin?` | Wakes the screen, dismisses the lockscreen swipe gesture, and inputs PIN digits if provided. |
| **`get_device_state`** | *(none)* | Comprehensive real-time device health snapshot: battery %, temperature, screen lock/orientation, audio/ringer, Wi-Fi IP, foreground app, and disk storage. |
| **`get_notifications`**| `limit?` | Reads active system and app notifications (titles and message bodies). |
| **`read_latest_otp`**  | *(none)* | Scans incoming notifications for 4–8 digit verification/2FA codes and extracts the OTP. |
| **`auto_dismiss_dialog`** | `action?` | Automatically detects and accepts or dismisses runtime permission prompts (*"Allow"*, *"While using the app"*, *"OK"*, *"Not now"*). |
| **`adjust_slider`**    | `query`, `percentage` | Taps SeekBars or volume/brightness sliders at exact percentages (0–100%). |
| **`pinch_zoom`**       | `direction`, `percent?` | Multi-touch gesture (`in` to zoom in / enlarge, `out` to zoom out / shrink) around any screen center. |
| **`get_app_performance`** | `package_name?` | Real-time CPU % utilization, RAM breakdown (Total PSS, Native Heap, Dalvik Heap in MB), and rendering metrics (total frames, janky frames, jank %). |

### 11. ⏱️ Time-Synchronized Execution & Animation Capture
| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| **`get_server_time`** | *(none)* | Returns the baseline server epoch timestamp in milliseconds (`server_time_ms`) and ISO format. |
| **`execute_at_timestamp`** | *All 37 action tools* | Optional epoch millisecond parameter. Use to schedule actions with sub-millisecond precision or emit action + screenshot in a single turn (e.g. action at `T`, screenshot at `T+350ms`) to eliminate LLM token generation latency. |

### 12. Device Discovery & Shell
| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| `get_devices` | *(none)* | Lists connected devices (USB and Wireless). |
| `select_device` | `serial` | Selects target device for multi-device setups. |
| `connect_wireless` | `ip`, `port` | Connects to Android over Wi-Fi. |
| `auto_switch_wireless`| `port` | 1-click magic switch from USB to Wireless ADB. |
| `open_url` | `url` | Opens URL in mobile browser. |
| `shell` | `command` | Executes arbitrary ADB shell command with root/shell privileges. |
| `get_device_info` | *(none)* | Complete hardware specs, battery %, density, IP. |

---

## 📂 Project Structure

```
d:/LogicSpine/Awms/
├── awms.bat              # One-click Windows starter (Dashboard + MCP)
├── awms-mcp.bat          # Background MCP server daemon (Port 7171)
├── AI_INSTRUCTIONS.md    # Instructions and protocol guide for AI assistants
├── package.json          # TypeScript project configuration
├── src/
│   ├── adb.ts            # High-performance ADB engine & UI tree parser
│   ├── dashboard-html.ts # Embedded dark-mode web dashboard
│   ├── mcp-server.ts     # 53 MCP tools + AI prompts
│   ├── web-server.ts     # HTTP, WebSocket & SSE Server (Port 7171)
│   └── index.ts          # CLI entry point & URL banner
└── dist/                 # Compiled JavaScript
```

---

## ⚖️ Creator Attribution & License

Developed by [**LogicSpine**](https://logicspine.in).

This software is free to use, modify, and distribute.
**Attribution Requirement**: You must retain creator credit to [**LogicSpine**](https://logicspine.in) in all copies, forks, distributions, and derivative works. See the `LICENSE` file for full terms.

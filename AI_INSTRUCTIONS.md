# AWMS AI Agent Control Guide

This guide defines the optimal protocols for AI assistants (Cursor, Claude Desktop, Antigravity, Cline) interacting with an Android device via the **AWMS MCP Server** (`http://127.0.0.1:7171/sse`).

---

## ⚡ The Golden Rule: Semantic UI over Vision

> [!IMPORTANT]
> **DO NOT call `take_screenshot` for discovering buttons, finding input fields, or routine app navigation.**
> 
> Instead, call **`inspect_screen`** or **`tap_element`**.
> - **10x Faster**: Bypasses image encoding, transmission, and vision LLM parsing.
> - **95% Token Savings**: Costs ~300 text tokens instead of thousands of image tokens.
> - **Pixel-Perfect Accuracy**: Uses mathematically calculated widget center coordinates directly from the OS Accessibility Tree (`AccessibilityNodeInfo`). Zero click hallucinations.

### When should you use `take_screenshot`?
Only call `take_screenshot` when you strictly need visual validation:
1. Verifying visual responsiveness, multi-screen layouts, or CSS/XML alignment.
2. Checking color contrast, typography aesthetics, or branding fidelity.
3. Inspecting photographs, QR codes, or visual camera previews.
4. Interacting with 3D canvas/games (Unity, Unreal, OpenGL) where individual accessibility nodes are not rendered.
5. When the user explicitly requests to "see" a preview image of the screen.

---

## 🚀 Core Tool Cheat Sheet

### 1. Seeing the Screen & Navigating
- **`search_element({ query: "keyword", scroll: true, max_swipes: 3 })`**: **PRIMARY SEARCH & INSPECT TOOL FOR AI**. Intelligently searches for any button, contact, song, or text element with ranking, phonetic & typo tolerance (e.g. "prynsh" matches "Pryanshu"). Returns strictly the **Top 1** best match with exact center coordinates `[x, y]`, confidence, and element type. If `scroll: true`, automatically executes speed-swipes with intelligent end-of-scroll bottom detection.
- **`smart_tap({ query: "Button or Title" })`**: **PRIMARY CLICK TOOL FOR AI**. Automatically detects and dismisses the soft keyboard if open, scores visible elements, filters out-of-screen bounds, prioritizes clickable content rows over input boxes, and taps the exact mathematical center `(cx, cy)` in < 300ms.
- **`inspect_screen()`**: Full screen inspection. Returns foreground app/activity, screen resolution, and all interactive buttons, text inputs, sliders, and switches with their exact `center` `[x, y]` coordinates. Instantly falls back to 50ms dumpsys view hierarchy if uiautomator is non-idle.
- **`tap_element({ text: "Login" })`**: Taps an element directly by its visible text label or element ID.
- **`tap(x, y)`**: Taps the exact pixel coordinate (use the `center` property from `inspect_screen`).
- **`double_tap(x, y)`**: Double taps in rapid succession.
- **`long_press(x, y, duration_ms)`**: Performs a touch-and-hold gesture.
- **`swipe(x1, y1, x2, y2)`**: Swipes or scrolls across the screen.
- **`dismiss_keyboard()`**: Automatically checks if the virtual keyboard is open and dismisses it.

### 2. Typing & Form Input
- **`smart_type({ text: "Song Name", field_query: "Search", press_enter: true })`**: Focuses the input field, types text, and presses Enter in one coordinated step.
- **`type_text({ text: "admin@example.com" })`**: Types text into the currently focused input field.
- **`press_key({ key: "ENTER" })`**: Presses Enter/Submit or navigation keys (`BACK`, `HOME`, `RECENTS`, `POWER`, `TAB`, `VOLUME_UP`, `VOLUME_DOWN`).
- **`type_and_inspect({ text: "query", press_enter: true })`**: Types text, hits Enter, and returns the updated screen UI in one single tool call.

### 3. Media & Deep-Linking Shortcuts
- **`play_music({ query: "Ashiquana Chaar Diwaari", app: "spotify" })`**: Directly plays music via native Android media intent and deep-link with zero delay (< 2s total execution time).
- **`search_in_app({ app: "spotify", query: "song title" })`**: Directly opens search results in Spotify, YouTube, Chrome, Play Store, Maps, or Settings in ~150ms without manual navigation.

### 3. Compound Multi-Actions (Fast Path)
- **`tap_and_inspect({ x, y })`**: Taps at (x, y), waits for the animation, and returns the new UI elements in a single round-trip.
- **`swipe_and_inspect({ x1, y1, x2, y2 })`**: Swipes, waits, and returns the new UI elements.
- **`launch_and_inspect({ package_name })`**: Launches an app, waits, and returns the rendered UI elements plus recent startup logcat lines.
- **`open_url_and_inspect({ url })`**: Opens a URL in Chrome/browser and returns the rendered web page UI elements.

*(Note: Compound tools do NOT capture screenshot images by default. To request an image, pass `include_screenshot: true`)*.

### 4. App Management & Data Reset
- **`clear_app_data({ package_name: "com.example.app" })`**: Clears app data and cache (`pm clear`), resetting the application to a fresh install state.
- **`install_apk({ apk_path: "C:/path/app.apk" })`**: Installs an APK from the host PC.
- **`uninstall_app({ package_name })`**: Uninstalls an application.
- **`list_apps({ filter: "third_party" })`**: Lists installed third-party apps.
- **`search_apps({ query: "calc" })`**: Finds installed packages matching a keyword.
- **`get_app_info({ package_name })`**: Returns package version, permissions, target SDK, and install timestamps.

### 5. Logcat & Live Log Recording
- **`get_logs({ lines: 100, package_name: "com.example.app", level: "E" })`**: Reads recent logcat entries filtered by package, tag, or error level.
- **`start_log_recording({ package_name: "com.example.app" })`**: Starts capturing live background logs into an in-memory buffer.
- **`stop_log_recording()`**: Stops background recording and returns all logs captured during the session.
- **`clear_logs()`**: Clears the device logcat buffer.

### 6. Criss-Cross Files & Storage
- **`read_file_text({ device_path: "/sdcard/config.json" })`**: Reads text files from the phone directly into the conversation.
- **`write_file_text({ device_path: "/sdcard/test.txt", content: "hello" })`**: Writes text directly to phone storage.
- **`push_file({ pc_path, device_path })`**: Copies files from PC to phone.
- **`pull_file({ device_path, pc_path })`**: Copies files from phone to PC.
- **`delete_file({ device_path })`**: Deletes files or directories (`rm -rf`).
- **`list_files({ device_path: "/sdcard" })`**: Lists directory contents with permissions and sizes.

### 7. Device Controls, Hardware Toggles & Settings
- **`go_home()`**: Instantly returns the device to the Android home screen.
- **`open_recent_apps()`**: Opens the task switcher / recent apps overview.
- **`open_notifications()`**: Pulls down the Android notification panel.
- **`open_quick_settings()`**: Expands the quick settings toggle drawer.
- **`set_volume({ action: "up" | "down" | "mute" | "unmute" })`**: Controls volume levels.
- **`set_ringer_mode({ mode: "normal" | "vibrate" | "silent" })`**: Toggles phone sound profile.
- **`toggle_auto_rotate({ enabled: true })`**: Enables or locks screen auto-rotation.
- **`toggle_bluetooth({ enabled: true })`**: Enables or disables Bluetooth.
- **`toggle_network({ type: "wifi" | "mobile_data" | "airplane", enabled: true })`**: Toggles Wi-Fi, Mobile Data, or Airplane mode.
- **`get_network_connections()`**: Lists active TCP/UDP sockets, remote IPs, ports, and connection states.
- **`get_network_state()`**: Returns Wi-Fi IP, SSID, airplane mode, and bandwidth transfer statistics.
- **`get_system_setting({ namespace: "system", key: "screen_brightness" })`**: Reads Android system settings.
- **`put_system_setting({ namespace: "system", key: "screen_brightness", value: "150" })`**: Modifies Android settings.
- **`shell({ command: "pm list features" })`**: Runs arbitrary shell commands with root/shell privileges.

### 8. Agent Superpowers: Lockscreen, OTPs, Popups, Sliders & Profiling
- **`unlock_device({ pin?: "1234" })`**: Wakes the screen, swipes up past the lockscreen, and enters optional PIN to unlock the phone.
- **`get_device_state()`**: Full real-time snapshot of battery %, charging state, screen lock status, orientation, foreground app, audio state, available storage, and server clock timestamp.
- **`get_notifications({ limit: 20 })`**: Reads active system and app notifications (titles and message bodies).
- **`read_latest_otp()`**: Automatically scans incoming SMS/app notifications and extracts 4–8 digit verification OTP codes.
- **`auto_dismiss_dialog({ action: "allow" | "deny" })`**: Automatically clicks permission dialogs ("While using the app", "Allow", "OK", "Not now") to keep workflows unblocked.
- **`adjust_slider({ query: "Brightness", percentage: 75 })`**: Taps SeekBar or volume/brightness sliders at exact percentages (0–100%).
- **`pinch_zoom({ direction: "in" | "out", percent: 50 })`**: Performs zoom in/out gestures on maps, photos, and browser views.
- **`get_app_performance({ package_name: "com.example.app" })`**: Measures real-time CPU % utilization, RAM consumption (PSS/Native/Dalvik in MB), and FPS frame rendering/jank stats.
- **`get_server_time()`**: Returns the exact server baseline epoch timestamp in milliseconds (`server_time_ms`), ISO string, and time offset.

### 9. ⏱️ Time-Synchronized Execution & Animation Capture (`execute_at_timestamp`)
All 37 action, gesture, and screen capture tools accept an optional **`execute_at_timestamp`** parameter (Unix epoch in milliseconds, e.g. `1732165805000`).

#### Why Timestamps instead of Relative Delays?
LLMs have variable thinking and token generation latency (often 1–4 seconds per turn). The AI cannot predict how long it will take to generate text. Relative delays (like *"wait 2 seconds"*) expire before the tool call even reaches the server!
By anchoring commands to **absolute epoch timestamps**, execution is mathematically deterministic.

#### How It Works:
1. **Get Current Anchor Time**: Call `get_server_time()` or read `serverTime.serverTimeMs` from `get_device_state()`.
2. **Calculate Target Millisecond**: Add your desired millisecond offset:
   - In 2 seconds: `target = server_time_ms + 2000`
   - In 500 milliseconds: `target = server_time_ms + 500`
3. **Synchronized Action + Screenshot (Single Turn Recipe)**:
   To capture transient UI animations (ripples, bottom-sheet slide-ups, like heart bursts, or loading spinners) without LLM latency jitter, emit **both tools in the same response turn**:
   ```json
   // Tool Call 1: Action fires at target timestamp T
   smart_tap({ "query": "Heart", "execute_at_timestamp": 1732165810000 })

   // Tool Call 2: Screenshot fires at T + 350ms (captures mid-animation transition)
   take_screenshot({ "execute_at_timestamp": 1732165810350 })
   ```
   The AWMS server holds the screenshot until precisely 350ms after the tap lands, capturing the exact visual transition with **zero model round-trip latency**!
4. **Immediate Fallback**: If `execute_at_timestamp` is omitted or in the past, the command executes immediately.

---

## 🛠️ Autonomous Workflow Recipes

### Recipe 1: End-to-End App Testing with Background Logs
```
1. start_log_recording({ package_name: "com.myapp" })
2. launch_and_inspect({ package_name: "com.myapp" })
3. inspect_screen() -> find "Login" button -> tap_element({ text: "Login" })
4. inspect_screen() -> find Email field -> tap(center.x, center.y) -> type_text({ text: "user@test.com" })
5. inspect_screen() -> find "Submit" button -> tap_element({ text: "Submit" })
6. stop_log_recording() -> analyze logs for uncaught exceptions, network failures, or crashes
7. clear_app_data({ package_name: "com.myapp" }) -> restore clean state
```

### Recipe 2: Web Testing in Google Chrome
```
1. open_url_and_inspect({ url: "https://example.com" })
2. inspect_screen() -> read web page buttons & links directly from accessibility tree
3. tap_element({ text: "Sign Up" })
4. inspect_screen() -> verify form appeared
```

### Recipe 3: Visual Responsiveness Verification
```
1. inspect_screen() -> navigate to target page
2. take_screenshot() -> verify layout aesthetics, overflow, and responsiveness visually
```

### Recipe 4: Capturing Animations & Transient States
```
1. time_info = get_server_time()
2. In single turn, issue:
   - smart_tap({ query: "Submit", execute_at_timestamp: time_info.server_time_ms + 1000 })
   - take_screenshot({ execute_at_timestamp: time_info.server_time_ms + 1300 })
3. Receive the transition screenshot capturing the exact 300ms post-click animation state!
```

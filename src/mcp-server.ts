import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { adb } from './adb.js';

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'AWMS by LogicSpine',
    version: '0.1.1'
  });

  const timestampParam = z.number().optional().describe(
    'Optional Unix epoch timestamp in milliseconds (e.g. 1732165805000). Use to schedule execution at an exact millisecond, eliminating LLM token generation latency and enabling synchronized action+screenshot pipelines (e.g. click at T, screenshot at T+300). If omitted or in the past, executes immediately.'
  );

  server.tool(
    'get_server_time',
    'Get the current server epoch timestamp in milliseconds (server_time_ms) and ISO time. ESSENTIAL FOR TIMED EXECUTION: Call this or check get_device_state to obtain the baseline clock, then add millisecond offsets to execute_at_timestamp on subsequent action and screenshot tools to guarantee millisecond-accurate execution regardless of LLM response generation delay.',
    {},
    async () => {
      const timeInfo = adb.getServerTime();
      return {
        content: [{ type: 'text', text: JSON.stringify(timeInfo, null, 2) }]
      };
    }
  );

  // ==========================================
  // 1. DEVICE DISCOVERY & CONNECTION
  // ==========================================

  server.tool(
    'get_devices',
    'List all connected Android devices (both USB and Wireless ADB) and show which one is currently active',
    {},
    async () => {
      try {
        const devices = await adb.listDevices();
        const selected = adb.getSelectedSerial();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  selectedDevice: selected,
                  count: devices.length,
                  devices
                },
                null,
                2
              )
            }
          ]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Error fetching devices: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'select_device',
    'Set the active target Android device serial for subsequent commands',
    {
      serial: z.string().describe('The serial number or IP:port of the device to control')
    },
    async ({ serial }) => {
      adb.setSelectedSerial(serial);
      return {
        content: [{ type: 'text', text: `Active device set to: ${serial}` }]
      };
    }
  );

  server.tool(
    'get_device_info',
    'Get comprehensive Android device specs (Model, Manufacturer, Android Version, SDK, Battery %, Resolution, Density, Wi-Fi IP)',
    {},
    async () => {
      try {
        const info = await adb.getDeviceInfo();
        return {
          content: [{ type: 'text', text: JSON.stringify(info, null, 2) }]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Device info error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'connect_wireless',
    'Connect to an Android device over Wi-Fi via ADB TCP/IP',
    {
      ip: z.string().describe('IP address of the Android device on your local Wi-Fi'),
      port: z.number().default(5555).describe('Port number (default 5555)')
    },
    async ({ ip, port }) => {
      try {
        const result = await adb.connectWireless(ip, port);
        return {
          content: [{ type: 'text', text: `Wireless ADB connection result: ${result}` }]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Failed to connect wirelessly: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'disconnect_wireless',
    'Disconnect a wireless Android device',
    {
      ip: z.string().describe('IP address of the wireless device to disconnect'),
      port: z.number().optional().describe('Port number (optional)')
    },
    async ({ ip, port }) => {
      try {
        const result = await adb.disconnectWireless(ip, port);
        return {
          content: [{ type: 'text', text: `Disconnect result: ${result}` }]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Failed to disconnect: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'pair_wireless',
    'Pair with Android 11+ Wireless Debugging using a 6-digit pairing code',
    {
      ip: z.string().describe('IP address shown in Android Wireless Debugging settings'),
      port: z.number().describe('Pairing port shown in Android Wireless Debugging settings'),
      pairing_code: z.string().describe('6-digit pairing code')
    },
    async ({ ip, port, pairing_code }) => {
      try {
        const result = await adb.pairWireless(ip, port, pairing_code);
        return {
          content: [{ type: 'text', text: `Wireless pairing result: ${result}` }]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Failed to pair wirelessly: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'enable_wireless_mode',
    'Switch a currently USB-connected device to TCP/IP mode so it can be unplugged',
    {
      port: z.number().default(5555).describe('Port to listen on (default 5555)')
    },
    async ({ port }) => {
      try {
        const result = await adb.enableTcpip(port);
        return {
          content: [
            {
              type: 'text',
              text: `Switched device to TCP/IP mode: ${result}. You can now unplug USB and connect via connect_wireless.`
            }
          ]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Failed to switch to TCP/IP mode: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'auto_switch_wireless',
    'Automatically prepare and switch a USB-connected device to Wireless ADB mode (detects Wi-Fi IP and sets up TCP/IP)',
    {
      port: z.number().default(5555).describe('Port to listen on (default 5555)')
    },
    async ({ port }) => {
      try {
        const prep = await adb.prepareAutoWireless(undefined, port);
        return {
          content: [
            {
              type: 'text',
              text: `Wireless ADB prepared! Device IP detected: ${prep.ip}:${prep.port}. Device is listening on TCP/IP. You can unplug USB now.`
            }
          ]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Auto switch wireless error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  // ==========================================
  // 2. VISUALS, UI HIERARCHY & SCREEN INSPECTION
  // ==========================================

  server.tool(
    'inspect_screen',
    'PRIMARY SCREEN INSPECTION TOOL FOR AI: Inspect what is currently visible on the Android screen. Returns current foreground app/activity, display resolution, and a structured list of all interactive buttons, text input fields, switches, sliders, and clickable elements with their exact center coordinates [x, y] and pixel bounds. AI INSTRUCTION: Use this tool as the primary way to "see" and navigate the screen. DO NOT call take_screenshot for navigation or button finding. Only use take_screenshot when you strictly need visual confirmation (e.g. checking responsiveness, UI design/styling, photos, or canvas games).',
    {
      execute_at_timestamp: timestampParam
    },
    async ({ execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        const info = await adb.inspectScreen();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(info, null, 2)
            }
          ]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `inspect_screen error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'tap_element',
    'Tap an element on the current screen by its visible text label, element ID (from inspect_screen), or resourceId. The server finds the element in the live UI hierarchy and automatically taps its center coordinates',
    {
      text: z.string().optional().describe('Visible text or label of the button/element to tap (e.g. "Submit", "Login", "7", "Next")'),
      element_id: z.number().optional().describe('Element ID number from the inspect_screen list'),
      resource_id: z.string().optional().describe('Resource ID of the widget (e.g. "btn_login")'),
      content_desc: z.string().optional().describe('Accessibility content description label'),
      execute_at_timestamp: timestampParam
    },
    async ({ text, element_id, resource_id, content_desc, execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        const result = await adb.tapElement({
          text,
          id: element_id,
          resourceId: resource_id,
          contentDesc: content_desc
        });
        return {
          content: [{ type: 'text', text: result.message }],
          isError: !result.tapped
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `tap_element error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'search_element',
    'PRIMARY SEARCH & LOOKUP TOOL FOR AI: Search for a specific text, button, or UI element on screen with ranking, phonetic & typo tolerance (e.g. "prynsh" matches "Pryanshu"), and optional auto-scroll with bottom-of-list detection. Returns strictly the Top 1 best match with exact tap coordinates [x, y], confidence, and element metadata.',
    {
      query: z.string().describe('The text, label, or keyword to find (e.g. "Pryanshu", "Send", "Settings")'),
      scroll: z.boolean().default(false).describe('If true and element is not currently visible, automatically speed-swipe up to find it'),
      max_swipes: z.number().default(3).describe('Maximum number of speed swipes if scroll is enabled (default 3, max 5)'),
      type: z.enum(['any', 'button', 'input', 'text']).default('any').describe('Filter by element type'),
      execute_at_timestamp: timestampParam
    },
    async ({ query, scroll, max_swipes, type, execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        const result = await adb.searchElement(query, undefined, {
          scroll,
          maxSwipes: Math.min(Math.max(1, max_swipes), 5),
          type
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Search element error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'smart_tap',
    'PRIMARY CLICK TOOL FOR AI: Intelligently find and tap any button, song, search result, tab, or menu item by label, text or keyword. Automatically dismisses on-screen keyboard if open and uses fuzzy & semantic scoring to resolve exact mathematical center coordinates [x, y] with zero hallucination. Prioritizes clickable content rows over input boxes.',
    {
      query: z.string().describe('The text, label, or keyword of the element to tap (e.g. "Alag Aasmaan", "Search", "Play", "Settings")'),
      execute_at_timestamp: timestampParam
    },
    async ({ query, execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        const result = await adb.smartTap(query);
        return {
          content: [{ type: 'text', text: result.message }],
          isError: !result.success
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `smart_tap error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'smart_type',
    'Intelligently focus a target input field by name/placeholder (optional), type text into it, and optionally press Enter. Automatically handles focus resolution and input delivery.',
    {
      text: z.string().describe('Text string to type into the field'),
      field_query: z.string().optional().describe('Label or placeholder of the target input field to focus first (optional)'),
      press_enter: z.boolean().default(false).describe('Whether to press the Enter/Search key after typing'),
      execute_at_timestamp: timestampParam
    },
    async ({ text, field_query, press_enter, execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        const result = await adb.smartType(text, field_query, press_enter);
        return {
          content: [{ type: 'text', text: result.message }],
          isError: !result.success
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `smart_type error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'dismiss_keyboard',
    'Check if the Android on-screen soft keyboard is currently visible and dismiss it immediately (sends BACK key) so it does not obstruct screen elements.',
    {
      execute_at_timestamp: timestampParam
    },
    async ({ execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        const dismissed = await adb.dismissKeyboardIfShown();
        return {
          content: [
            {
              type: 'text',
              text: dismissed ? 'Soft keyboard was visible and has been dismissed.' : 'Soft keyboard was not open.'
            }
          ]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `dismiss_keyboard error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'play_music',
    'Directly search and play a song, track, or artist in Spotify or YouTube. Uses native Android media intents and deep-linking to instantly open search results and tap the song with zero lag.',
    {
      query: z.string().describe('Name of the song, artist, or album to search and play (e.g. "Alag Aasmaan Anuv Jain")'),
      app: z.enum(['spotify', 'youtube', 'auto']).default('spotify').describe('Target music app (default "spotify")'),
      execute_at_timestamp: timestampParam
    },
    async ({ query, app, execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        const result = await adb.playMusic(query, app);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ],
          isError: !result.success
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `play_music error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'search_in_app',
    'Directly open search results in target app (Spotify, YouTube, Chrome, Play Store, Maps, Settings) using native Android deep-link intents. Instant execution (~150ms) that bypasses manual home screens, tab switching, and virtual keyboard input.',
    {
      app: z.enum(['spotify', 'youtube', 'chrome', 'play_store', 'maps', 'settings']).describe('Target app to search in'),
      query: z.string().describe('Search query, keyword, song title, or address'),
      execute_at_timestamp: timestampParam
    },
    async ({ app, query, execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        const result = await adb.searchInApp(app, query);
        return {
          content: [{ type: 'text', text: result.message }]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `search_in_app error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'take_screenshot',
    'Capture the current screen of the Android device and return it as a visual PNG image. IMPORTANT AI INSTRUCTION: For discovering buttons, typing inputs, and navigating apps, always use inspect_screen instead (it is much faster and token-efficient). ONLY call take_screenshot when you specifically need visual validation (e.g. verifying UI layout responsiveness, visual styling/colors, looking at user photos, or canvas games).',
    {
      execute_at_timestamp: timestampParam
    },
    async ({ execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        const buffer = await adb.takeScreenshot();
        const base64 = buffer.toString('base64');
        return {
          content: [
            {
              type: 'image',
              data: base64,
              mimeType: 'image/png'
            },
            {
              type: 'text',
              text: `Screenshot captured successfully (${(buffer.length / 1024).toFixed(1)} KB)`
            }
          ]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Screenshot error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'get_ui_tree',
    'Dump the complete Android UI layout hierarchy (uiautomator XML). Ideal for finding all UI nodes, bounds, text, and IDs',
    {
      execute_at_timestamp: timestampParam
    },
    async ({ execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        const xml = await adb.getUiHierarchy();
        return {
          content: [{ type: 'text', text: xml }]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `UI dump error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'get_interactive_elements',
    'Parse the current screen and return a clean, structured JSON list of all clickable buttons, text inputs, links, and icons with their exact center coordinates (x, y) and bounds [x1, y1, x2, y2]',
    {
      execute_at_timestamp: timestampParam
    },
    async ({ execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        const xml = await adb.getUiHierarchy();
        const elements = adb.parseUiElements(xml);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  count: elements.length,
                  interactiveElements: elements
                },
                null,
                2
              )
            }
          ]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Failed to extract elements: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  // ==========================================
  // 3. COMPOUND MULTI-ACTIONS (FAST-PATH INSPECTIONS)
  // ==========================================

  server.tool(
    'tap_and_inspect',
    'Tap a point (x, y) on screen, wait for the UI to update, and return the updated UI elements and hierarchy. Fast by default (does not capture screenshot image unless include_screenshot=true)',
    {
      x: z.number().describe('Horizontal pixel coordinate to tap'),
      y: z.number().describe('Vertical pixel coordinate to tap'),
      delay_ms: z.number().default(600).describe('Milliseconds to wait after tapping before capturing (default 600ms)'),
      include_screenshot: z.boolean().default(false).describe('Set to true only if you need a visual screenshot image (slower)'),
      execute_at_timestamp: timestampParam
    },
    async ({ x, y, delay_ms, include_screenshot, execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        const result = await adb.tapAndInspect(x, y, delay_ms, include_screenshot);
        const contents: any[] = [];
        if (result.screenshot) {
          contents.push({
            type: 'image',
            data: result.screenshot.toString('base64'),
            mimeType: 'image/png'
          });
        }
        contents.push({
          type: 'text',
          text: JSON.stringify(
            {
              action: `Tapped (${x}, ${y}) with ${delay_ms}ms wait`,
              interactiveElementsCount: result.elements.length,
              interactiveElements: result.elements,
              rawXmlSample: result.xml.slice(0, 800) + '...'
            },
            null,
            2
          )
        });
        return { content: contents };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `tap_and_inspect error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'swipe_and_inspect',
    'Swipe across the screen, wait for animation to complete, and return the updated UI elements. Fast by default (does not capture screenshot unless include_screenshot=true)',
    {
      x1: z.number().describe('Starting horizontal coordinate'),
      y1: z.number().describe('Starting vertical coordinate'),
      x2: z.number().describe('Ending horizontal coordinate'),
      y2: z.number().describe('Ending vertical coordinate'),
      duration_ms: z.number().default(300).describe('Swipe duration in milliseconds (default 300ms)'),
      delay_ms: z.number().default(600).describe('Wait duration after swipe before inspecting (default 600ms)'),
      include_screenshot: z.boolean().default(false).describe('Set to true only if you need a visual screenshot image'),
      execute_at_timestamp: timestampParam
    },
    async ({ x1, y1, x2, y2, duration_ms, delay_ms, include_screenshot, execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        const result = await adb.swipeAndInspect(x1, y1, x2, y2, duration_ms, delay_ms, include_screenshot);
        const contents: any[] = [];
        if (result.screenshot) {
          contents.push({
            type: 'image',
            data: result.screenshot.toString('base64'),
            mimeType: 'image/png'
          });
        }
        contents.push({
          type: 'text',
          text: JSON.stringify(
            {
              action: `Swiped (${x1}, ${y1}) -> (${x2}, ${y2})`,
              interactiveElementsCount: result.elements.length,
              interactiveElements: result.elements
            },
            null,
            2
          )
        });
        return { content: contents };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `swipe_and_inspect error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'type_and_inspect',
    'Type text into the focused input field, optionally press Enter, wait, and return updated UI elements',
    {
      text: z.string().describe('Text string to type into the focused input'),
      press_enter: z.boolean().default(false).describe('Whether to press the Enter/Submit key after typing'),
      delay_ms: z.number().default(600).describe('Wait duration in milliseconds (default 600ms)'),
      include_screenshot: z.boolean().default(false).describe('Set to true only if you need a visual screenshot image'),
      execute_at_timestamp: timestampParam
    },
    async ({ text, press_enter, delay_ms, include_screenshot, execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        const result = await adb.typeAndInspect(text, press_enter, delay_ms, include_screenshot);
        const contents: any[] = [];
        if (result.screenshot) {
          contents.push({
            type: 'image',
            data: result.screenshot.toString('base64'),
            mimeType: 'image/png'
          });
        }
        contents.push({
          type: 'text',
          text: JSON.stringify(
            {
              action: `Typed "${text}" (pressEnter=${press_enter})`,
              interactiveElementsCount: result.elements.length,
              interactiveElements: result.elements
            },
            null,
            2
          )
        });
        return { content: contents };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `type_and_inspect error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'launch_and_inspect',
    'Launch an Android application, wait for it to load, and return UI elements AND recent app startup logs',
    {
      package_name: z.string().describe('Package name to launch (e.g. com.whatsapp, com.android.chrome)'),
      delay_ms: z.number().default(1200).describe('Milliseconds to wait for the app to render (default 1200ms)'),
      include_screenshot: z.boolean().default(false).describe('Set to true only if you need a visual screenshot image'),
      execute_at_timestamp: timestampParam
    },
    async ({ package_name, delay_ms, include_screenshot, execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        const result = await adb.launchAndInspect(package_name, delay_ms, include_screenshot);
        const contents: any[] = [];
        if (result.screenshot) {
          contents.push({
            type: 'image',
            data: result.screenshot.toString('base64'),
            mimeType: 'image/png'
          });
        }
        contents.push({
          type: 'text',
          text: JSON.stringify(
            {
              action: `Launched ${package_name}`,
              interactiveElementsCount: result.elements.length,
              interactiveElements: result.elements,
              startupLogs: result.startupLogs || '(No recent logs detected for package)'
            },
            null,
            2
          )
        });
        return { content: contents };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `launch_and_inspect error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'open_url_and_inspect',
    'Open a URL in the Android mobile browser, wait for the page to load, and return the UI elements and page layout',
    {
      url: z.string().describe('URL to open (e.g. https://google.com)'),
      delay_ms: z.number().default(1500).describe('Milliseconds to wait for browser to load (default 1500ms)'),
      include_screenshot: z.boolean().default(false).describe('Set to true only if you need a visual screenshot image'),
      execute_at_timestamp: timestampParam
    },
    async ({ url, delay_ms, include_screenshot, execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        const result = await adb.openUrlAndInspect(url, delay_ms, include_screenshot);
        const contents: any[] = [];
        if (result.screenshot) {
          contents.push({
            type: 'image',
            data: result.screenshot.toString('base64'),
            mimeType: 'image/png'
          });
        }
        contents.push({
          type: 'text',
          text: JSON.stringify(
            {
              action: `Opened URL "${url}" in mobile browser`,
              interactiveElementsCount: result.elements.length,
              interactiveElements: result.elements
            },
            null,
            2
          )
        });
        return { content: contents };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `open_url_and_inspect error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  // ==========================================
  // 4. TOUCH, GESTURES & HARDWARE INPUT
  // ==========================================

  server.tool(
    'tap',
    'Tap a point (x, y) on the Android screen',
    {
      x: z.number().describe('Horizontal pixel coordinate'),
      y: z.number().describe('Vertical pixel coordinate'),
      execute_at_timestamp: timestampParam
    },
    async ({ x, y, execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        await adb.tap(x, y);
        return {
          content: [{ type: 'text', text: `Tapped screen at (${x}, ${y})` }]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Tap error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'double_tap',
    'Double tap a point (x, y) on the screen in rapid succession',
    {
      x: z.number().describe('Horizontal pixel coordinate'),
      y: z.number().describe('Vertical pixel coordinate'),
      interval_ms: z.number().default(100).describe('Milliseconds between taps (default 100ms)'),
      execute_at_timestamp: timestampParam
    },
    async ({ x, y, interval_ms, execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        await adb.doubleTap(x, y, interval_ms);
        return {
          content: [{ type: 'text', text: `Double tapped screen at (${x}, ${y})` }]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Double tap error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'long_press',
    'Long press (touch and hold) a point (x, y) on screen for a specified duration',
    {
      x: z.number().describe('Horizontal pixel coordinate'),
      y: z.number().describe('Vertical pixel coordinate'),
      duration_ms: z.number().default(1000).describe('Hold duration in milliseconds (default 1000ms)'),
      execute_at_timestamp: timestampParam
    },
    async ({ x, y, duration_ms, execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        await adb.longPress(x, y, duration_ms);
        return {
          content: [{ type: 'text', text: `Long pressed at (${x}, ${y}) for ${duration_ms}ms` }]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Long press error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'swipe',
    'Perform a swipe / scroll gesture between two points on screen',
    {
      x1: z.number().describe('Starting horizontal coordinate'),
      y1: z.number().describe('Starting vertical coordinate'),
      x2: z.number().describe('Ending horizontal coordinate'),
      y2: z.number().describe('Ending vertical coordinate'),
      duration_ms: z.number().default(300).describe('Duration of swipe in milliseconds'),
      execute_at_timestamp: timestampParam
    },
    async ({ x1, y1, x2, y2, duration_ms, execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        await adb.swipe(x1, y1, x2, y2, duration_ms);
        return {
          content: [{ type: 'text', text: `Swiped from (${x1}, ${y1}) to (${x2}, ${y2}) in ${duration_ms}ms` }]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Swipe error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'drag_and_drop',
    'Drag an item from (x1, y1) and drop it at (x2, y2)',
    {
      x1: z.number().describe('Source horizontal coordinate'),
      y1: z.number().describe('Source vertical coordinate'),
      x2: z.number().describe('Target horizontal coordinate'),
      y2: z.number().describe('Target vertical coordinate'),
      duration_ms: z.number().default(800).describe('Drag duration in milliseconds (default 800ms)'),
      execute_at_timestamp: timestampParam
    },
    async ({ x1, y1, x2, y2, duration_ms, execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        await adb.dragAndDrop(x1, y1, x2, y2, duration_ms);
        return {
          content: [{ type: 'text', text: `Dragged from (${x1}, ${y1}) and dropped at (${x2}, ${y2})` }]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Drag and drop error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'type_text',
    'Type text into the currently focused input field on the device',
    {
      text: z.string().describe('The string of text to type'),
      execute_at_timestamp: timestampParam
    },
    async ({ text, execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        await adb.inputText(text);
        return {
          content: [{ type: 'text', text: `Typed text: "${text}"` }]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Type error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'press_key',
    'Simulate a physical key or navigation event (BACK, HOME, RECENTS, POWER, ENTER, VOLUME_UP, VOLUME_DOWN, TAB, ESCAPE)',
    {
      key: z.string().describe('Key name (e.g. BACK, HOME, RECENTS, POWER, ENTER, VOLUME_UP, VOLUME_DOWN)'),
      execute_at_timestamp: timestampParam
    },
    async ({ key, execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        await adb.pressKey(key);
        return {
          content: [{ type: 'text', text: `Pressed key: ${key}` }]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Press key error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  // ==========================================
  // 5. LOGCAT & LIVE LOG RECORDING
  // ==========================================

  server.tool(
    'get_logs',
    'Retrieve recent Android system and application logs (logcat) with powerful filtering options',
    {
      lines: z.number().default(100).describe('Number of recent log lines to retrieve (default 100, e.g. 20, 50, 200)'),
      package_name: z.string().optional().describe('Filter logs specifically for this app package (e.g. com.whatsapp)'),
      tag: z.string().optional().describe('Filter by logcat TAG'),
      level: z.enum(['V', 'D', 'I', 'W', 'E', 'F']).optional().describe('Minimum log level: V (Verbose), D (Debug), I (Info), W (Warn), E (Error), F (Fatal)'),
      filter: z.string().optional().describe('Case-insensitive text substring to search within logs')
    },
    async ({ lines, package_name, tag, level, filter }) => {
      try {
        const logs = await adb.getLogs({ lines, packageName: package_name, tag, level, filter });
        return {
          content: [
            {
              type: 'text',
              text: logs || '(No matching log lines found)'
            }
          ]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Logcat error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clear_logs',
    'Clear the Android logcat buffer on the device',
    {},
    async () => {
      try {
        const result = await adb.clearLogs();
        return {
          content: [{ type: 'text', text: result }]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Clear logs error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'start_log_recording',
    'Start capturing live background logcat logs in memory. Call this before running an app, reproducing a bug, or performing an action to record everything that happens in the background',
    {
      package_name: z.string().optional().describe('Optional app package name to filter captured logs for'),
      tag: z.string().optional().describe('Optional log tag to filter for'),
      filter: z.string().optional().describe('Optional substring search term'),
      max_lines: z.number().default(3000).describe('Maximum buffer lines to retain in memory (default 3000)')
    },
    async ({ package_name, tag, filter, max_lines }) => {
      try {
        const result = adb.startLogRecording({ packageName: package_name, tag, filter, maxLines: max_lines });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Start log recording error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'stop_log_recording',
    'Stop live background log recording and return all captured logs accumulated since start_log_recording was called',
    {},
    async () => {
      try {
        const result = adb.stopLogRecording();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: result.success,
                  totalCapturedLines: result.totalLines,
                  durationSeconds: result.durationSeconds,
                  logs: result.logs || '(No logs captured)'
                },
                null,
                2
              )
            }
          ]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Stop log recording error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'get_recorded_logs',
    'Inspect the current live log recording buffer without stopping the active recording session',
    {
      clear_after_read: z.boolean().default(false).describe('Whether to flush the buffer after reading')
    },
    async ({ clear_after_read }) => {
      try {
        const result = adb.getRecordedLogs(clear_after_read);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  totalCapturedLines: result.totalLines,
                  durationSeconds: result.durationSeconds,
                  logs: result.logs || '(No logs captured yet)'
                },
                null,
                2
              )
            }
          ]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Get recorded logs error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  // ==========================================
  // 6. APP MANAGEMENT (INSTALL, CLEAR DATA, ETC.)
  // ==========================================

  server.tool(
    'install_apk',
    'Install an APK package from local host PC path onto the Android device',
    {
      apk_path: z.string().describe('Absolute or relative path to the .apk file on the host PC')
    },
    async ({ apk_path }) => {
      try {
        const result = await adb.installApk(apk_path);
        return {
          content: [{ type: 'text', text: `APK install result: ${result}` }]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Install APK error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'uninstall_app',
    'Uninstall an application by package name',
    {
      package_name: z.string().describe('The Android package name (e.g. com.example.app)')
    },
    async ({ package_name }) => {
      try {
        const result = await adb.uninstallApp(package_name);
        return {
          content: [{ type: 'text', text: `Uninstall result: ${result}` }]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Uninstall error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clear_app_data',
    'Clear application data and cache (resets app to fresh install state via pm clear)',
    {
      package_name: z.string().describe('The Android package name to clear (e.g. com.android.chrome)')
    },
    async ({ package_name }) => {
      try {
        const result = await adb.clearAppData(package_name);
        return {
          content: [{ type: 'text', text: `Cleared data and cache for ${package_name}: ${result}` }]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Clear app data error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'launch_app',
    'Launch an installed Android application',
    {
      package_name: z.string().describe('The Android package name (e.g. com.android.chrome)'),
      execute_at_timestamp: timestampParam
    },
    async ({ package_name, execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        const result = await adb.launchApp(package_name);
        return {
          content: [{ type: 'text', text: result }]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Launch app error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'stop_app',
    'Force stop a running application',
    {
      package_name: z.string().describe('The Android package name to stop'),
      execute_at_timestamp: timestampParam
    },
    async ({ package_name, execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        await adb.stopApp(package_name);
        return {
          content: [{ type: 'text', text: `Force stopped ${package_name}` }]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Stop app error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'list_apps',
    'List installed Android applications',
    {
      filter: z
        .enum(['third_party', 'system', 'all'])
        .default('third_party')
        .describe('Filter apps (third_party, system, or all)')
    },
    async ({ filter }) => {
      try {
        const apps = await adb.listApps(filter);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  filter,
                  count: apps.length,
                  apps
                },
                null,
                2
              )
            }
          ]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `List apps error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'search_apps',
    'Search installed apps by package name keyword',
    {
      query: z.string().describe('Keyword or substring to search for among installed packages'),
      filter: z.enum(['third_party', 'system', 'all']).default('all').describe('App type filter')
    },
    async ({ query, filter }) => {
      try {
        const matching = await adb.searchApps(query, filter);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  query,
                  filter,
                  count: matching.length,
                  matchingPackages: matching
                },
                null,
                2
              )
            }
          ]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Search apps error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'get_app_info',
    'Get deep package information (versionName, versionCode, targetSdk, permissions, install dates)',
    {
      package_name: z.string().describe('Android package name (e.g. com.whatsapp)')
    },
    async ({ package_name }) => {
      try {
        const info = await adb.getAppInfo(package_name);
        return {
          content: [{ type: 'text', text: JSON.stringify(info, null, 2) }]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Get app info error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  // ==========================================
  // 7. CRISS-CROSS STORAGE & FILE MANAGEMENT
  // ==========================================

  server.tool(
    'push_file',
    'Copy a file or directory from PC storage into the Android device storage',
    {
      pc_path: z.string().describe('Local file path on host PC'),
      device_path: z.string().describe('Destination path on Android device (e.g. /sdcard/Download/test.png)')
    },
    async ({ pc_path, device_path }) => {
      try {
        const result = await adb.pushFile(pc_path, device_path);
        return {
          content: [{ type: 'text', text: `Pushed "${pc_path}" to "${device_path}": ${result}` }]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Push file error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'pull_file',
    'Copy a file or directory from Android device storage onto the PC storage',
    {
      device_path: z.string().describe('Source path on Android device (e.g. /sdcard/Download/document.pdf)'),
      pc_path: z.string().describe('Destination file or folder path on host PC')
    },
    async ({ device_path, pc_path }) => {
      try {
        const result = await adb.pullFile(device_path, pc_path);
        return {
          content: [{ type: 'text', text: `Pulled "${device_path}" to "${pc_path}": ${result}` }]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Pull file error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'delete_file',
    'Delete / remove a file or directory from Android device storage',
    {
      device_path: z.string().describe('Path on Android device to delete (e.g. /sdcard/Download/old.apk)')
    },
    async ({ device_path }) => {
      try {
        const result = await adb.deleteFile(device_path);
        return {
          content: [{ type: 'text', text: `Delete result: ${result}` }]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Delete file error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'list_files',
    'List files and subdirectories on the Android device storage',
    {
      device_path: z.string().default('/sdcard').describe('Directory path on Android (default: /sdcard)')
    },
    async ({ device_path }) => {
      try {
        const files = await adb.listFiles(device_path);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  path: device_path,
                  count: files.length,
                  files
                },
                null,
                2
              )
            }
          ]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `List files error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'read_file_text',
    'Read text content of a file located on the Android device directly into MCP response',
    {
      device_path: z.string().describe('File path on Android (e.g. /sdcard/log.txt or /sdcard/config.json)'),
      max_lines: z.number().default(200).describe('Maximum lines to read (default 200)')
    },
    async ({ device_path, max_lines }) => {
      try {
        const content = await adb.readFileText(device_path, max_lines);
        return {
          content: [{ type: 'text', text: content || '(File is empty)' }]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Read file text error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'write_file_text',
    'Write text content directly to a file on the Android device storage',
    {
      device_path: z.string().describe('Destination file path on Android (e.g. /sdcard/notes.txt)'),
      content: z.string().describe('Text content to write'),
      append: z.boolean().default(false).describe('Whether to append to the file instead of overwriting')
    },
    async ({ device_path, content, append }) => {
      try {
        const result = await adb.writeFileText(device_path, content, append);
        return {
          content: [{ type: 'text', text: result }]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Write file text error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  // ==========================================
  // 8. NETWORK TRAFFIC & INSPECTION
  // ==========================================

  server.tool(
    'get_network_connections',
    'Inspect active network sockets and TCP/UDP connections on the Android device (shows local address, remote address, and connection state)',
    {
      limit: z.number().default(50).describe('Maximum active connections to return (default 50)')
    },
    async ({ limit }) => {
      try {
        const connections = await adb.getNetworkConnections(limit);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  count: connections.length,
                  connections
                },
                null,
                2
              )
            }
          ]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Network connections error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'get_network_state',
    'Inspect Android network state (Wi-Fi connectivity, local IP address, Airplane mode, and network interface packet counters)',
    {},
    async () => {
      try {
        const state = await adb.getNetworkState();
        return {
          content: [{ type: 'text', text: JSON.stringify(state, null, 2) }]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Network state error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'toggle_network',
    'Enable or disable Wi-Fi, Mobile Data, or Airplane mode on the Android device',
    {
      type: z.enum(['wifi', 'mobile_data', 'airplane']).describe('Network feature to toggle'),
      enabled: z.boolean().describe('True to enable, False to disable')
    },
    async ({ type, enabled }) => {
      try {
        const result = await adb.toggleNetwork(type, enabled);
        return {
          content: [{ type: 'text', text: result }]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Toggle network error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'toggle_bluetooth',
    'Enable or disable Bluetooth on the Android device',
    {
      enabled: z.boolean().describe('True to enable Bluetooth, False to disable')
    },
    async ({ enabled }) => {
      try {
        const result = await adb.toggleBluetooth(enabled);
        return { content: [{ type: 'text', text: result }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Toggle Bluetooth error: ${err.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'toggle_auto_rotate',
    'Enable or disable screen auto-rotation on the Android device',
    {
      enabled: z.boolean().describe('True to enable auto-rotation, False to lock orientation')
    },
    async ({ enabled }) => {
      try {
        const result = await adb.toggleAutoRotate(enabled);
        return { content: [{ type: 'text', text: result }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Toggle auto-rotate error: ${err.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'set_ringer_mode',
    'Change device ringer / sound profile (normal, vibrate, or silent)',
    {
      mode: z.enum(['normal', 'vibrate', 'silent']).describe('Ringer sound profile mode')
    },
    async ({ mode }) => {
      try {
        const result = await adb.setRingerMode(mode);
        return { content: [{ type: 'text', text: result }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Set ringer mode error: ${err.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'set_volume',
    'Adjust device volume up, down, or mute/unmute',
    {
      action: z.enum(['up', 'down', 'mute', 'unmute']).describe('Volume adjustment action')
    },
    async ({ action }) => {
      try {
        const result = await adb.setVolume(action);
        return { content: [{ type: 'text', text: result }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Set volume error: ${err.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'go_home',
    'Return to the Android home screen immediately',
    {
      execute_at_timestamp: timestampParam
    },
    async ({ execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        const result = await adb.goHome();
        return { content: [{ type: 'text', text: result }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Go home error: ${err.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'open_recent_apps',
    'Open the Android Recent Apps / multitasking task switcher overview',
    {
      execute_at_timestamp: timestampParam
    },
    async ({ execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        const result = await adb.openRecentApps();
        return { content: [{ type: 'text', text: result }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Open recent apps error: ${err.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'open_notifications',
    'Pull down and expand the Android notification panel',
    {
      execute_at_timestamp: timestampParam
    },
    async ({ execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        const result = await adb.openNotifications();
        return { content: [{ type: 'text', text: result }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Open notifications error: ${err.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'open_quick_settings',
    'Pull down and expand the Android quick settings panel',
    {
      execute_at_timestamp: timestampParam
    },
    async ({ execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        const result = await adb.openQuickSettings();
        return { content: [{ type: 'text', text: result }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Open quick settings error: ${err.message}` }], isError: true };
      }
    }
  );

  // ==========================================
  // 9. SYSTEM SETTINGS & CLIPBOARD
  // ==========================================

  server.tool(
    'get_system_setting',
    'Read an Android system setting value (from system, secure, or global namespace)',
    {
      namespace: z.enum(['system', 'secure', 'global']).default('system').describe('Settings namespace'),
      key: z.string().describe('Setting key name (e.g. screen_brightness, airplane_mode_on, animator_duration_scale)')
    },
    async ({ namespace, key }) => {
      try {
        const value = await adb.getSystemSetting(namespace, key);
        return {
          content: [{ type: 'text', text: `${namespace}/${key} = "${value}"` }]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Get setting error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'put_system_setting',
    'Modify an Android system setting value',
    {
      namespace: z.enum(['system', 'secure', 'global']).default('system').describe('Settings namespace'),
      key: z.string().describe('Setting key name'),
      value: z.string().describe('Value to set')
    },
    async ({ namespace, key, value }) => {
      try {
        const result = await adb.putSystemSetting(namespace, key, value);
        return {
          content: [{ type: 'text', text: result }]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Put setting error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'get_clipboard',
    'Attempt to read text from the Android system clipboard',
    {},
    async () => {
      try {
        const text = await adb.getClipboard();
        return {
          content: [{ type: 'text', text }]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Get clipboard error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'set_clipboard',
    'Set text into the Android clipboard',
    {
      text: z.string().describe('Text to place into the clipboard')
    },
    async ({ text }) => {
      try {
        const result = await adb.setClipboard(text);
        return {
          content: [{ type: 'text', text: result }]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Set clipboard error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  // ==========================================
  // 10. BROWSER & RAW ADB SHELL EXECUTION
  // ==========================================

  server.tool(
    'open_url',
    'Open a website URL directly in the default Android mobile browser',
    {
      url: z.string().describe('Web address to open (e.g. https://google.com)'),
      execute_at_timestamp: timestampParam
    },
    async ({ url, execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        await adb.openUrl(url);
        return {
          content: [{ type: 'text', text: `Opened URL "${url}" in mobile browser` }]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Open URL error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'shell',
    'Execute any raw ADB shell command on the Android device (full root/shell access)',
    {
      command: z.string().describe('The ADB shell command string to execute'),
      execute_at_timestamp: timestampParam
    },
    async ({ command, execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        const output = await adb.shell(command);
        return {
          content: [{ type: 'text', text: output || '(Command completed with no output)' }]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Shell execution error: ${err.message}` }],
          isError: true
        };
      }
    }
  );

  // ==========================================
  // 11. ADVANCED AGENT SUPERPOWERS (NOTIFICATIONS, OTP, UNLOCK, SLIDERS, GESTURES, PROFILING)
  // ==========================================

  server.tool(
    'unlock_device',
    'Wake the screen, swipe up to dismiss lockscreen, and optionally enter device PIN code to unlock the phone',
    {
      pin: z.string().optional().describe('Optional PIN code digits to unlock the device'),
      execute_at_timestamp: timestampParam
    },
    async ({ pin, execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        const result = await adb.unlockDevice(pin);
        return { content: [{ type: 'text', text: result.message }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Unlock error: ${err.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'get_device_state',
    'Get a comprehensive real-time snapshot of the device: battery level & charging, screen on/locked state, orientation, foreground app/activity, ringer/audio state, network status, and storage space',
    {
      execute_at_timestamp: timestampParam
    },
    async ({ execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        const state = await adb.getDeviceState();
        return { content: [{ type: 'text', text: JSON.stringify(state, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Get device state error: ${err.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'get_notifications',
    'Read active status bar and system notifications (includes app package name, title, and message text)',
    {
      limit: z.number().default(20).describe('Maximum number of notifications to return')
    },
    async ({ limit }) => {
      try {
        const notifs = await adb.getNotifications(limit);
        return { content: [{ type: 'text', text: JSON.stringify(notifs, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Get notifications error: ${err.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'read_latest_otp',
    'Extract recent OTP (One-Time Password) or 2FA verification code from incoming SMS or app notifications',
    {},
    async () => {
      try {
        const result = await adb.readLatestOtp();
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Read OTP error: ${err.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'auto_dismiss_dialog',
    'Automatically find and click system permission popups ("Allow", "While using the app", "OK", "Not now", etc.) to prevent AI workflows from getting blocked',
    {
      action: z.enum(['allow', 'deny', 'dismiss']).default('allow').describe('Whether to allow/grant permission or deny/dismiss dialog'),
      execute_at_timestamp: timestampParam
    },
    async ({ action, execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        const result = await adb.autoDismissDialog(action);
        return { content: [{ type: 'text', text: result.message }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Auto dismiss dialog error: ${err.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'adjust_slider',
    'Adjust a SeekBar, volume slider, or brightness bar to an exact percentage (0% to 100%)',
    {
      query: z.string().default('any').describe('Name or label of the slider (or "any" for first slider on screen)'),
      percentage: z.number().min(0).max(100).describe('Target percentage value (0 to 100)'),
      execute_at_timestamp: timestampParam
    },
    async ({ query, percentage, execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        const result = await adb.adjustSlider(query, percentage);
        return { content: [{ type: 'text', text: result.message }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Adjust slider error: ${err.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'pinch_zoom',
    'Perform a zoom gesture (zoom IN / enlarge or zoom OUT / shrink) on maps, photos, browser, or camera',
    {
      direction: z.enum(['in', 'out']).describe('"in" to zoom in / enlarge, "out" to zoom out / shrink'),
      percent: z.number().default(50).describe('Zoom magnitude percentage (default 50%)'),
      execute_at_timestamp: timestampParam
    },
    async ({ direction, percent, execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        const result = await adb.pinchZoom({ direction, percent });
        return { content: [{ type: 'text', text: result.message }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Pinch zoom error: ${err.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'get_app_performance',
    'Inspect real-time CPU % utilization, RAM consumption (PSS/Native/Dalvik in MB), and FPS frame render statistics (total & janky frames) for any app',
    {
      package_name: z.string().optional().describe('Target app package name (defaults to active foreground app)'),
      execute_at_timestamp: timestampParam
    },
    async ({ package_name, execute_at_timestamp }) => {
      try {
        await adb.handleExecutionTimestamp(execute_at_timestamp);
        const perf = await adb.getAppPerformance(package_name);
        return { content: [{ type: 'text', text: JSON.stringify(perf, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Get app performance error: ${err.message}` }], isError: true };
      }
    }
  );

  // ==========================================
  // 12. MCP PROMPTS & AI GUIDELINES
  // ==========================================

  server.prompt(
    'android_control_guide',
    'Best practices and guidelines for autonomous Android operation via AWMS',
    {},
    () => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `You have direct access to control an Android device via AWMS MCP tools.

CRITICAL OPERATIONAL RULES FOR AI AGENTS:
1. TO FIND OR CHECK FOR SPECIFIC BUTTONS, CONTACTS, SONGS, OR TEXT:
   - Call 'search_element({ query: "keyword", scroll: true })'. It returns strictly the Top 1 best match with exact [x, y] coordinates, handles typos/phonetics (e.g. "prynsh" matches "Pryanshu"), and automatically performs speed-swipes with bottom-of-scroll detection.
2. TO SEE THE ENTIRE SCREEN:
   - Call 'inspect_screen()'. It returns the active foreground app, screen resolution, and all interactive buttons, text inputs, and clickable elements.
3. DO NOT use 'take_screenshot' for routine exploration or finding buttons. 'search_element' and 'inspect_screen' are instant, token-light, and mathematically pixel-perfect.
4. USE 'take_screenshot' ONLY when:
   - You need to visually verify UI layout responsiveness across different screen sizes.
   - You need to inspect visual styling, typography, colors, or photos.
   - The user explicitly asks for a screenshot preview.
   - The target app is a 3D canvas or game (e.g., Unity/OpenGL).
5. TO CLICK OR TAP:
   - Call 'smart_tap({ query: "Button or Item Name" })'. It automatically resolves exact coordinates and dismisses keyboard if blocking.
   - Or call 'tap_element({ text: "ButtonName" })' or 'tap(center_x, center_y)'.
   - For fast compound interaction, call 'tap_and_inspect(x, y)' (returns updated UI elements).
6. TO INPUT TEXT:
   - Call 'smart_type({ text: "your text", field_query: "Search", press_enter: true })'.
   - Or tap the target input field's center coordinates and call 'type_text({ text: "your text" })'.
7. TO DISMISS SOFT KEYBOARD:
   - Call 'dismiss_keyboard()' anytime the virtual keyboard covers buttons.
8. APP TESTING & LOGGING:
   - Start live background log capture with 'start_log_recording({ package_name: "com.example.app" })', perform actions, then call 'stop_log_recording()'.
   - Reset app state anytime with 'clear_app_data(package_name)'.
9. TIME-SYNCHRONIZED EXECUTION & ANIMATION CAPTURE:
   - LLMs suffer from variable thinking and token generation latency. To eliminate latency jitter and observe transient UI transitions, popups, or button animations:
   - Check the baseline clock via 'get_server_time()' (or 'get_device_state()').
   - Pass 'execute_at_timestamp' (Unix epoch in ms) to your action and screenshot tools.
   - For example, in a SINGLE turn, call 'smart_tap({ query: "Heart", execute_at_timestamp: T })' and 'take_screenshot({ execute_at_timestamp: T + 350 })'.
   - The server schedules the tap at T, waits precisely 350ms, and captures the animation frame with zero LLM round-trip delay!`
          }
        }
      ]
    })
  );

  return server;
}

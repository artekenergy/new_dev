(() => {
  /////////////////////////
  // 1. WebSocket Manager - Handles raw WebSocket communication
  /////////////////////////
  class WebSocketManager {
    constructor() {
      this.socket = null;
      this.state = "closed";
      this.host = window.location.hostname || "172.16.11.7";
      this.port = "8888";
      this.subscribers = []; // Message subscribers
      this.stateHandlers = [];
      this.watchdog = null;
      this.heartbeat = null;
      this._lastRx = Date.now();
      this.debugEnabled = false;
      // Track AC button states for toggle logic
      this.acButtonStates = new Map(); // signalId -> boolean (active state)
    }

    // Subscribe to raw WebSocket messages
    subscribe(handler) {
      this.subscribers.push(handler);
      return () => {
        this.subscribers = this.subscribers.filter((h) => h !== handler);
      };
    }

    connect() {
      this._updateState("connecting");
      this.socket = new WebSocket(`ws://${this.host}:${this.port}/ws`);

      this.socket.onopen = () => {
        this._updateState("open");
        setTimeout(() => this._sendSubscriptions(), 50);
        this._startWatchdog();
      };

      // Core message reception - follows schema step 1
      this.socket.onmessage = (ev) => {
        this._lastRx = Date.now();
        this._log("Raw WS Message: " + ev.data);

        try {
          // Parse JSON frame and hand to subscribers
          const messageObject = JSON.parse(ev.data);
          this._onMessageReceived(messageObject);
        } catch (error) {
          this._log("Error parsing message: " + error.message);
        }
      };

      this.socket.onclose = () => {
        this._log("Disconnected");
        this._updateState("closed");
      };

      this.socket.onerror = (err) => {
        this._log("Connection error");
        this._handleError(err);
      };
    }

    // Step 1: WebSocket arrives → plain JS object
    _onMessageReceived(messageObject) {
      // Handle heartbeat messages
      if (messageObject.messagetype === 48 && messageObject.messagecmd === 5) {
        this._lastRx = Date.now();
        this.sendPong();
        this._log("Heartbeat received");
        return;
      }

      // Enhanced debug logging for AC button debugging
      if (messageObject.data && messageObject.data.length >= 2) {
        const signalId = messageObject.data[0] | (messageObject.data[1] << 8);
        if (signalId >= 95 && signalId <= 100) {
          console.log(`🔍 AC SIGNAL DETECTED: ID=${signalId}, Type=${messageObject.messagetype}, Cmd=${messageObject.messagecmd}, Data=[${messageObject.data.join(',')}]`);
        }
      }

      // Handle button state updates - support multiple message types
      if (
        (messageObject.messagetype === 16 &&
          (messageObject.messagecmd === 0 || messageObject.messagecmd === 1 || messageObject.messagecmd === 5)) ||
        (messageObject.messagetype === 32 && messageObject.messagecmd === 48)
      ) {
        this._updateButtonStates(messageObject);
      }

      // AC Button Workaround: Since server doesn't send state updates for AC signals (95-100),
      // we'll simulate them based on the command echoes we send
      if (messageObject.messagetype === 17 && messageObject.messagecmd === 1 && messageObject.data && messageObject.data.length >= 3) {
        const signalId = messageObject.data[0] | (messageObject.data[1] << 8);
        const commandState = messageObject.data[2];
        
        // Check if this is an AC signal (95-100)
        if (signalId >= 95 && signalId <= 100) {
          console.log(`🔧 AC WORKAROUND: Simulating state update for Signal ${signalId}, State: ${commandState}`);
          
          // For AC buttons, we use standard radio group behavior
          // When a button is pressed (commandState = 1), it becomes active
          // When a button is released (commandState = 0), we ignore it to maintain radio behavior
          
          let actualState = commandState;
          
          // Only process "on" commands for AC buttons to maintain radio group behavior
          if (commandState === 1) {
            // Update our state tracking
            this.acButtonStates.set(signalId, true);
            
            // Turn off other buttons in the same group
            if (signalId === 95 || signalId === 98 || signalId === 99) {
              // AC mode buttons (95, 98, 99) are one radio group
              [95, 98, 99].forEach(acSignalId => {
                if (acSignalId !== signalId) {
                  this.acButtonStates.set(acSignalId, false);
                  // Send simulated off state for other AC mode buttons
                  const otherAcStateUpdate = {
                    messagetype: 16,
                    messagecmd: 5,
                    data: [acSignalId & 0xff, (acSignalId >> 8) & 0xff, 0],
                    size: 3
                  };
                  this._updateButtonStates(otherAcStateUpdate);
                }
              });
            } else if (signalId === 96 || signalId === 97 || signalId === 100) {
              // Fan control buttons (96, 97, 100) are another radio group
              [96, 97, 100].forEach(fanSignalId => {
                if (fanSignalId !== signalId) {
                  this.acButtonStates.set(fanSignalId, false);
                  // Send simulated off state for other fan buttons
                  const otherFanStateUpdate = {
                    messagetype: 16,
                    messagecmd: 5,
                    data: [fanSignalId & 0xff, (fanSignalId >> 8) & 0xff, 0],
                    size: 3
                  };
                  this._updateButtonStates(otherFanStateUpdate);
                }
              });
            }
            
            // Create a simulated state update message for the pressed button
            const simulatedStateUpdate = {
              messagetype: 16,
              messagecmd: 5,
              data: [signalId & 0xff, (signalId >> 8) & 0xff, 1],
              size: 3
            };
            
            // Process it as if it came from the server
            this._updateButtonStates(simulatedStateUpdate);
          }
          // Ignore commandState = 0 for AC buttons to maintain radio behavior
        }
      }

      // Also check for other potential state update message types
      if (messageObject.messagetype === 17 && messageObject.messagecmd === 1) {
        console.log(
          `🔍 Potential state update - Type 17, Cmd 1:`,
          messageObject
        );

        // Check if this is a command echo for channel 1
        if (messageObject.data && messageObject.data.length >= 3) {
          const commandChannelId =
            messageObject.data[0] | (messageObject.data[1] << 8);
          const commandState = messageObject.data[2];

          if (commandChannelId === 1) {
            console.log(
              `🔍 Channel 1 Command Echo - manually updating button state`
            );
            console.log(
              `   Channel: ${commandChannelId}, State: ${commandState}`
            );

            // Manually update channel 1 button since server doesn't send proper state updates
            const buttons = document.querySelectorAll(
              `[data-signal-id="1"], [data-id="1"]`
            );

            if (buttons.length > 0) {
              console.log(
                `📍 Manually updating ${buttons.length} button(s) for channel 1`
              );

              for (let i = 0; i < buttons.length; i++) {
                const btn = buttons[i];
                console.log(
                  `   Updating button: channel-id=${btn.dataset.channelId}, signal-id=${btn.dataset.signalId}`
                );

                // Handle different button types
                if (btn.classList.contains("toggle-btn")) {
                  btn.classList.toggle("active", commandState === 1);
                }

                if (
                  btn.classList.contains("round-btn") ||
                  btn.classList.contains("btn-round")
                ) {
                  btn.classList.remove(
                    "btn-round--active",
                    "btn-round--inactive"
                  );
                  btn.classList.add(
                    commandState === 1
                      ? "btn-round--active"
                      : "btn-round--inactive"
                  );

                  // Update icon visibility
                  const inactiveIcon = btn.querySelector(".icon.inactive");
                  const activeIcon = btn.querySelector(".icon.active");

                  if (inactiveIcon && activeIcon) {
                    if (commandState === 1) {
                      inactiveIcon.style.display = "none";
                      activeIcon.style.display = "block";
                    } else {
                      inactiveIcon.style.display = "block";
                      activeIcon.style.display = "none";
                    }
                  }
                }
              }
            }
          }
        }
      }

      // Special debugging for channel 1
      if (messageObject.data && messageObject.data.length >= 2) {
        const signalId = messageObject.data[0] | (messageObject.data[1] << 8);
        if (signalId === 1) {
          console.log(`🔍 Channel 1 Message:`, messageObject);
          console.log(
            `   Message Type: ${messageObject.messagetype}, Command: ${messageObject.messagecmd}`
          );
          console.log(`   Data: [${messageObject.data.join(",")}]`);
        }
      }

      // Special debugging for commands sent to channel 1
      if (messageObject.messagetype === 17 && messageObject.messagecmd === 1) {
        const commandChannelId =
          messageObject.data[0] | (messageObject.data[1] << 8);
        if (commandChannelId === 1) {
          console.log(`🔍 Channel 1 Command Echo:`, messageObject);
          console.log(
            `   Command for channel: ${commandChannelId}, State: ${messageObject.data[2]}`
          );
        }
      }

      // Forward to all subscribers (CommunicationHandler will be one of them)
      this.subscribers.forEach((handler) => {
        try {
          handler(messageObject);
        } catch (error) {
          console.error("Subscriber error:", error);
        }
      });
    }

    // Handle button state updates from your original script
    _updateButtonStates(msg) {
      if (msg.data && msg.data.length >= 3) {
        let signalId, serverState;

        // Handle different message formats
        if (
          msg.messagetype === 16 &&
          (msg.messagecmd === 0 || msg.messagecmd === 1)
        ) {
          // Format: [signalId_low, signalId_high, state]
          signalId = msg.data[0] | (msg.data[1] << 8);
          serverState = msg.data[2];
        } else if (msg.messagetype === 16 && msg.messagecmd === 5) {
          // This is the standard state update format - let's check if AC signals come through here
          signalId = msg.data[0] | (msg.data[1] << 8);
          serverState = msg.data[2];
          
          if (signalId >= 95 && signalId <= 100) {
            console.log(`🎯 AC STATE UPDATE FOUND: Signal ${signalId}, State: ${serverState}, Message: Type=${msg.messagetype}, Cmd=${msg.messagecmd}`);
          }
        } else if (msg.messagetype === 32 && msg.messagecmd === 48) {
          // For message type 32, command 48, try a different approach
          // The logs show these messages seem to be acknowledgments with signal ID 0
          // Let's check if the actual channel info is embedded differently

          // Skip if signal ID is 0 (seems to be generic acknowledgment)
          const tempSignalId = msg.data[0] | (msg.data[1] << 8);
          if (tempSignalId === 0) {
            console.log(
              `Skipping message type 32, command 48 with signal ID 0 - appears to be acknowledgment`
            );
            return;
          }

          signalId = tempSignalId;
          serverState = msg.data[2];
        } else {
          return; // Unknown format
        }

        // Debug logging to understand the message format
        console.log(`🔍 Button State Update:`);
        console.log(`   Raw data: [${msg.data.join(",")}]`);
        console.log(
          `   Decoded Signal ID: ${signalId} (bytes: ${msg.data[0]}, ${msg.data[1]})`
        );
        console.log(`   Server State: ${serverState}`);
        console.log(
          `   Message Type: ${msg.messagetype}, Command: ${msg.messagecmd}`
        );

        this._log("Signal ID: " + signalId + ", State: " + serverState);

        // Find and update buttons with matching signal IDs
        const buttons = document.querySelectorAll(
          `[data-signal-id="${signalId}"], [data-id="${signalId}"]`
        );

        // Also find status indicators with matching signal IDs
        const indicators = document.querySelectorAll(
          `.status-indicator[data-signal-id="${signalId}"], .status-indicator[data-id="${signalId}"]`
        );

        if (buttons.length > 0) {
          console.log(
            `📍 Found ${buttons.length} button(s) for ID ${signalId}`
          );

          for (let i = 0; i < buttons.length; i++) {
            const btn = buttons[i];
            console.log(
              `   Updating button: channel-id=${btn.dataset.channelId}, signal-id=${btn.dataset.signalId}`
            );

            // Handle different button types based on your HTML
            if (btn.classList.contains("toggle-btn")) {
              // Special handling for AC buttons (radio group behavior)
              if (signalId >= 95 && signalId <= 100) {
                if (serverState === 1) {
                  // AC Mode buttons (95, 98, 99) work as a radio group
                  if (signalId === 95 || signalId === 98 || signalId === 99) {
                    // Remove active from all OTHER AC mode buttons (not this one)
                    document.querySelectorAll('[data-signal-id="95"], [data-signal-id="98"], [data-signal-id="99"]').forEach(acBtn => {
                      if (acBtn.dataset.signalId !== signalId.toString()) {
                        acBtn.classList.remove("active");
                      }
                    });
                  }
                  // Fan Control buttons (96, 97, 100) work as another radio group
                  else if (signalId === 96 || signalId === 97 || signalId === 100) {
                    // Remove active from all OTHER fan control buttons (not this one)
                    document.querySelectorAll('[data-signal-id="96"], [data-signal-id="97"], [data-signal-id="100"]').forEach(fanBtn => {
                      if (fanBtn.dataset.signalId !== signalId.toString()) {
                        fanBtn.classList.remove("active");
                      }
                    });
                  }
                  // Add active to this button
                  btn.classList.add("active");
                } else {
                  btn.classList.remove("active");
                }
                // Update state tracking for AC buttons
                this.acButtonStates.set(signalId, serverState === 1);
              }
              // Check if this is a grouped button (radio button behavior)
              else if (btn.dataset.group) {
                if (serverState === 1) {
                  // Remove active from all buttons in the same group
                  const allGroupButtons = document.querySelectorAll(`[data-group="${btn.dataset.group}"]`);
                  allGroupButtons.forEach(groupBtn => {
                    groupBtn.classList.remove("active");
                  });
                  // Add active to this button
                  btn.classList.add("active");
                } else {
                  btn.classList.remove("active");
                }
              } else {
                // Standard toggle behavior for non-grouped buttons
                btn.classList.toggle("active", serverState === 1);
              }
            }

            // Handle MultiPlus buttons (radio button behavior)
            if (btn.classList.contains("multiplus-btn")) {
              if (serverState === 1) {
                // Remove active from all multiplus buttons
                document
                  .querySelectorAll(".multiplus-btn")
                  .forEach((otherBtn) => {
                    otherBtn.classList.remove("active");
                  });
                // Add active to this button
                btn.classList.add("active");
              } else {
                btn.classList.remove("active");
              }
            }

            // Handle pill buttons
            if (btn.classList.contains("btn-pill--small")) {
              btn.classList.remove(
                "btn-pill--small--active",
                "btn-pill--small--inactive"
              );
              btn.classList.add(
                serverState === 1
                  ? "btn-pill--small--active"
                  : "btn-pill--small--inactive"
              );
            } else if (btn.classList.contains("btn-pill--medium")) {
              btn.classList.remove(
                "btn-pill--medium--active",
                "btn-pill--medium--inactive"
              );
              btn.classList.add(
                serverState === 1
                  ? "btn-pill--medium--active"
                  : "btn-pill--medium--inactive"
              );
            } else if (btn.classList.contains("btn-pill--long")) {
              btn.classList.remove(
                "btn-pill--long--active",
                "btn-pill--long--inactive"
              );
              btn.classList.add(
                serverState === 1
                  ? "btn-pill--long--active"
                  : "btn-pill--long--inactive"
              );
            } else if (
              btn.classList.contains("btn-round") ||
              btn.classList.contains("round-btn")
            ) {
              // Round buttons use a different visual system with icons
              btn.classList.remove("btn-round--active", "btn-round--inactive");
              btn.classList.add(
                serverState === 1 ? "btn-round--active" : "btn-round--inactive"
              );

              // Also update the icon visibility for round buttons
              const inactiveIcon = btn.querySelector(".icon.inactive");
              const activeIcon = btn.querySelector(".icon.active");

              if (inactiveIcon && activeIcon) {
                if (serverState === 1) {
                  inactiveIcon.style.display = "none";
                  activeIcon.style.display = "block";
                } else {
                  inactiveIcon.style.display = "block";
                  activeIcon.style.display = "none";
                }
              }
            }
          }
        } else {
          console.log(`❌ No buttons found for Signal ID ${signalId}`);
        }

        // Update status indicators
        if (indicators.length > 0) {
          console.log(
            `📍 Found ${indicators.length} status indicator(s) for ID ${signalId}`
          );

          for (let i = 0; i < indicators.length; i++) {
            const indicator = indicators[i];
            console.log(
              `   Updating indicator: signal-id=${indicator.dataset.signalId}`
            );

            // Remove existing state classes
            indicator.classList.remove("active", "inactive");

            // Add appropriate state class
            if (serverState === 1) {
              indicator.classList.add("active");

              // Update text content for text-based indicators
              if (indicator.classList.contains("text")) {
                indicator.textContent = indicator.dataset.activeText || "ON";
              }
            } else {
              indicator.classList.add("inactive");

              // Update text content for text-based indicators
              if (indicator.classList.contains("text")) {
                indicator.textContent = indicator.dataset.inactiveText || "OFF";
              }
            }
          }
        } else {
          console.log(
            `❌ No status indicators found for Signal ID ${signalId}`
          );
        }
      }
    }

    sendJson(obj) {
      if (this.isOpen) {
        try {
          this.socket.send(JSON.stringify(obj));
          this._log(`Tx: ${JSON.stringify(obj)}`);
          return true;
        } catch (error) {
          console.error("Send error:", error);
          this._handleError(error);
          return false;
        }
      }
      return false;
    }

    sendPong() {
      this.sendJson({ messagetype: 128, messagecmd: 0, size: 1, data: [0] });
    }

    get isOpen() {
      return this.socket?.readyState === WebSocket.OPEN;
    }

    _sendSubscriptions() {
      const subscriptions = [
        { messagetype: 0x60, messagecmd: 0x00 }, // MFD
        { messagetype: 0x60, messagecmd: 0x01 }, // N2K
      ];

      subscriptions.forEach((sub) => {
        this.sendJson({ ...sub, size: 2, data: [0, 0] });
      });

      // Send the subscription script from your HTML
      const script = document.getElementById("mfd-channel-subscription");
      if (script) {
        this.socket.send(script.textContent);
        try {
          const parsed = JSON.parse(script.textContent);
          this._log(
            "Sent subscription request for " +
              parsed.data.length / 2 +
              " signals"
          );
        } catch (e) {
          this._log("Error parsing subscription data: " + e.message);
        }
      }
    }

    _updateState(newState, error) {
      this.state = newState;
      this.stateHandlers.forEach((handler) => handler(newState, error));
      if (newState === "open") this._startHeartbeat();
    }

    _startWatchdog() {
      this.watchdog = setInterval(() => {
        if (Date.now() - this._lastRx > 10000) {
          this._log("Watchdog timeout - reconnecting");
          this.reconnect();
        }
      }, 2000);
    }

    _startHeartbeat() {
      this.heartbeat = setInterval(() => {
        if (this.isOpen) {
          this.sendJson({
            messagetype: 48,
            messagecmd: 5,
            size: 0,
            data: [],
          });
        }
      }, 5000);
    }

    reconnect() {
      this.disconnect();
      this.connect();
    }

    disconnect() {
      clearInterval(this.watchdog);
      clearInterval(this.heartbeat);
      if (this.socket) {
        this.socket.close();
        this.socket = null;
      }
      this._updateState("closed");
    }

    onStateChange(handler) {
      this.stateHandlers.push(handler);
      return () => {
        this.stateHandlers = this.stateHandlers.filter((h) => h !== handler);
      };
    }

    _handleError(error) {
      console.error("WebSocket error:", error);
      this._updateState("error", error);
      this.reconnect();
    }

    _log(msg) {
      console.log("[" + new Date().toLocaleTimeString() + "] " + msg);

      if (this.debugEnabled) {
        const logDiv = document.getElementById("wsLog");
        if (logDiv) {
          const entry = document.createElement("div");
          entry.textContent =
            "[" + new Date().toLocaleTimeString() + "] " + msg;
          logDiv.appendChild(entry);
          logDiv.scrollTop = logDiv.scrollHeight;
        }
      }

      // Also use the external log function if available
      if (typeof log === "function") {
        log(msg);
      }
    }
  }

  /////////////////////////
  // 2. Communication Handler - Classifies packets and routes them
  /////////////////////////
  class CommunicationHandler {
    constructor(contentDecoder) {
      this.contentDecoder = contentDecoder;
      this.mfdValueSubscribers = new Map(); // Map<signalId, Callback[]>
      this.nmeaValueSubscribers = new Map();
    }

    // Step 2: CommunicationHandler classifies the packet
    handleMessage(pkt) {
      switch (pkt.messagetype) {
        case 16: // T.mfdStatus
          this._propagateMfdMessage(
            this.contentDecoder.decodeMFDChannelItem(pkt)
          );
          break;
        case 0x52: // NMEA
          this._propagateNmeaMessage(
            this.contentDecoder.decodeNMEAChannelItem(pkt)
          );
          break;
        case 0x20: // Channel Info
          this._propagateMfdMessage(this.contentDecoder.decodeChannelInfo(pkt));
          break;
        default:
          // Handle other message types or ignore
          break;
      }
    }

    // Step 4: CommunicationHandler fans the value out
    _propagateMfdMessage(obj) {
      if (!obj || !obj.signalId) return;
      this._notifyMfdValueSubscribers(obj);
    }

    _propagateNmeaMessage(obj) {
      if (!obj || !obj.signalId) return;
      this._notifyNmeaValueSubscribers(obj);
    }

    _notifyMfdValueSubscribers(obj) {
      const subscribers = this.mfdValueSubscribers.get(obj.signalId) || [];
      subscribers.forEach((callback) => {
        try {
          callback(obj);
        } catch (error) {
          console.error(
            `Error in MFD subscriber for signal ${obj.signalId}:`,
            error
          );
        }
      });
    }

    _notifyNmeaValueSubscribers(obj) {
      const subscribers = this.nmeaValueSubscribers.get(obj.signalId) || [];
      subscribers.forEach((callback) => {
        try {
          callback(obj);
        } catch (error) {
          console.error(
            `Error in NMEA subscriber for signal ${obj.signalId}:`,
            error
          );
        }
      });
    }

    // Widgets register with these methods
    addOnMfdValueReceivedDelegate(signalId, callback) {
      if (!this.mfdValueSubscribers.has(signalId)) {
        this.mfdValueSubscribers.set(signalId, []);
      }
      this.mfdValueSubscribers.get(signalId).push(callback);
    }

    addOnNmeaValueReceivedDelegate(signalId, callback) {
      if (!this.nmeaValueSubscribers.has(signalId)) {
        this.nmeaValueSubscribers.set(signalId, []);
      }
      this.nmeaValueSubscribers.get(signalId).push(callback);
    }
  }

  /////////////////////////
  // Temperature Converter Utility - Handles different temperature unit conversions
  /////////////////////////
  class TemperatureConverter {
    static convertRawKelvinToFahrenheit(rawValue) {
      // Raw Kelvin (1000ths) to Fahrenheit: (value / 1000) * 1.8 - 459.67
      return (rawValue / 1000) * 1.8 - 459.67;
    }

    static convertRawKelvinToCelsius(rawValue) {
      // Raw Kelvin (1000ths) to Celsius: (value / 1000) - 273.15
      return rawValue / 1000 - 273.15;
    }

    static convertRawKelvinToKelvin(rawValue) {
      // Raw Kelvin (1000ths) to Kelvin: value / 1000
      return rawValue / 1000;
    }

    static getTemperatureFormatter(unit = "F") {
      switch (unit.toLowerCase()) {
        case "f":
        case "fahrenheit":
          return {
            conversion: this.convertRawKelvinToFahrenheit,
            unitLabel: "°F",
            format: (value) => `${Math.round(value)}°F`,
          };
        case "c":
        case "celsius":
          return {
            conversion: this.convertRawKelvinToCelsius,
            unitLabel: "°C",
            format: (value) => `${Math.round(value)}°C`,
          };
        case "k":
        case "kelvin":
          return {
            conversion: this.convertRawKelvinToKelvin,
            unitLabel: "K",
            format: (value) => `${Math.round(value)}K`,
          };
        default:
          return {
            conversion: this.convertRawKelvinToFahrenheit,
            unitLabel: "°F",
            format: (value) => `${Math.round(value)}°F`,
          };
      }
    }
  }

  /////////////////////////
  // 3. Content Decoder - Turns bytes → domain objects
  /////////////////////////
  class ContentDecoder {
    constructor() {
      this.signalInfoMap = new Map();

      // Format conversion factors based on dataItemFormatType (not signal ID)
      this.formatConversions = {
        6: (value) => value / 1000, // Amperage
        22: (value) => TemperatureConverter.convertRawKelvinToFahrenheit(value), // Temperature - Raw Kelvin to Fahrenheit
        27: (value) => value / 1000, // Voltage
        14: (value) => value / 1000, // Generic decimal
        23: (value) => value * 3.6,
        24: (value) => value / 1000, // Time format
        default: (value) => value,
      };
    }

    // Step 3: ContentDecoder turns bytes → domain object
    decodeMFDChannelItem(pkt) {
      if (pkt.messagetype !== 16 || !pkt.data || pkt.data.length < 7) {
        return null;
      }

      const id = pkt.data[0] | (pkt.data[1] << 8); // signal ID
      const obj = new DomainSignalObject(); // domain class

      obj.signalId = id;
      obj.type = this._getStatusUpdateType(pkt.messagecmd);
      obj.valueTypeIdentifier = pkt.data[3];
      obj.value = this._getInt32Value(id, pkt.data, 4); // key step
      obj.unavailable = (pkt.data[2] & 0x80) !== 0;
      obj.rawValue = this._getRawInt32(pkt.data, 4);

      return obj;
    }

    decodeNMEAChannelItem(pkt) {
      if (pkt.messagecmd !== 1 || !pkt.data || pkt.data.length < 7) {
        return null;
      }

      const id = pkt.data[0] | (pkt.data[1] << 8);
      const obj = new DomainSignalObject();

      obj.signalId = id;
      obj.type = "nmea";
      obj.valueTypeIdentifier = pkt.data[3] | (pkt.data[4] << 8);
      obj.value = this._getInt32Value(id, pkt.data, 4);
      obj.rawValue = this._getRawInt32(pkt.data, 4);

      return obj;
    }

    decodeChannelInfo(pkt) {
      if (
        pkt.messagetype !== 32 ||
        pkt.messagecmd !== 100 ||
        !pkt.data ||
        pkt.data.length < 7
      ) {
        return null;
      }

      const id = pkt.data[0] | (pkt.data[1] << 8);
      const obj = new DomainSignalObject();

      obj.signalId = id;
      obj.type = "channelInfo";
      obj.value = this._getInt32Value(id, pkt.data, 4);
      obj.rawValue = this._getRawInt32(pkt.data, 4);

      return obj;
    }

    // Apply format conversions based on dataItemFormatType
    _getInt32Value(signalId, bytes, offset) {
      const rawValue = this._getRawInt32(bytes, offset);
      const signalInfo = this.signalInfoMap.get(signalId);
      const formatType = signalInfo?.formatType || 0;

      // Apply the conversion based on format type (not signal ID)
      const converter =
        this.formatConversions[formatType] || this.formatConversions.default;
      const convertedValue = converter(rawValue);

      // Debug output
      console.log(
        `Signal ${signalId}: Raw=${rawValue}, FormatType=${formatType}, Converted=${convertedValue}`
      );

      return convertedValue;
    }

    // Raw value extraction as per schema
    _getRawInt32(bytes, offset) {
      const view = new DataView(new Uint8Array(bytes).buffer);
      return view.getInt32(offset, true); // little-endian
    }

    _getStatusUpdateType(messagecmd) {
      switch (messagecmd) {
        case 5:
          return "statusUpdate";
        case 0:
          return "buttonState";
        case 1:
          return "buttonState";
        default:
          return "unknown";
      }
    }

    // Load signal information for proper decoding
    async loadSignalInfo() {
      try {
        const signalInfo = await fetch("signal-info.json").then((r) =>
          r.json()
        );
        signalInfo.forEach((entry) => {
          this.signalInfoMap.set(entry.signalId, {
            dataType: entry.dataType,
            description: entry.description,
            channelType: entry.channelType,
            formatType: entry.dataItemFormatType, // This is the key field for conversions
            channelSetting: entry.channelSettingType,
          });
        });
        console.log(`Loaded ${signalInfo.length} signal definitions`);
        return signalInfo;
      } catch (e) {
        console.warn("Could not load signal-info.json", e);
        return [];
      }
    }
  }

  /////////////////////////
  // Domain Object - Represents a decoded signal
  /////////////////////////
  class DomainSignalObject {
    constructor() {
      this.signalId = 0;
      this.type = "unknown";
      this.valueTypeIdentifier = 0;
      this.value = 0;
      this.rawValue = 0;
      this.unavailable = false;
      this.timestamp = new Date();
    }
  }

  /////////////////////////
  // 4. Widget System - Receives high-level objects and updates UI
  /////////////////////////
  class ValueDisplayWidget {
    constructor(element, signalId, communicationHandler, formatter = null) {
      this.element = element;
      this.signalId = signalId;
      this.formatter = formatter || this._defaultFormatter;
      this._valueType = 0;
      this._value = 0;

      // Register with communication handler
      communicationHandler.addOnMfdValueReceivedDelegate(signalId, (e) => {
        this.onMfdDataReceived(e);
      });

      communicationHandler.addOnNmeaValueReceivedDelegate(signalId, (e) => {
        this.onMfdDataReceived(e);
      });
    }

    // Step 5: Widget receives the high-level object
    onMfdDataReceived(e) {
      if (
        e.type === "statusUpdate" ||
        e.type === "nmea" ||
        e.type === "channelInfo"
      ) {
        this._valueType = e.valueTypeIdentifier; // 128 → "°C" (for example)
        this._value = e.value; // 58497 (converted value)
      }
      this.refresh(); // triggers redraw
    }

    // Step 6: Widget redraws → DOM update
    refresh() {
      try {
        // Convert value according to valueTypeIdentifier and format
        const formattedValue = this.formatter.format(
          this._value,
          this._valueType
        );

        // Set textContent of span and manage error/N/A badges
        this.element.textContent = formattedValue;

        // Apply CSS classes if formatter provides them
        if (this.formatter.cssClasses) {
          const classes = this.formatter.cssClasses(this._value);
          if (classes) {
            this.element.className = `signal-value ${classes}`;
          }
        }

        // Handle unavailable state
        this.element.classList.toggle(
          "unavailable",
          this._value === null || this._value === undefined
        );

        // Special handling for generator charge icon glow effect (signal ID 44 - power consumption)
        if (this.signalId === 44) {
          const generatorChargeIcon = document.getElementById('generator-charge-icon');
          if (generatorChargeIcon) {
            console.log(`🔌 Generator charge monitoring: Signal 44 value = ${this._value}`);
            
            if (this._value > 0) {
              generatorChargeIcon.classList.add('glowing');
              console.log('✨ Generator charge icon now glowing (positive consumption)');
            } else {
              generatorChargeIcon.classList.remove('glowing');
              console.log('💤 Generator charge icon glow removed (zero/negative consumption)');
            }
          }
        }
      } catch (error) {
        console.error(
          `Error refreshing widget for signal ${this.signalId}:`,
          error
        );
        this.element.textContent = "Error";
      }
    }

    _defaultFormatter = {
      format: (value, typeId) => `${value}`,
      cssClasses: null,
    };
  }

  /////////////////////////
  // 5. Signal Formatters - Handle value display formatting
  /////////////////////////
  class SignalFormatterFactory {
    static createFormatters(signalInfo) {
      const formatters = {
        default: {
          format: (value) => `${value}`,
          cssClasses: null,
        },
      };

      signalInfo.forEach((signal) => {
        if (signal.channelType === 5) {
          // Only monitored values
          const id = signal.signalId;

          switch (signal.dataItemFormatType) {
            case 6: // Amperage
              formatters[id] = {
                format: (value) => `${value.toFixed(1)}A`,
                cssClasses: null,
              };
              break;

            case 14: // Percentage
              formatters[id] = {
                format: (value) => `${Math.round(value)}%`,
                cssClasses: null,
              };
              break;

            case 22: // Temperature
              formatters[id] = {
                format: (value) => `${Math.round(value)}°F`,
                cssClasses: null,
              };
              break;

            case 23: // Time remaining - value already converted to seconds by ContentDecoder
              formatters[id] = {
                format: (value) => {
                  // Check for infinity threshold (19 hours = 68,400 seconds)
                  const totalHours = value / 3600;
                  if (totalHours >= 19) {
                    return "∞"; // Unicode infinity symbol
                  }

                  const days = Math.floor(totalHours / 24);
                  const hours = Math.floor(totalHours % 24);
                  const minutes = Math.floor((value % 3600) / 60);

                  if (days > 0) {
                    return `${days}d ${hours}h`;
                  } else if (hours > 0) {
                    return `${hours}:${minutes.toString().padStart(2, "0")}`;
                  } else {
                    return `${minutes}m`;
                  }
                },
                cssClasses: null,
              };
              break;

            case 24: // Time format (seconds-based) - FIXED: No double conversion
              formatters[id] = {
                format: (value) => {
                  // value is already converted from 0.001 seconds to seconds in ContentDecoder
                  const hours = Math.floor(value / 3600);
                  const remainingSeconds = value % 3600;
                  const minutes = Math.floor(remainingSeconds / 60);

                  // Format as hh:mm (with leading zeros)
                  return `${hours.toString().padStart(2, "0")}:${minutes
                    .toString()
                    .padStart(2, "0")}`;
                },
                cssClasses: null,
              };
              break;

            case 27: // Voltage and others
              formatters[id] = {
                format: (value) => {
                  if (
                    signal.description &&
                    signal.description.includes("voltage")
                  ) {
                    return `${value.toFixed(1)}V`;
                  }
                  return `${value}`;
                },
                cssClasses: null,
              };
              break;

            default:
              formatters[id] = formatters.default;
          }
        }
      });

      return formatters;
    }
  }

  /////////////////////////
  // 6. Device Command System (using proven working commands)
  /////////////////////////

  // Core constants from working app
  const MessageType = {
    mfdStatus: 16,
    mfdControl: 17,
    channelInfo: 32,
    channelCmd: 33,
    systemCmd: 48,
    systemReq: 49,
    systemWrite: 50,
    acknowledgement: 128,
    subscriptionRequest: 96,
  };

  const SystemCommand = {
    wduInfo: 1,
    wduHeartbeat: 5,
  };

  const AcknowledgementCommand = {
    acknowledgementAck: 0,
  };

  const ChannelCommand = {
    toggle: 0,
    momentary: 1,
    dimmerUpdate: 3,
    setpoint: 4,
    statusUpdate: 5,
  };

  const DeviceCommands = {
    // Heartbeat acknowledgment (proven working)
    receivedWduHeartbeatAck: function () {
      return {
        messagetype: MessageType.acknowledgement,
        messagecmd: AcknowledgementCommand.acknowledgementAck,
        size: 1,
        data: [0],
      };
    },

    // Info request (proven working)
    requestWduInfo: function () {
      return {
        messagetype: MessageType.systemReq,
        messagecmd: SystemCommand.wduInfo,
        size: 3,
        data: [0, 0, 0],
      };
    },

    // Momentary commands (proven working)
    momentary: function (channelId, state) {
      return {
        messagetype: MessageType.mfdControl, // Use 17 from MessageType
        messagecmd: ChannelCommand.momentary, // Use 1 from ChannelCommand
        size: 3,
        data: [channelId & 0xff, (channelId >> 8) & 0xff, state ? 1 : 0],
      };
    },

    // Dimmer commands (proven working)
    // Dimmer commands (proven working)
    dimmer: function (channelId, level) {
      const value = Math.max(0, Math.min(1000, level)); // clamp to 0–1000
      const valueLow = value & 0xff;
      const valueHigh = (value >> 8) & 0xff;
      const statusByte = value === 0 ? 1 : 0; // 0 = ON, 1 = OFF — set OFF when level is 0

      return {
        messagetype: MessageType.mfdControl,
        messagecmd: ChannelCommand.dimmerUpdate,
        size: 5,
        data: [
          channelId & 0xff, // byte 0
          (channelId >> 8) & 0xff, // byte 1
          statusByte, // byte 2 (on/off)
          valueLow, // byte 3 (dimmer level low byte)
          valueHigh, // byte 4 (dimmer level high byte)
        ],
      };
    },

    // Toggle command (for compatibility)
    toggle: (channel) => ({
      messagetype: MessageType.mfdControl,
      messagecmd: ChannelCommand.toggle,
      size: 3,
      data: [channel & 0xff, channel >> 8, 0x04],
    }),

    // Force commands
    force: (channel, isOn) => ({
      messagetype: MessageType.mfdControl,
      messagecmd: 4,
      size: 3,
      data: [channel & 0xff, channel >> 8, isOn ? 1 : 0],
    }),

    // AC Limit command
    acLimit: (limit) => ({
      messagetype: MessageType.mfdControl,
      messagecmd: 4,
      size: 3,
      data: [12, 0, limit],
    }),
  };

  /////////////////////////
  // 7. UI Event Handlers (matching your HTML structure)
  /////////////////////////
  class UIEventManager {
    constructor(wsManager) {
      this.wsManager = wsManager;
      this.currentAcLimit = 30;
    }

    setupEventListeners() {
      // Tab navigation (matching your HTML tab structure)
      this._setupTabNavigation();

      // Button controls (toggle, momentary, etc.)
      this._setupButtonControls();

      // Slider controls
      this._setupSliderControls();

      // Modal controls (AC Limit)
      this._setupModalControls();

      // HVAC specific tabs
      this._setupHvacTabs();

      // Lighting specific tabs
      this._setupLightingTabs();

      // Connection controls
      this._setupConnectionControls();

      this._setupMultiPlusControls();
    }

    _setupMultiPlusControls() {
      const multiplusButtons = document.querySelectorAll(".multiplus-btn");

      multiplusButtons.forEach((btn) => {
        const channelId = parseInt(btn.dataset.channelId || btn.dataset.id);
        if (!isNaN(channelId)) {
          btn.addEventListener("click", (e) => {
            e.preventDefault();

            // Send toggle command instead of momentary
            this.wsManager.sendJson(DeviceCommands.toggle(channelId));

            // Note: Don't manually manage active state here - let the server response handle it
            // The _updateButtonStates method will handle the visual state based on server response
          });
        }
      });
    }

    _setupTabNavigation() {
      // Main tab buttons (home, power, hvac, switching, logs)
      document.querySelectorAll(".tab-button").forEach((btn) => {
        btn.addEventListener("click", () => {
          // Remove active from all tabs
          document
            .querySelectorAll(".tab-button")
            .forEach((b) => b.classList.remove("active"));
          document
            .querySelectorAll(".tab-content")
            .forEach((t) => t.classList.remove("active"));

          // Activate clicked tab
          btn.classList.add("active");
          const tabId = btn.getAttribute("data-tab") + "-tab";
          const tabContent = document.getElementById(tabId);
          if (tabContent) {
            tabContent.classList.add("active");
          }
        });
      });
    }

    _setupButtonControls() {
      // ALL buttons use momentary commands (press/release) - the backend handles latching logic
      // EXCLUDE modal buttons from general button handling
      document
        .querySelectorAll(
          ".toggle-btn, .btn-pill--small, .btn-pill--medium, .btn-pill--long, .btn-round, .round-btn, .control-btn"
        )
        .forEach((btn) => {
          // Skip buttons that are inside modals
          if (btn.closest(".modal-overlay")) {
            return;
          }

          // Skip preset buttons and set buttons (they have their own handling)
          if (
            btn.classList.contains("preset-btn") ||
            btn.classList.contains("set-btn")
          ) {
            return;
          }

          const channelId = parseInt(btn.dataset.channelId || btn.dataset.id);
          if (!isNaN(channelId)) {
            // Mousedown event - send momentary press
            btn.addEventListener("mousedown", (event) => {
              this._addPressedClass(btn);
              this.wsManager.sendJson(DeviceCommands.momentary(channelId, 1));
            });

            // Mouseup event - send momentary release
            btn.addEventListener("mouseup", (event) => {
              this._removePressedClass(btn);
              this.wsManager.sendJson(DeviceCommands.momentary(channelId, 0));
            });

            // Touch events for mobile
            btn.addEventListener("touchstart", (e) => {
              e.preventDefault();
              this._addPressedClass(btn);
              this.wsManager.sendJson(DeviceCommands.momentary(channelId, 1));
            });

            btn.addEventListener("touchend", (e) => {
              e.preventDefault();
              // Brief delay to ensure visual feedback is visible
              setTimeout(() => {
                this._removePressedClass(btn);
              }, 50);
              this.wsManager.sendJson(DeviceCommands.momentary(channelId, 0));
            });

            // Handle mouse/touch leave events
            btn.addEventListener("mouseleave", (e) => {
              if (this._hasPressedClass(btn)) {
                this._removePressedClass(btn);
                this.wsManager.sendJson(DeviceCommands.momentary(channelId, 0));
              }
            });

            btn.addEventListener("touchcancel", (e) => {
              setTimeout(() => {
                this._removePressedClass(btn);
              }, 50);
              this.wsManager.sendJson(DeviceCommands.momentary(channelId, 0));
            });

            // Additional touch event for better mobile responsiveness
            btn.addEventListener("touchmove", (e) => {
              // If touch moves outside the button, treat as touchcancel
              const touch = e.touches[0];
              const rect = btn.getBoundingClientRect();
              if (
                touch.clientX < rect.left ||
                touch.clientX > rect.right ||
                touch.clientY < rect.top ||
                touch.clientY > rect.bottom
              ) {
                if (this._hasPressedClass(btn)) {
                  this._removePressedClass(btn);
                  this.wsManager.sendJson(
                    DeviceCommands.momentary(channelId, 0)
                  );
                }
              }
            });

            // Prevent default click behavior
            btn.addEventListener("click", (e) => {
              e.preventDefault();
              e.stopPropagation();
            });
          }
        });

      // Setup pulse buttons (special handling)
      this._setupPulseButtons();
      
      // Setup group button behavior (radio button-like behavior)
      this._setupGroupButtons();
    }

    // Helper methods for CSS class management
    _addPressedClass(btn) {
      if (btn.classList.contains("btn-pill--small")) {
        btn.classList.add("btn-pill--small--pressed");
      } else if (btn.classList.contains("btn-pill--medium")) {
        btn.classList.add("btn-pill--medium--pressed");
      } else if (btn.classList.contains("btn-pill--long")) {
        btn.classList.add("btn-pill--long--pressed");
      } else if (
        btn.classList.contains("btn-round") ||
        btn.classList.contains("round-btn")
      ) {
        btn.classList.add("btn-round--pressed");
      } else if (
        btn.classList.contains("preset-btn") ||
        btn.classList.contains("pill-btn")
      ) {
        // Handle preset buttons and generic pill buttons
        btn.classList.add("pressed");
      }
    }

    _removePressedClass(btn) {
      if (btn.classList.contains("btn-pill--small")) {
        btn.classList.remove("btn-pill--small--pressed");
      } else if (btn.classList.contains("btn-pill--medium")) {
        btn.classList.remove("btn-pill--medium--pressed");
      } else if (btn.classList.contains("btn-pill--long")) {
        btn.classList.remove("btn-pill--long--pressed");
      } else if (
        btn.classList.contains("btn-round") ||
        btn.classList.contains("round-btn")
      ) {
        btn.classList.remove("btn-round--pressed");
      } else if (
        btn.classList.contains("preset-btn") ||
        btn.classList.contains("pill-btn")
      ) {
        // Handle preset buttons and generic pill buttons
        btn.classList.remove("pressed");
      }
    }

    _hasPressedClass(btn) {
      return (
        btn.classList.contains("btn-pill--small--pressed") ||
        btn.classList.contains("btn-pill--medium--pressed") ||
        btn.classList.contains("btn-pill--long--pressed") ||
        btn.classList.contains("btn-round--pressed") ||
        btn.classList.contains("pressed")
      );
    }

    _setupPulseButtons() {
      const pulseButtons = document.querySelectorAll(".pulse-btn");

      for (let i = 0; i < pulseButtons.length; i++) {
        const button = pulseButtons[i];
        const channelId = parseInt(button.getAttribute("data-channel-id"), 10);

        if (!isNaN(channelId)) {
          // Mousedown event
          button.addEventListener("mousedown", (event) => {
            button.classList.add("active");
            this.wsManager.sendJson(DeviceCommands.momentary(channelId, 1));
          });

          // Mouseup event
          button.addEventListener("mouseup", (event) => {
            button.classList.remove("active");
            this.wsManager.sendJson(DeviceCommands.momentary(channelId, 0));
          });

          // Touch events for mobile
          button.addEventListener("touchstart", (event) => {
            event.preventDefault();
            button.classList.add("active");
            this.wsManager.sendJson(DeviceCommands.momentary(channelId, 1));
          });

          button.addEventListener("touchend", (event) => {
            event.preventDefault();
            button.classList.remove("active");
            this.wsManager.sendJson(DeviceCommands.momentary(channelId, 0));
          });

          // Handle case where mouse/touch leaves button while pressed
          button.addEventListener("mouseleave", (event) => {
            if (button.classList.contains("active")) {
              button.classList.remove("active");
              this.wsManager.sendJson(DeviceCommands.momentary(channelId, 0));
            }
          });

          button.addEventListener("touchcancel", (event) => {
            button.classList.remove("active");
            this.wsManager.sendJson(DeviceCommands.momentary(channelId, 0));
          });
        }
      }
    }

    _setupGroupButtons() {
      // Handle buttons with data-group attribute for radio button behavior
      const groupedButtons = document.querySelectorAll('[data-group]');
      
      groupedButtons.forEach((btn) => {
        const group = btn.dataset.group;
        
        // Override the default behavior for grouped buttons
        btn.addEventListener('mousedown', (event) => {
          // For grouped buttons, first deactivate all other buttons in the same group
          const allGroupButtons = document.querySelectorAll(`[data-group="${group}"]`);
          allGroupButtons.forEach(groupBtn => {
            if (groupBtn !== btn) {
              groupBtn.classList.remove('active');
            }
          });
          
          // Then activate this button
          btn.classList.add('active');
        });
      });
    }

    _setupSliderControls() {
      // Range sliders (dimmer controls, temperature, etc.) - using proven working dimmer commands
      document
        .querySelectorAll('input[type="range"].slider')
        .forEach((slider) => {
          const channelId = parseInt(
            slider.dataset.channelId || slider.dataset.id
          );
          if (!isNaN(channelId)) {
            // Special handling for the temperature slider (channel 57)
            if (channelId === 57) {
              slider.addEventListener("input", () => {
                const value = parseInt(slider.value);
                // Send the raw temperature value (45-95) directly
                this.wsManager.sendJson(
                  DeviceCommands.dimmer(channelId, value)
                );

                // Update the target temperature display immediately
                const targetTempDisplay =
                  document.getElementById("target-temp");
                if (targetTempDisplay) {
                  targetTempDisplay.textContent = `${value}°F`;
                }
              });
            } else {
              // Standard dimmer behavior for other sliders
              slider.addEventListener("input", () => {
                const value = parseInt(slider.value);
                // Use the proven working dimmer command
                this.wsManager.sendJson(
                  DeviceCommands.dimmer(channelId, value)
                );

                // Update any associated value display
                const valueDisplay = slider.nextElementSibling;
                if (
                  valueDisplay &&
                  valueDisplay.classList.contains("slider-value")
                ) {
                  valueDisplay.textContent = `${value}%`;
                }
              });
            }
          }
        });

      // Also handle any sliders with data-channel-id attribute specifically
      document
        .querySelectorAll('input[type="range"][data-channel-id]')
        .forEach((slider) => {
          const channelId = parseInt(
            slider.getAttribute("data-channel-id"),
            10
          );
          if (!isNaN(channelId) && channelId !== 57) {
            // Skip 57 as it's handled above
            slider.addEventListener("input", () => {
              const value = parseInt(slider.value, 10);
              this.wsManager.sendJson(DeviceCommands.dimmer(channelId, value));
            });
          }
        });
    }

    _setupModalControls() {
      // AC Limit Modal (from your HTML)
      const acLimitBtn = document.getElementById("ac-limit-btn");
      const acLimitModal = document.getElementById("ac-limit-modal");
      const closeLimitBtn = document.getElementById("close-limit");
      const cancelLimitBtn = document.getElementById("cancel-limit");
      const acLimitUpBtn = document.getElementById("ac-limit-up");
      const acLimitDownBtn = document.getElementById("ac-limit-down");
      const acLimitValue = document.getElementById("ac-limit-value");
      const setLimitBtn = document.getElementById("apply-limit");

      if (acLimitBtn) {
        acLimitBtn.addEventListener("click", () => {
          if (acLimitModal) {
            acLimitModal.style.display = "flex";
            if (acLimitValue) acLimitValue.textContent = this.currentAcLimit;
            this._updatePresetButtons(this.currentAcLimit);
          }
        });
      }

      if (closeLimitBtn) {
        closeLimitBtn.addEventListener("click", () => {
          if (acLimitModal) acLimitModal.style.display = "none";
        });
      }

      if (cancelLimitBtn) {
        cancelLimitBtn.addEventListener("click", () => {
          if (acLimitModal) acLimitModal.style.display = "none";
        });
      }

      if (acLimitUpBtn) {
        acLimitUpBtn.addEventListener("click", () => {
          // Send momentary command to increase AC limit (signal 31)
          const channelId = parseInt(acLimitUpBtn.dataset.id);
          if (!isNaN(channelId)) {
            console.log(`Sending increase AC limit command to channel ${channelId}`);
            this.wsManager.sendJson(DeviceCommands.momentary(channelId, 1));
            setTimeout(() => {
              this.wsManager.sendJson(DeviceCommands.momentary(channelId, 0));
            }, 100);
          }
        });
      }

      if (acLimitDownBtn) {
        acLimitDownBtn.addEventListener("click", () => {
          // Send momentary command to decrease AC limit (signal 32)
          const channelId = parseInt(acLimitDownBtn.dataset.id);
          if (!isNaN(channelId)) {
            console.log(`Sending decrease AC limit command to channel ${channelId}`);
            this.wsManager.sendJson(DeviceCommands.momentary(channelId, 1));
            setTimeout(() => {
              this.wsManager.sendJson(DeviceCommands.momentary(channelId, 0));
            }, 100);
          }
        });
      }

      // Preset buttons - Enhanced touch handling
      document.querySelectorAll(".preset-btn").forEach((btn) => {
        // Remove existing event listeners by cloning the button
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        // Add unified event handler
        this._addModalButtonHandler(newBtn, () => {
          this.currentAcLimit = parseInt(newBtn.dataset.value);
          if (acLimitValue) acLimitValue.textContent = this.currentAcLimit;
          this._updatePresetButtons(this.currentAcLimit);
          
          // Send momentary command to the specific preset button channel
          const channelId = parseInt(newBtn.dataset.id);
          if (!isNaN(channelId)) {
            console.log(`Sending preset AC limit command to channel ${channelId} (${this.currentAcLimit}A)`);
            this.wsManager.sendJson(DeviceCommands.momentary(channelId, 1));
            setTimeout(() => {
              this.wsManager.sendJson(DeviceCommands.momentary(channelId, 0));
            }, 100);
          }
        });
      });

      // Set button - Enhanced with proper touch handling and modal closing
      if (setLimitBtn) {
        // Remove existing event listeners
        const newSetBtn = setLimitBtn.cloneNode(true);
        setLimitBtn.parentNode.replaceChild(newSetBtn, setLimitBtn);

        // Add unified event handler with modal closing
        this._addModalButtonHandler(newSetBtn, () => {
          // Send momentary command to the load-ac-limit channel (34)
          const channelId = parseInt(newSetBtn.dataset.id);
          if (!isNaN(channelId)) {
            console.log(`Sending load AC limit command to channel ${channelId}`);
            this.wsManager.sendJson(DeviceCommands.momentary(channelId, 1));
            // Send release after a short delay
            setTimeout(() => {
              this.wsManager.sendJson(DeviceCommands.momentary(channelId, 0));
            }, 100);
          }

          // Close the modal after command is sent
          setTimeout(() => {
            if (acLimitModal) {
              acLimitModal.style.display = "none";
            }
          }, 200);
        });
      }
    }

    // New helper method for modal button handling
    _addModalButtonHandler(button, callback) {
      let isPressed = false;
      let pressTimer = null;

      const handleStart = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (isPressed) return;
        isPressed = true;

        // Visual feedback
        this._addPressedClass(button);

        // Clear any existing timer
        if (pressTimer) {
          clearTimeout(pressTimer);
        }

        // Set a timer to prevent stuck states
        pressTimer = setTimeout(() => {
          if (isPressed) {
            handleEnd();
          }
        }, 3000);
      };

      const handleEnd = () => {
        if (!isPressed) return;
        isPressed = false;

        // Clear timer
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }

        // Remove visual feedback
        this._removePressedClass(button);

        // Execute callback
        if (callback) {
          callback();
        }
      };

      const handleCancel = () => {
        if (!isPressed) return;
        isPressed = false;

        // Clear timer
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }

        // Remove visual feedback
        this._removePressedClass(button);
      };

      // Mouse events
      button.addEventListener("mousedown", handleStart);
      button.addEventListener("mouseup", handleEnd);
      button.addEventListener("mouseleave", handleCancel);

      // Touch events
      button.addEventListener("touchstart", handleStart, { passive: false });
      button.addEventListener("touchend", handleEnd, { passive: false });
      button.addEventListener("touchcancel", handleCancel, { passive: false });

      // Prevent default click behavior
      button.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    }

    _updatePresetButtons(value) {
      document.querySelectorAll(".preset-btn").forEach((btn) => {
        btn.classList.toggle("active", parseInt(btn.dataset.value) === value);
      });
    }

    _setupHvacTabs() {
      // HVAC sub-tabs (heating, cooling, ventilation)
      document.querySelectorAll(".hvac-tab-button").forEach((btn) => {
        btn.addEventListener("click", () => {
          document
            .querySelectorAll(".hvac-tab-button")
            .forEach((b) => b.classList.remove("active"));
          document
            .querySelectorAll(".hvac-tab-content")
            .forEach((t) => t.classList.remove("active"));

          btn.classList.add("active");
          const tabId = btn.getAttribute("data-hvac-tab") + "-tab";
          const tabContent = document.getElementById(tabId);
          if (tabContent) {
            tabContent.classList.add("active");
          }
        });
      });
    }

    _setupLightingTabs() {
      // Lighting sub-tabs (switches, accessories)
      document.querySelectorAll(".lighting-tab-button").forEach((btn) => {
        btn.addEventListener("click", () => {
          document
            .querySelectorAll(".lighting-tab-button")
            .forEach((b) => b.classList.remove("active"));
          document
            .querySelectorAll(".lighting-tab-content")
            .forEach((t) => t.classList.remove("active"));

          btn.classList.add("active");
          const tabId = btn.getAttribute("data-lighting-tab") + "-tab";
          const tabContent = document.getElementById(tabId);
          if (tabContent) {
            tabContent.classList.add("active");
          }
        });
      });

      // RGB zone tabs
      document.querySelectorAll(".rgb-zone-button").forEach((btn) => {
        btn.addEventListener("click", () => {
          const container = btn.closest(".lighting-tab-content");
          if (container) {
            container
              .querySelectorAll(".rgb-zone-button")
              .forEach((b) => b.classList.remove("active"));
            container
              .querySelectorAll(".rgb-zone-content")
              .forEach((t) => t.classList.remove("active"));
          }

          btn.classList.add("active");
          const tabId = btn.getAttribute("data-zone-tab") + "-tab";
          const tabContent = document.getElementById(tabId);
          if (tabContent) {
            tabContent.classList.add("active");
          }
        });
      });

      // RGB mode buttons (RGB vs White)
      document.querySelectorAll(".rgb-mode-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const zone = btn.getAttribute("data-zone");
          const mode = btn.getAttribute("data-mode");

          // Toggle active state for this zone
          document
            .querySelectorAll(`.rgb-mode-btn[data-zone="${zone}"]`)
            .forEach((mb) => {
              mb.classList.toggle(
                "active",
                mb.getAttribute("data-mode") === mode
              );
            });

          // Show/hide appropriate slider groups
          const zoneContainer = btn.closest(".rgb-zone-content");
          if (zoneContainer) {
            const rgbGroup = zoneContainer.querySelector(
              '.slider-group[data-slider-type="rgb"]'
            );
            const whiteGroup = zoneContainer.querySelector(
              '.slider-group[data-slider-type="white"]'
            );
            if (rgbGroup)
              rgbGroup.style.display = mode === "rgb" ? "block" : "none";
            if (whiteGroup)
              whiteGroup.style.display = mode === "white" ? "block" : "none";
          }
        });
      });

      // Accessory zone tabs
      document.querySelectorAll(".accessory-zone-button").forEach((btn) => {
        btn.addEventListener("click", () => {
          document
            .querySelectorAll(".accessory-zone-button")
            .forEach((b) => b.classList.remove("active"));
          document
            .querySelectorAll(".accessory-zone-content")
            .forEach((t) => t.classList.remove("active"));

          btn.classList.add("active");
          const tabId = btn.getAttribute("data-accessory-tab") + "-tab";
          const tabContent = document.getElementById(tabId);
          if (tabContent) {
            tabContent.classList.add("active");
          }
        });
      });
    }

    _setupConnectionControls() {
      // Connection buttons (from your HTML, though they're hidden)
      const connectBtn = document.getElementById("connect-btn");
      const disconnectBtn = document.getElementById("disconnect-btn");

      if (connectBtn) {
        connectBtn.addEventListener("click", () => {
          this.wsManager.connect();
        });
      }

      if (disconnectBtn) {
        disconnectBtn.addEventListener("click", () => {
          this.wsManager.disconnect();
        });
      }
    }
  }

  /////////////////////////
  // 8. Application Controller - Orchestrates everything
  /////////////////////////
  class ApplicationController {
    constructor() {
      this.wsManager = new WebSocketManager();
      this.contentDecoder = new ContentDecoder();
      this.communicationHandler = new CommunicationHandler(this.contentDecoder);
      this.uiEventManager = new UIEventManager(this.wsManager);
      this.widgets = new Map();
      this.signalFormatters = {
        default: { format: (v) => `${v}`, cssClasses: null },
      };
    }

    async initialize() {
      try {
        // Load signal information first
        const signalInfoArray = await this.contentDecoder.loadSignalInfo();

        // Create formatters from the loaded signal info
        this.signalFormatters =
          SignalFormatterFactory.createFormatters(signalInfoArray);

        // Set up WebSocket message handling
        this.wsManager.subscribe((message) => {
          this.communicationHandler.handleMessage(message);
        });

        // Initialize UI components
        this._initializeWidgets();
        this.uiEventManager.setupEventListeners();
        this._setupConnectionStatus();

        // Connect to WebSocket
        this.wsManager.connect();

        console.log("Application initialized successfully");
      } catch (error) {
        console.error("Failed to initialize application:", error);
      }
    }

    _initializeWidgets() {
      // Initialize value display widgets (matching your HTML signal-value class)
      document.querySelectorAll(".signal-value").forEach((element) => {
        const signalId = parseInt(
          element.dataset.id || element.dataset.signalId
        );
        if (!isNaN(signalId)) {
          const formatter =
            this.signalFormatters[signalId] || this.signalFormatters.default;
          const widget = new ValueDisplayWidget(
            element,
            signalId,
            this.communicationHandler,
            formatter
          );
          this.widgets.set(`value-${signalId}`, widget);
        }
      });

      // Special handling for specific elements from your HTML
      this._initializeSpecialElements();
    }

    _initializeSpecialElements() {
      // Interior temperature special handling (from your HTML)
      const interiorTempSpan = document.querySelector(
        '.signal-value[data-id="25"]'
      );
      if (interiorTempSpan) {
        this.communicationHandler.addOnMfdValueReceivedDelegate(
          34,
          (signal) => {
            // Updated to use TemperatureConverter for consistent conversion
            const degElement = document.getElementById("interior-deg");
            if (degElement) {
              const fahrenheitValue =
                TemperatureConverter.convertRawKelvinToFahrenheit(signal.value);
              degElement.textContent = fahrenheitValue.toFixed(1);
            }
          }
        );
      }

      // Target temperature display (signal ID 59) - no conversion needed
      this.communicationHandler.addOnMfdValueReceivedDelegate(59, (signal) => {
        const targetTempDisplay = document.getElementById("target-temp");
        if (targetTempDisplay) {
          // Signal 59 is already in Fahrenheit, just display it
          targetTempDisplay.textContent = `${Math.round(signal.value)}°F`;
        }

        // Also update the slider position to match the server value
        const tempSlider = document.getElementById("temp-slider");
        if (tempSlider) {
          tempSlider.value = Math.round(signal.value);
        }
      });

      // Current AC Limit display (signal ID 35)
      this.communicationHandler.addOnMfdValueReceivedDelegate(35, (signal) => {
        const currentLimitDisplay = document.getElementById(
          "current-ac-limit-display"
        );
        if (currentLimitDisplay) {
          // Format the value (signal 35 has dataItemFormatType 6 which is amperage)
          currentLimitDisplay.textContent = Math.round(signal.value);
        }
      });

      // AC Limit Modal close handler - existing code
      this.communicationHandler.addOnMfdValueReceivedDelegate(45, (signal) => {
        if (signal.value === 1) {
          // Close AC limit modal when Set button (signal 45) is pressed
          const modal = document.getElementById("ac-limit-modal");
          if (modal) modal.style.display = "none";
        }
      });

      // Tank gauges (visual level indicators)
      this._initializeTankGauges();
    }

    _initializeTankGauges() {
      // Tank gauge visual updates (matching your HTML structure)
      const tankGauges = document.querySelectorAll(".tank-gauge-item");
      tankGauges.forEach((gauge) => {
        const signalElement = gauge.querySelector(".signal-value");
        if (signalElement) {
          const signalId = parseInt(signalElement.dataset.id);
          if (!isNaN(signalId)) {
            this.communicationHandler.addOnMfdValueReceivedDelegate(
              signalId,
              (signal) => {
                // Update the visual gauge level
                const gaugeLevel = gauge.querySelector(".gauge-level");
                if (gaugeLevel) {
                  gaugeLevel.style.height = `${Math.max(
                    0,
                    Math.min(100, signal.value)
                  )}%`;
                }
              }
            );
          }
        }
      });
    }

    _setupConnectionStatus() {
      // Connection status updates (matching your HTML)
      this.wsManager.onStateChange((state) => {
        const statusEl = document.getElementById("connection-status");
        if (statusEl) {
          statusEl.textContent = state.charAt(0).toUpperCase() + state.slice(1);
          statusEl.className = `connection-status ${state}`;
        }

        // Update button states if they exist
        const connectBtn = document.getElementById("connect-btn");
        const disconnectBtn = document.getElementById("disconnect-btn");

        if (connectBtn) {
          connectBtn.classList.toggle(
            "disabled",
            state === "open" || state === "connecting"
          );
        }
        if (disconnectBtn) {
          disconnectBtn.classList.toggle("disabled", state === "closed");
        }

        // Log state changes
        this._log(`WebSocket state: ${state}`);
      });
    }

    // Public methods for external access
    sendCommand(command) {
      return this.wsManager.sendJson(command);
    }

    getSignalValue(signalId) {
      const widget = this.widgets.get(`value-${signalId}`);
      return widget ? widget._value : null;
    }

    enableDebug() {
      this.wsManager.debugEnabled = true;
      const debugToggle = document.getElementById("debug-toggle");
      if (debugToggle) {
        debugToggle.style.display = "block";
      }
    }

    _log(msg) {
      // Use external log function if available
      if (typeof log === "function") {
        log(msg);
      } else {
        console.log(msg);
      }
    }
  }

  /////////////////////////
  // 9. Logging utility (matching your HTML log element)
  /////////////////////////
  const logElement = document.getElementById("log");
  const log = (msg) => {
    if (!logElement) {
      console.log(msg);
      return;
    }
    const d = document.createElement("div");
    d.textContent = `${new Date().toLocaleTimeString()} – ${msg}`;
    logElement.appendChild(d);
    logElement.scrollTop = logElement.scrollHeight;
  };

  /////////////////////////
  // 10. Application Startup
  /////////////////////////
  let app;

  async function init() {
    try {
      app = new ApplicationController();
      await app.initialize();

      // Initialize RGB zone tab functionality
      initRGBZoneTabs();
      
      // Initialize RGB mode switching functionality
      initRGBModeButtons();

      // Splash screen fade-out (matching your HTML)
      const overlay = document.getElementById("splash-overlay");
      if (overlay) {
        setTimeout(() => {
          overlay.classList.add("hidden");
          setTimeout(() => overlay.remove(), 2000);
        }, 2500);
      }

      console.log("Digital Switching App initialized");
    } catch (error) {
      console.error("Application startup failed:", error);
    }
  }

  // RGB Zone Tab Functionality - ES2018 compatible
  function initRGBZoneTabs() {
    const rgbButtons = document.querySelectorAll('.rgb-zone-button-vertical');
    const rgbContents = document.querySelectorAll('.rgb-zone-content');

    // Convert NodeLists to arrays for better compatibility
    const buttonArray = Array.prototype.slice.call(rgbButtons);
    const contentArray = Array.prototype.slice.call(rgbContents);

    // Add click listeners to each button
    for (let i = 0; i < buttonArray.length; i++) {
      const button = buttonArray[i];
      
      button.addEventListener('click', function() {
        const targetZone = button.getAttribute('data-zone-tab');
        
        // Remove active class from all buttons
        for (let j = 0; j < buttonArray.length; j++) {
          buttonArray[j].classList.remove('active');
        }
        
        // Add active class to clicked button
        button.classList.add('active');
        
        // Hide all content panels
        for (let k = 0; k < contentArray.length; k++) {
          contentArray[k].classList.remove('active');
        }
        
        // Show target content panel
        const targetContent = document.getElementById(targetZone + '-tab');
        if (targetContent) {
          targetContent.classList.add('active');
        }
      });
    }
  }

  // RGB Mode Button Functionality - ES2018 compatible
  function initRGBModeButtons() {
    const rgbModeButtons = document.querySelectorAll('.rgb-mode-btn');
    
    // Convert NodeList to array for better compatibility
    const buttonArray = Array.prototype.slice.call(rgbModeButtons);
    
    // Add click listeners to each RGB/White mode button
    for (let i = 0; i < buttonArray.length; i++) {
      const button = buttonArray[i];
      
      button.addEventListener('click', function() {
        const mode = button.getAttribute('data-mode');
        const zone = button.getAttribute('data-zone');
        
        if (mode === 'rgb' || mode === 'white') {
          // Find the parent zone content container
          const zoneContent = button.closest('.rgb-zone-content');
          if (zoneContent) {
            // Find all mode buttons in this zone
            const zoneModeButtons = zoneContent.querySelectorAll('.rgb-mode-btn');
            const zoneModeArray = Array.prototype.slice.call(zoneModeButtons);
            
            // Remove active class from all mode buttons in this zone
            for (let j = 0; j < zoneModeArray.length; j++) {
              zoneModeArray[j].classList.remove('active');
            }
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Find slider groups in this zone
            const rgbSliderGroup = zoneContent.querySelector('[data-slider-type="rgb"]');
            const whiteSliderGroup = zoneContent.querySelector('[data-slider-type="white"]');
            
            // Show/hide appropriate sliders based on mode
            if (mode === 'rgb') {
              if (rgbSliderGroup) {
                rgbSliderGroup.style.display = 'block';
              }
              if (whiteSliderGroup) {
                whiteSliderGroup.style.display = 'none';
              }
            } else if (mode === 'white') {
              if (rgbSliderGroup) {
                rgbSliderGroup.style.display = 'none';
              }
              if (whiteSliderGroup) {
                whiteSliderGroup.style.display = 'block';
              }
            }
          }
        }
      });
    }
  }

  // Export for global access (matching your original script structure)
  window.app = app;
  window.DeviceCommands = DeviceCommands;
  window.log = log;

  // Helper functions for compatibility with existing code
  window.sendMomentary = function (channelId, state) {
    if (app && app.wsManager && app.wsManager.isOpen) {
      app.wsManager.sendJson(DeviceCommands.momentary(channelId, state));
    }
  };

  window.sendDimmer = function (channelId, level) {
    if (app && app.wsManager && app.wsManager.isOpen) {
      app.wsManager.sendJson(DeviceCommands.dimmer(channelId, level));
    }
  };

  window.sendToggle = function (channelId) {
    if (app && app.wsManager && app.wsManager.isOpen) {
      app.wsManager.sendJson(DeviceCommands.toggle(channelId));
    }
  };

  // Start the application when DOM is ready
  document.addEventListener("DOMContentLoaded", init);

  // Also expose the classes for potential external use
  window.WebSocketManager = WebSocketManager;
  window.CommunicationHandler = CommunicationHandler;
  window.ContentDecoder = ContentDecoder;
  window.ValueDisplayWidget = ValueDisplayWidget;
  window.SignalFormatterFactory = SignalFormatterFactory;
  window.TemperatureConverter = TemperatureConverter;

  /**
   * Status Indicator Usage Examples:
   *
   * 1. Basic circular indicator:
   *    <div class="status-indicator" data-signal-id="76" data-id="76"></div>
   *
   * 2. Rectangular indicator:
   *    <div class="status-indicator rectangular" data-signal-id="77" data-id="77"></div>
   *
   * 3. Text indicator:
   *    <div class="status-indicator text" data-signal-id="78" data-id="78"
   *         data-active-text="RUNNING" data-inactive-text="STOPPED">STOPPED</div>
   *
   * 4. Grouped with label:
   *    <div class="status-indicator-group">
   *      <span class="status-indicator-label">Water Pump:</span>
   *      <div class="status-indicator" data-signal-id="5" data-id="5"></div>
   *    </div>
   *
   * The indicators automatically update based on the same signal IDs used by buttons.
   * They use the same _updateButtonStates logic but display as non-clickable status lights.
   */
})();

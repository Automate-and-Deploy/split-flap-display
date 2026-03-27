/**
 * WebSocket Client for Display
 * Handles real-time communication with the server
 */

export class WebSocketClient {
  constructor(displayId) {
    this.displayId = displayId;
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 3000;
    this.connectionStatus = "disconnected";
    this.eventHandlers = {};
    this.heartbeatInterval = null;
  }

  connect() {
    try {
      this.socket = io({
        transports: ["websocket", "polling"],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
      });

      this._setupEventHandlers();
    } catch (error) {
      console.error("WebSocket connection error:", error);
      this._scheduleReconnect();
    }
  }

  _setupEventHandlers() {
    // Connection established
    this.socket.on("connect", () => {
      console.log("✅ WebSocket connected");
      this.connectionStatus = "connected";
      this.reconnectAttempts = 0;
      this._emit("connected");

      // Register this display
      this.socket.emit("register_display", {
        display_id: this.displayId,
        capabilities: {
          sound: true,
          fullscreen: true,
        },
      });

      // Start heartbeat
      this._startHeartbeat();
    });

    // Connection lost
    this.socket.on("disconnect", (reason) => {
      console.log("⚠️ WebSocket disconnected:", reason);
      this.connectionStatus = "disconnected";
      this._emit("disconnected");
      this._stopHeartbeat();
    });

    // Connection error
    this.socket.on("connect_error", (error) => {
      console.error("❌ WebSocket connection error:", error);
      this.connectionStatus = "error";
      this._emit("error", error);
    });

    // Server events
    this.socket.on("config_updated", (config) => {
      console.log("⚙️ Configuration updated:", config);
      this._emit("config_updated", config);
    });

    this.socket.on("messages_loaded", (messages) => {
      console.log("📨 Messages loaded:", messages.length);
      this._emit("messages_loaded", messages);
    });

    this.socket.on("show_message", (message) => {
      console.log("📺 Show message:", message);
      this._emit("show_message", message);
    });

    this.socket.on("appearance_updated", (appearance) => {
      console.log("🎨 Appearance updated:", appearance);
      this._emit("appearance_updated", appearance);
    });

    this.socket.on("message_created", (message) => {
      console.log("📝 Message created:", message);
      this._emit("message_created", message);
    });

    this.socket.on("message_updated", (message) => {
      console.log("📝 Message updated:", message);
      this._emit("message_updated", message);
    });

    this.socket.on("message_deleted", (data) => {
      console.log("🗑️ Message deleted:", data);
      this._emit("message_deleted", data);
    });

    this.socket.on("reload", (data) => {
      console.log("🔄 Reload requested:", data);
      window.location.reload();
    });
  }

  _startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.socket.emit("heartbeat", {
          display_id: this.displayId,
          status: { timestamp: Date.now() },
        });
      }
    }, 30000);
  }

  _stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  _emit(event, data) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      });
    }
  }

  _scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
      );
      setTimeout(() => this.connect(), this.reconnectDelay);
    }
  }

  // Public API
  on(event, handler) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }

  off(event, handler) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event] = this.eventHandlers[event].filter(
        (h) => h !== handler,
      );
    }
  }

  isConnected() {
    return this.socket && this.socket.connected;
  }

  getConnectionStatus() {
    return this.connectionStatus;
  }

  reportMessageCompleted(messageId, durationMs) {
    if (this.socket && this.socket.connected) {
      this.socket.emit("message_completed", {
        display_id: this.displayId,
        message_id: messageId,
        duration_ms: durationMs,
      });
    }
  }

  reportError(error, context = {}) {
    if (this.socket && this.socket.connected) {
      this.socket.emit("display_error", {
        display_id: this.displayId,
        error: error.message || error,
        context,
      });
    }
  }

  disconnect() {
    this._stopHeartbeat();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

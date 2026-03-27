/**
 * WebSocket Handler
 *
 * Real-time communication between displays and admin interface
 */

const db = require("../db/database");

let io = null;

/**
 * Initialize WebSocket handling
 */
function initializeSocketHandler(socketIoInstance) {
  io = socketIoInstance;

  io.on("connection", (socket) => {
    console.log(`📱 New WebSocket connection: ${socket.id}`);

    // Handle display registration
    socket.on("register_display", async (data) => {
      try {
        const { display_id = "default", capabilities = {} } = data;

        // Join the display room
        socket.join(`display-${display_id}`);
        socket.display_id = display_id;

        console.log(`📺 Display ${display_id} connected (${socket.id})`);

        // Send current configuration to the display
        const config = await db.get(
          "SELECT * FROM display_configs WHERE display_id = ?",
          [display_id],
        );

        if (config) {
          const displayConfig = {
            ...config,
            theme_colors: JSON.parse(config.theme_colors || "{}"),
            sound_enabled: Boolean(config.sound_enabled),
          };

          socket.emit("config_updated", displayConfig);
        }

        // Send active messages for this display
        const messages = await db.query(
          `
          SELECT * FROM messages 
          WHERE display_id = ? AND active = 1 
          ORDER BY created_at DESC
        `,
          [display_id],
        );

        const parsedMessages = messages.map((msg) => ({
          ...msg,
          content: JSON.parse(msg.content),
          active: Boolean(msg.active),
        }));

        socket.emit("messages_loaded", parsedMessages);

        // Log the connection
        await db.run(
          `
          INSERT INTO display_analytics (display_id, event_type, event_data)
          VALUES (?, 'display_connected', ?)
        `,
          [display_id, JSON.stringify({ socket_id: socket.id, capabilities })],
        );

        // Notify admin interfaces
        socket.to("admin").emit("display_status", {
          display_id,
          status: "connected",
          socket_id: socket.id,
          capabilities,
        });
      } catch (error) {
        console.error("Error in register_display:", error);
        socket.emit("error", { message: "Failed to register display" });
      }
    });

    // Handle admin registration
    socket.on("register_admin", (data) => {
      socket.join("admin");
      console.log(`🔧 Admin connected (${socket.id})`);

      socket.emit("admin_connected", {
        message: "Admin interface connected",
        timestamp: new Date().toISOString(),
      });

      // Send list of connected displays
      const connectedDisplays = getConnectedDisplays();
      socket.emit("displays_status", connectedDisplays);
    });

    // Handle display heartbeat
    socket.on("heartbeat", async (data) => {
      const { display_id, status = {} } = data;

      if (display_id) {
        // Log heartbeat
        await db.run(
          `
          INSERT INTO display_analytics (display_id, event_type, event_data)
          VALUES (?, 'heartbeat', ?)
        `,
          [display_id, JSON.stringify(status)],
        );

        // Notify admin
        socket.to("admin").emit("display_heartbeat", {
          display_id,
          status,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Handle message completion confirmation from display
    socket.on("message_completed", async (data) => {
      const { display_id, message_id, duration_ms } = data;

      try {
        await db.run(
          `
          INSERT INTO display_analytics (display_id, message_id, event_type, event_data)
          VALUES (?, ?, 'message_completed', ?)
        `,
          [display_id, message_id, JSON.stringify({ duration_ms })],
        );

        // Notify admin
        socket.to("admin").emit("message_completed", {
          display_id,
          message_id,
          duration_ms,
          timestamp: new Date().toISOString(),
        });

        console.log(
          `✅ Message ${message_id} completed on display ${display_id} (${duration_ms}ms)`,
        );
      } catch (error) {
        console.error("Error logging message completion:", error);
      }
    });

    // Handle display error reports
    socket.on("display_error", async (data) => {
      const { display_id, error, context = {} } = data;

      console.error(`❌ Display error from ${display_id}:`, error);

      try {
        await db.run(
          `
          INSERT INTO display_analytics (display_id, event_type, event_data)
          VALUES (?, 'display_error', ?)
        `,
          [display_id, JSON.stringify({ error, context })],
        );

        // Notify admin
        socket.to("admin").emit("display_error", {
          display_id,
          error,
          context,
          timestamp: new Date().toISOString(),
        });
      } catch (dbError) {
        console.error("Error logging display error:", dbError);
      }
    });

    // Handle admin requests for display status
    socket.on("request_display_status", (display_id) => {
      socket.to(`display-${display_id}`).emit("status_request");
    });

    // Handle admin sending test messages
    socket.on("test_message", async (data) => {
      const { display_id, content } = data;

      try {
        const testMessage = {
          id: `test_${Date.now()}`,
          content,
          title: "Test Message",
          display_id,
          created_at: new Date().toISOString(),
        };

        socket.to(`display-${display_id}`).emit("show_message", testMessage);

        console.log(`🧪 Test message sent to display ${display_id}`);
      } catch (error) {
        console.error("Error sending test message:", error);
        socket.emit("error", { message: "Failed to send test message" });
      }
    });

    // Handle reload broadcast from admin
    socket.on("broadcast_reload", () => {
      broadcastToAllDisplays("reload", { timestamp: Date.now() });
      console.log("🔄 Reload broadcast to all displays");
    });

    // Handle config update notification
    socket.on("config_update", (data) => {
      const { display_id, config } = data;
      socket.to(`display-${display_id}`).emit("config_updated", config);
      console.log(`⚙️ Config update sent to display ${display_id}`);
    });

    // Handle appearance update from admin
    socket.on("appearance_update", (data) => {
      const { display_id, appearance } = data;
      socket.to(`display-${display_id}`).emit("appearance_updated", appearance);
      console.log(`🎨 Appearance update sent to display ${display_id}`);
    });

    // Handle disconnection
    socket.on("disconnect", async () => {
      const display_id = socket.display_id;

      console.log(
        `📱 WebSocket disconnected: ${socket.id}${display_id ? ` (display: ${display_id})` : ""}`,
      );

      if (display_id) {
        try {
          await db.run(
            `
            INSERT INTO display_analytics (display_id, event_type, event_data)
            VALUES (?, 'display_disconnected', ?)
          `,
            [display_id, JSON.stringify({ socket_id: socket.id })],
          );

          // Notify admin
          socket.to("admin").emit("display_status", {
            display_id,
            status: "disconnected",
            socket_id: socket.id,
          });
        } catch (error) {
          console.error("Error logging disconnect:", error);
        }
      }
    });

    // Generic error handler
    socket.on("error", (error) => {
      console.error(`WebSocket error from ${socket.id}:`, error);
    });
  });

  return io;
}

/**
 * Get list of connected displays
 */
function getConnectedDisplays() {
  if (!io) return [];

  const displays = [];
  const rooms = io.sockets.adapter.rooms;

  for (const [roomName, room] of rooms) {
    if (roomName.startsWith("display-")) {
      const display_id = roomName.replace("display-", "");
      const sockets = Array.from(room);

      displays.push({
        display_id,
        connected_sockets: sockets.length,
        socket_ids: sockets,
      });
    }
  }

  return displays;
}

/**
 * Broadcast message to all displays
 */
function broadcastToAllDisplays(event, data) {
  if (!io) return;

  const rooms = io.sockets.adapter.rooms;
  for (const [roomName] of rooms) {
    if (roomName.startsWith("display-")) {
      io.to(roomName).emit(event, data);
    }
  }
}

/**
 * Broadcast message to specific display
 */
function broadcastToDisplay(display_id, event, data) {
  if (!io) return;
  io.to(`display-${display_id}`).emit(event, data);
}

/**
 * Broadcast message to admin interfaces
 */
function broadcastToAdmins(event, data) {
  if (!io) return;
  io.to("admin").emit(event, data);
}

/**
 * Get IO instance (for use in other modules)
 */
function getIO() {
  return io;
}

/**
 * Get connected display count
 */
function getDisplayCount() {
  if (!io) return 0;

  let count = 0;
  const rooms = io.sockets.adapter.rooms;

  for (const [roomName] of rooms) {
    if (roomName.startsWith("display-")) {
      count++;
    }
  }

  return count;
}

/**
 * Get admin connection count
 */
function getAdminCount() {
  if (!io) return 0;

  const adminRoom = io.sockets.adapter.rooms.get("admin");
  return adminRoom ? adminRoom.size : 0;
}

module.exports = {
  init: initializeSocketHandler,
  getIO,
  getConnectedDisplays,
  broadcastToAllDisplays,
  broadcastToDisplay,
  broadcastToAdmins,
  getDisplayCount,
  getAdminCount,
};

// For backward compatibility
module.exports.default = initializeSocketHandler;

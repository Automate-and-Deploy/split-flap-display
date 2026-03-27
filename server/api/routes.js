/**
 * API Routes
 *
 * REST API endpoints for display management
 */

const express = require("express");
const Joi = require("joi");
const db = require("../db/database");

const router = express.Router();

// Validation schemas
const messageSchema = Joi.object({
  content: Joi.array()
    .items(Joi.string().max(200).allow(""))
    .min(1)
    .max(10)
    .required(),
  title: Joi.string().max(255).optional(),
  display_id: Joi.string().max(255).default("default"),
  scheduled_at: Joi.date().iso().optional(),
  active: Joi.boolean().default(true),
});

const configSchema = Joi.object({
  name: Joi.string().max(255).required(),
  grid_cols: Joi.number().integer().min(10).max(100).default(22),
  grid_rows: Joi.number().integer().min(1).max(20).default(5),
  scramble_duration: Joi.number().integer().min(100).max(5000).default(800),
  flip_duration: Joi.number().integer().min(50).max(1000).default(300),
  stagger_delay: Joi.number().integer().min(5).max(100).default(25),
  message_interval: Joi.number().integer().min(1000).max(60000).default(4000),
  theme_colors: Joi.object().optional(),
  sound_enabled: Joi.boolean().default(true),
});

// Middleware for validation
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Validation error",
        details: error.details.map((d) => d.message),
      });
    }
    req.validatedData = value;
    next();
  };
}

// Helper function to emit WebSocket events
function emitToDisplay(displayId, event, data) {
  const socketHandler = require("../websocket/socketHandler");
  const io = socketHandler.getIO();
  if (io) {
    io.to(`display-${displayId}`).emit(event, data);
  }
}

// =============================================================================
// MESSAGE ENDPOINTS
// =============================================================================

/**
 * GET /api/messages
 * Get all messages, optionally filtered by display_id
 */
router.get("/messages", async (req, res) => {
  try {
    const { display_id, active, limit = 50, offset = 0 } = req.query;

    let sql = "SELECT * FROM messages";
    let params = [];
    let conditions = [];

    if (display_id) {
      conditions.push("display_id = ?");
      params.push(display_id);
    }

    if (active !== undefined) {
      conditions.push("active = ?");
      params.push(active === "true" ? 1 : 0);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    const messages = await db.query(sql, params);

    // Parse content JSON for each message
    const parsedMessages = messages.map((msg) => ({
      ...msg,
      content: JSON.parse(msg.content),
      active: Boolean(msg.active),
    }));

    res.json({
      messages: parsedMessages,
      total: parsedMessages.length,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

/**
 * GET /api/messages/:id
 * Get a specific message by ID
 */
router.get("/messages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const message = await db.get("SELECT * FROM messages WHERE id = ?", [id]);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    res.json({
      ...message,
      content: JSON.parse(message.content),
      active: Boolean(message.active),
    });
  } catch (error) {
    console.error("Error fetching message:", error);
    res.status(500).json({ error: "Failed to fetch message" });
  }
});

/**
 * POST /api/messages
 * Create a new message
 */
router.post("/messages", validate(messageSchema), async (req, res) => {
  try {
    const data = req.validatedData;

    const result = await db.run(
      `
      INSERT INTO messages (content, title, display_id, scheduled_at, active)
      VALUES (?, ?, ?, ?, ?)
    `,
      [
        JSON.stringify(data.content),
        data.title || null,
        data.display_id,
        data.scheduled_at || null,
        data.active ? 1 : 0,
      ],
    );

    const message = await db.get("SELECT * FROM messages WHERE id = ?", [
      result.id,
    ]);

    const responseMessage = {
      ...message,
      content: JSON.parse(message.content),
      active: Boolean(message.active),
    };

    // Emit to connected displays
    emitToDisplay(data.display_id, "message_created", responseMessage);

    // Log analytics
    await db.run(
      `
      INSERT INTO display_analytics (display_id, message_id, event_type, event_data)
      VALUES (?, ?, 'message_created', ?)
    `,
      [data.display_id, result.id, JSON.stringify({ title: data.title })],
    );

    res.status(201).json(responseMessage);
  } catch (error) {
    console.error("Error creating message:", error);
    res.status(500).json({ error: "Failed to create message" });
  }
});

/**
 * PUT /api/messages/:id
 * Update an existing message
 */
router.put("/messages/:id", validate(messageSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.validatedData;

    const existing = await db.get("SELECT * FROM messages WHERE id = ?", [id]);
    if (!existing) {
      return res.status(404).json({ error: "Message not found" });
    }

    await db.run(
      `
      UPDATE messages 
      SET content = ?, title = ?, display_id = ?, scheduled_at = ?, active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
      [
        JSON.stringify(data.content),
        data.title || null,
        data.display_id,
        data.scheduled_at || null,
        data.active ? 1 : 0,
        id,
      ],
    );

    const message = await db.get("SELECT * FROM messages WHERE id = ?", [id]);

    const responseMessage = {
      ...message,
      content: JSON.parse(message.content),
      active: Boolean(message.active),
    };

    // Emit to connected displays
    emitToDisplay(data.display_id, "message_updated", responseMessage);

    res.json(responseMessage);
  } catch (error) {
    console.error("Error updating message:", error);
    res.status(500).json({ error: "Failed to update message" });
  }
});

/**
 * DELETE /api/messages/:id
 * Delete a message
 */
router.delete("/messages/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await db.get("SELECT * FROM messages WHERE id = ?", [id]);
    if (!existing) {
      return res.status(404).json({ error: "Message not found" });
    }

    await db.run("DELETE FROM messages WHERE id = ?", [id]);

    // Emit to connected displays
    emitToDisplay(existing.display_id, "message_deleted", { id: parseInt(id) });

    res.json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ error: "Failed to delete message" });
  }
});

// =============================================================================
// DISPLAY CONFIGURATION ENDPOINTS
// =============================================================================

/**
 * GET /api/displays
 * Get all display configurations
 */
router.get("/displays", async (req, res) => {
  try {
    const displays = await db.query(
      "SELECT * FROM display_configs ORDER BY created_at DESC",
    );

    const parsedDisplays = displays.map((display) => ({
      ...display,
      theme_colors: JSON.parse(display.theme_colors || "{}"),
      sound_enabled: Boolean(display.sound_enabled),
    }));

    res.json({ displays: parsedDisplays });
  } catch (error) {
    console.error("Error fetching displays:", error);
    res.status(500).json({ error: "Failed to fetch displays" });
  }
});

/**
 * GET /api/displays/:display_id
 * Get a specific display configuration
 */
router.get("/displays/:display_id", async (req, res) => {
  try {
    const { display_id } = req.params;
    const display = await db.get(
      "SELECT * FROM display_configs WHERE display_id = ?",
      [display_id],
    );

    if (!display) {
      return res.status(404).json({ error: "Display not found" });
    }

    res.json({
      ...display,
      theme_colors: JSON.parse(display.theme_colors || "{}"),
      sound_enabled: Boolean(display.sound_enabled),
    });
  } catch (error) {
    console.error("Error fetching display:", error);
    res.status(500).json({ error: "Failed to fetch display" });
  }
});

/**
 * POST /api/displays
 * Create a new display configuration
 */
router.post("/displays", validate(configSchema), async (req, res) => {
  try {
    const data = req.validatedData;
    const display_id = req.body.display_id || `display_${Date.now()}`;

    await db.run(
      `
      INSERT OR REPLACE INTO display_configs 
      (display_id, name, grid_cols, grid_rows, scramble_duration, flip_duration, 
       stagger_delay, message_interval, theme_colors, sound_enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        display_id,
        data.name,
        data.grid_cols,
        data.grid_rows,
        data.scramble_duration,
        data.flip_duration,
        data.stagger_delay,
        data.message_interval,
        JSON.stringify(data.theme_colors || {}),
        data.sound_enabled ? 1 : 0,
      ],
    );

    const display = await db.get(
      "SELECT * FROM display_configs WHERE display_id = ?",
      [display_id],
    );

    const responseDisplay = {
      ...display,
      theme_colors: JSON.parse(display.theme_colors || "{}"),
      sound_enabled: Boolean(display.sound_enabled),
    };

    // Emit configuration update to display
    emitToDisplay(display_id, "config_updated", responseDisplay);

    res.status(201).json(responseDisplay);
  } catch (error) {
    console.error("Error creating display:", error);
    res.status(500).json({ error: "Failed to create display" });
  }
});

/**
 * PUT /api/displays/:display_id/config
 * Update display configuration
 */
router.put(
  "/displays/:display_id/config",
  validate(configSchema.fork(["name"], (schema) => schema.optional())),
  async (req, res) => {
    try {
      const { display_id } = req.params;
      const data = req.validatedData;

      const existing = await db.get(
        "SELECT * FROM display_configs WHERE display_id = ?",
        [display_id],
      );
      if (!existing) {
        return res.status(404).json({ error: "Display not found" });
      }

      const allowedFields = new Set([
        "name",
        "grid_cols",
        "grid_rows",
        "scramble_duration",
        "flip_duration",
        "stagger_delay",
        "message_interval",
        "theme_colors",
        "sound_enabled",
      ]);

      const updateFields = [];
      const params = [];

      Object.keys(data).forEach((key) => {
        if (!allowedFields.has(key)) return;
        if (key === "theme_colors") {
          updateFields.push("theme_colors = ?");
          params.push(JSON.stringify(data[key]));
        } else if (key === "sound_enabled") {
          updateFields.push("sound_enabled = ?");
          params.push(data[key] ? 1 : 0);
        } else {
          updateFields.push(`${key} = ?`);
          params.push(data[key]);
        }
      });

      updateFields.push("updated_at = CURRENT_TIMESTAMP");
      params.push(display_id);

      await db.run(
        `UPDATE display_configs SET ${updateFields.join(", ")} WHERE display_id = ?`,
        params,
      );

      const display = await db.get(
        "SELECT * FROM display_configs WHERE display_id = ?",
        [display_id],
      );

      const responseDisplay = {
        ...display,
        theme_colors: JSON.parse(display.theme_colors || "{}"),
        sound_enabled: Boolean(display.sound_enabled),
      };

      // Emit configuration update to display
      emitToDisplay(display_id, "config_updated", responseDisplay);

      res.json(responseDisplay);
    } catch (error) {
      console.error("Error updating display config:", error);
      res.status(500).json({ error: "Failed to update display configuration" });
    }
  },
);

// =============================================================================
// CONTROL ENDPOINTS
// =============================================================================

/**
 * POST /api/displays/:display_id/show
 * Show a specific message on a display immediately
 */
router.post("/displays/:display_id/show", async (req, res) => {
  try {
    const { display_id } = req.params;
    const { message_id } = req.body;

    if (!message_id) {
      return res.status(400).json({ error: "message_id is required" });
    }

    const message = await db.get(
      "SELECT * FROM messages WHERE id = ? AND active = 1",
      [message_id],
    );
    if (!message) {
      return res.status(404).json({ error: "Message not found or inactive" });
    }

    const displayMessage = {
      ...message,
      content: JSON.parse(message.content),
      active: Boolean(message.active),
    };

    // Emit to display
    emitToDisplay(display_id, "show_message", displayMessage);

    // Log analytics
    await db.run(
      `
      INSERT INTO display_analytics (display_id, message_id, event_type)
      VALUES (?, ?, 'message_shown')
    `,
      [display_id, message_id],
    );

    res.json({ message: "Message sent to display", data: displayMessage });
  } catch (error) {
    console.error("Error showing message:", error);
    res.status(500).json({ error: "Failed to show message" });
  }
});

/**
 * GET /api/analytics/:display_id
 * Get analytics for a display
 */
router.get("/analytics/:display_id", async (req, res) => {
  try {
    const { display_id } = req.params;
    const { days = 7 } = req.query;

    const daysInt = Math.max(1, Math.min(365, parseInt(days) || 7));

    const analytics = await db.query(
      `
      SELECT
        event_type,
        COUNT(*) as count,
        DATE(timestamp) as date
      FROM display_analytics
      WHERE display_id = ?
        AND timestamp >= datetime('now', '-' || ? || ' days')
      GROUP BY event_type, DATE(timestamp)
      ORDER BY timestamp DESC
    `,
      [display_id, daysInt],
    );

    res.json({ analytics });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

module.exports = router;

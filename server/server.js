#!/usr/bin/env node

/**
 * Enhanced Display - Backend Server
 *
 * Main server entry point that provides:
 * - REST API for content management
 * - WebSocket server for real-time display updates
 * - Static file serving for admin interface
 */

const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");

// Import our modules
const database = require("./db/database");
const apiRoutes = require("./api/routes");
const socketHandler = require("./websocket/socketHandler");

// Initialize Express app
const app = express();
const server = http.createServer(app);
// CORS: Open by design — this runs on your local network to control displays.
// Restrict origin in production if exposing to the internet.
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Configuration
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";
const isDevelopment = NODE_ENV === "development";

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: isDevelopment ? false : undefined,
  }),
);

// Rate limiting - only apply to API routes, skip static files
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 1000 : 100, // higher limit for development
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting only to API routes
app.use("/api", limiter);
app.use("/health", limiter);

// CORS: Open for local network use. Restrict if deploying publicly.
app.use(cors());

// Logging
app.use(morgan(isDevelopment ? "dev" : "combined"));

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static files - serve the display interface
app.use(express.static(path.join(__dirname, "../display")));

// API routes
app.use("/api", apiRoutes);

// Admin interface route
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

// Default route serves the display
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../display/index.html"));
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: require("./package.json").version,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : "Internal server error",
    ...(isDevelopment && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database
    console.log("Initializing database...");
    await database.init();
    console.log("Database initialized successfully");

    // Set up WebSocket handling
    socketHandler.init(io);
    console.log("WebSocket handler initialized");

    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 Display Server running on port ${PORT}`);
      console.log(`📺 Display interface: http://localhost:${PORT}`);
      console.log(`⚙️  Admin interface: http://localhost:${PORT}/admin`);
      console.log(`🔧 API endpoint: http://localhost:${PORT}/api`);
      console.log(`🌐 Environment: ${NODE_ENV}`);
    });

    // Graceful shutdown
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

function shutdown(signal) {
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);

  server.close(() => {
    console.log("✅ HTTP server closed");

    database
      .close()
      .then(() => {
        console.log("✅ Database connection closed");
        process.exit(0);
      })
      .catch((err) => {
        console.error("❌ Error closing database:", err);
        process.exit(1);
      });
  });
}

// Start the server
startServer();

module.exports = app;

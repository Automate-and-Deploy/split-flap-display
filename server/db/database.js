/**
 * Database Module
 * 
 * SQLite database setup and management for display
 * Handles messages, display configurations, and user data
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

let db = null;

/**
 * Initialize database connection and create tables
 */
async function init() {
  return new Promise((resolve, reject) => {
    const dbPath = path.join(__dirname, 'display.db');
    
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      
      console.log('Connected to SQLite database');
      
      // Enable foreign keys and WAL mode for better performance
      db.serialize(() => {
        db.run("PRAGMA foreign_keys = ON");
        db.run("PRAGMA journal_mode = WAL");
        
        createTables()
          .then(resolve)
          .catch(reject);
      });
    });
  });
}

/**
 * Create database tables
 */
async function createTables() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Messages table
      db.run(`
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content TEXT NOT NULL,
          title VARCHAR(255),
          display_id VARCHAR(255) DEFAULT 'default',
          scheduled_at DATETIME,
          active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Display configurations table
      db.run(`
        CREATE TABLE IF NOT EXISTS display_configs (
          display_id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          grid_cols INTEGER DEFAULT 22,
          grid_rows INTEGER DEFAULT 5,
          scramble_duration INTEGER DEFAULT 800,
          flip_duration INTEGER DEFAULT 300,
          stagger_delay INTEGER DEFAULT 25,
          message_interval INTEGER DEFAULT 4000,
          theme_colors TEXT DEFAULT '{}',
          sound_enabled BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Message queue table for scheduling
      db.run(`
        CREATE TABLE IF NOT EXISTS message_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          message_id INTEGER NOT NULL,
          display_id VARCHAR(255) NOT NULL,
          scheduled_for DATETIME NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          executed_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE
        )
      `);

      // Analytics table
      db.run(`
        CREATE TABLE IF NOT EXISTS display_analytics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          display_id VARCHAR(255) NOT NULL,
          message_id INTEGER,
          event_type VARCHAR(50) NOT NULL,
          event_data TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE SET NULL
        )
      `);

      // Create indexes for better performance
      db.run(`CREATE INDEX IF NOT EXISTS idx_messages_display_id ON messages(display_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_messages_active ON messages(active)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_queue_display_id ON message_queue(display_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_queue_scheduled ON message_queue(scheduled_for)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_queue_status ON message_queue(status)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_analytics_display ON display_analytics(display_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON display_analytics(timestamp)`);

      // Insert default configuration
      db.run(`
        INSERT OR IGNORE INTO display_configs (
          display_id, name, grid_cols, grid_rows, 
          scramble_duration, flip_duration, stagger_delay, message_interval,
          theme_colors, sound_enabled
        ) VALUES (
          'default', 'Main Display', 22, 5,
          800, 300, 25, 4000,
          '{"background":"#000000","text":"#ffffff","accent":"#ff6600"}', 1
        )
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Database tables created successfully');
          insertSampleData().then(resolve).catch(reject);
        }
      });
    });
  });
}

/**
 * Insert sample messages for testing
 */
async function insertSampleData() {
  return new Promise((resolve, reject) => {
    const sampleMessages = [
      {
        content: JSON.stringify(['', 'WELCOME TO', 'ENHANCED DISPLAY', '', '']),
        title: 'Welcome Message',
        display_id: 'default'
      },
      {
        content: JSON.stringify(['', 'STAY HUNGRY', 'STAY FOOLISH', '- STEVE JOBS', '']),
        title: 'Steve Jobs Quote',
        display_id: 'default'
      },
      {
        content: JSON.stringify(['', 'GOOD DESIGN IS', 'GOOD BUSINESS', '- THOMAS WATSON', '']),
        title: 'Design Quote',
        display_id: 'default'
      }
    ];

    db.get("SELECT COUNT(*) as count FROM messages", (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      // Only insert sample data if no messages exist
      if (row.count === 0) {
        const stmt = db.prepare(`
          INSERT INTO messages (content, title, display_id) 
          VALUES (?, ?, ?)
        `);

        sampleMessages.forEach(msg => {
          stmt.run([msg.content, msg.title, msg.display_id]);
        });

        stmt.finalize((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('Sample messages inserted');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  });
}

/**
 * Get database instance
 */
function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Call init() first.');
  }
  return db;
}

/**
 * Close database connection
 */
async function close() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Database connection closed');
          db = null;
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}

/**
 * Execute a query with parameters
 */
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = getDB();
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

/**
 * Execute a single row query
 */
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = getDB();
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

/**
 * Execute an insert/update/delete query
 */
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = getDB();
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ 
          id: this.lastID, 
          changes: this.changes 
        });
      }
    });
  });
}

module.exports = {
  init,
  close,
  getDB,
  query,
  get,
  run
};
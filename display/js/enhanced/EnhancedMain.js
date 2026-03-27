/**
 * Enhanced Main Application
 * 
 * Extended version of main.js that integrates with backend control system
 */

// Import enhanced modules
import '../enhanced/WebSocketClient.js';
import '../enhanced/ConfigManager.js';

// Import original modules
import { Board } from '../Board.js';
import { SoundEngine } from '../SoundEngine.js';
import { MessageRotator } from '../MessageRotator.js';
import { KeyboardController } from '../KeyboardController.js';

class EnhancedDisplay {
  constructor() {
    this.boardContainer = null;
    this.soundEngine = null;
    this.board = null;
    this.rotator = null;
    this.keyboard = null;
    this.wsClient = null;
    this.configManager = window.configManager;
    
    this.audioInitialized = false;
    this.isFullscreen = false;
    this.serverMessages = [];
    this.currentMessageIndex = 0;
    
    // Bind methods
    this.init = this.init.bind(this);
    this.initAudio = this.initAudio.bind(this);
    this.setupWebSocket = this.setupWebSocket.bind(this);
    this.setupEventListeners = this.setupEventListeners.bind(this);
    this.handleServerMessage = this.handleServerMessage.bind(this);
    this.showMessage = this.showMessage.bind(this);
  }

  async init() {
    console.log('🚀 Initializing Enhanced Display...');
    
    // Get display ID from URL parameter or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const displayId = urlParams.get('display') || 
                     localStorage.getItem('display_id') || 
                     'default';
    
    // Save display ID for future use
    localStorage.setItem('display_id', displayId);
    this.configManager.set('display_id', displayId);

    // Initialize core components
    this.boardContainer = document.getElementById('board-container');
    if (!this.boardContainer) {
      console.error('❌ Board container not found!');
      return;
    }

    this.soundEngine = new SoundEngine();
    this.board = new Board(this.boardContainer, this.soundEngine);
    this.rotator = new MessageRotator(this.board);
    this.keyboard = new KeyboardController(this.rotator, this.soundEngine);

    // Store references globally for other modules
    window.soundEngine = this.soundEngine;
    window.board = this.board;
    window.rotator = this.rotator;

    // Set up WebSocket connection
    await this.setupWebSocket(displayId);

    // Set up event listeners
    this.setupEventListeners();

    // Apply initial configuration
    this.configManager.applyConfiguration();
    this.configManager.applyResponsiveSizing();

    // Add configuration change listener
    this.configManager.addListener((newConfig, oldConfig) => {
      this.handleConfigurationChange(newConfig, oldConfig);
    });

    console.log('✅ Enhanced Display initialized successfully');

    // Show connection status indicator
    this.updateConnectionStatus('connecting');
  }

  async setupWebSocket(displayId) {
    console.log(`🔌 Setting up WebSocket for display: ${displayId}`);
    
    this.wsClient = new WebSocketClient(displayId);
    window.wsClient = this.wsClient; // Make globally available

    // Set up event handlers before connecting
    this.setupWebSocketEvents();

    // Connect to the server
    this.wsClient.connect();
  }

  setupWebSocketEvents() {
    // Handle WebSocket events
    this.wsClient.on('connected', () => {
      console.log('✅ Connected to server');
      this.updateConnectionStatus('connected');
    });

    this.wsClient.on('disconnected', () => {
      console.log('❌ Disconnected from server');
      this.updateConnectionStatus('disconnected');
      
      // Fall back to local message rotation if configured
      if (this.serverMessages.length === 0 && this.rotator) {
        console.log('📱 Falling back to local message rotation');
        this.rotator.start();
      }
    });

    this.wsClient.on('config_updated', (config) => {
      console.log('⚙️ Configuration updated from server');
      this.configManager.updateConfig(config);
    });

    this.wsClient.on('messages_loaded', (messages) => {
      console.log(`📨 Loaded ${messages.length} messages from server`);
      this.serverMessages = messages;
      this.currentMessageIndex = 0;
      
      // Stop local rotation and use server messages
      if (this.rotator) {
        this.rotator.stop();
      }
      
      // Start server message rotation
      if (messages.length > 0) {
        this.startServerMessageRotation();
      }
    });

    this.wsClient.on('message_created', (message) => {
      console.log('📝 New message received from server');
      this.serverMessages.push(message);
    });

    this.wsClient.on('message_updated', (message) => {
      console.log('📝 Message updated from server');
      const index = this.serverMessages.findIndex(m => m.id === message.id);
      if (index !== -1) {
        this.serverMessages[index] = message;
      }
    });

    this.wsClient.on('message_deleted', (data) => {
      console.log('🗑️ Message deleted from server');
      this.serverMessages = this.serverMessages.filter(m => m.id !== data.id);
    });

    this.wsClient.on('show_message', (message) => {
      console.log('📺 Showing specific message from server');
      this.showMessage(message);
    });

    this.wsClient.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      this.updateConnectionStatus('error');
    });
  }

  setupEventListeners() {
    // Audio initialization on first user interaction
    const initAudio = async () => {
      if (this.audioInitialized) return;
      this.audioInitialized = true;
      await this.soundEngine.init();
      this.soundEngine.resume();
      document.removeEventListener('click', initAudio);
      document.removeEventListener('keydown', initAudio);
      console.log('🔊 Audio initialized');
    };
    
    document.addEventListener('click', initAudio);
    document.addEventListener('keydown', initAudio);

    // Volume toggle button
    const volumeBtn = document.getElementById('volume-btn');
    if (volumeBtn) {
      volumeBtn.addEventListener('click', () => {
        initAudio();
        const muted = this.soundEngine.toggleMute();
        volumeBtn.classList.toggle('muted', muted);
        
        // Update server configuration
        this.configManager.set('sound_enabled', !muted);
      });
    }

    // "Get Early Access" button: scroll to board and go fullscreen
    const ctaBtn = document.getElementById('cta-btn');
    if (ctaBtn) {
      ctaBtn.addEventListener('click', (e) => {
        e.preventDefault();
        initAudio();
        this.enterFullscreenMode();
      });
    }

    // Fullscreen change events
    document.addEventListener('fullscreenchange', () => {
      this.isFullscreen = !!document.fullscreenElement;
      document.body.classList.toggle('fullscreen', this.isFullscreen);
      
      if (this.isFullscreen) {
        this.configManager.applyResponsiveSizing();
      }
    });

    // Window resize for responsive sizing
    window.addEventListener('resize', () => {
      this.configManager.applyResponsiveSizing();
    });

    // Visibility change (for power saving)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('📱 Display hidden, pausing animations');
        // Optionally pause animations when display is hidden
      } else {
        console.log('📱 Display visible, resuming animations');
        // Resume animations
      }
    });

    // Error handling
    window.addEventListener('error', (event) => {
      console.error('❌ JavaScript error:', event.error);
      if (this.wsClient) {
        this.wsClient.reportError(event.error, {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      }
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('❌ Unhandled promise rejection:', event.reason);
      if (this.wsClient) {
        this.wsClient.reportError(event.reason, {
          type: 'unhandled_rejection'
        });
      }
    });
  }

  enterFullscreenMode() {
    this.boardContainer.scrollIntoView({ behavior: 'smooth' });
    
    setTimeout(() => {
      document.documentElement.requestFullscreen()
        .then(() => {
          console.log('📺 Entered fullscreen mode');
        })
        .catch(err => {
          console.warn('⚠️ Could not enter fullscreen:', err);
        });
    }, 400);
  }

  startServerMessageRotation() {
    if (this.serverMessages.length === 0) return;
    
    // Show first message immediately
    this.showMessage(this.serverMessages[0]);
    
    // Set up rotation timer
    const interval = this.configManager.get('message_interval') || 4000;
    
    if (this.messageRotationTimer) {
      clearInterval(this.messageRotationTimer);
    }
    
    this.messageRotationTimer = setInterval(() => {
      this.currentMessageIndex = (this.currentMessageIndex + 1) % this.serverMessages.length;
      this.showMessage(this.serverMessages[this.currentMessageIndex]);
    }, interval);
  }

  showMessage(message) {
    if (!this.board || !message) return;
    
    const startTime = performance.now();
    
    // Convert message content to the format expected by the board
    const messageLines = Array.isArray(message.content) ? message.content : [message.content];
    
    console.log(`📺 Displaying message: ${message.title || 'Untitled'}`);
    
    // Display the message using the board
    this.board.displayMessage(messageLines);
    
    // Calculate duration after animation completes
    setTimeout(() => {
      const duration = performance.now() - startTime;
      console.log(`✅ Message displayed in ${duration.toFixed(2)}ms`);
      
      // Report completion to server
      if (this.wsClient && message.id) {
        this.wsClient.reportMessageCompleted(message.id, duration);
      }
    }, 4000);
  }

  handleConfigurationChange(newConfig, oldConfig) {
    console.log('⚙️ Handling configuration change');
    
    // Update message rotation interval if changed
    if (newConfig.message_interval !== oldConfig.message_interval) {
      if (this.messageRotationTimer) {
        this.startServerMessageRotation();
      }
    }

    // Update sound settings
    if (newConfig.sound_enabled !== oldConfig.sound_enabled) {
      if (this.soundEngine) {
        if (newConfig.sound_enabled) {
          this.soundEngine.enable();
        } else {
          this.soundEngine.disable();
        }
      }
    }

    // Update grid if dimensions changed
    if (newConfig.grid_cols !== oldConfig.grid_cols || 
        newConfig.grid_rows !== oldConfig.grid_rows) {
      console.log(`📏 Grid size changed to ${newConfig.grid_cols}x${newConfig.grid_rows}`);
      
      // Rebuild the board with new dimensions
      if (this.board && typeof this.board.updateGridSize === 'function') {
        this.board.updateGridSize(newConfig.grid_cols, newConfig.grid_rows);
      }
    }
  }

  updateConnectionStatus(status) {
    // Update UI to show connection status
    const statusIndicator = document.getElementById('connection-status') || this.createStatusIndicator();
    
    statusIndicator.className = `connection-status ${status}`;
    
    const statusText = {
      'connecting': 'Connecting...',
      'connected': 'Connected',
      'disconnected': 'Offline',
      'error': 'Connection Error'
    }[status] || status;
    
    statusIndicator.textContent = statusText;
    statusIndicator.title = `WebSocket status: ${statusText}`;
  }

  createStatusIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'connection-status';
    indicator.className = 'connection-status';
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      z-index: 1000;
      transition: all 0.3s ease;
    `;
    
    // Add CSS for different states
    const style = document.createElement('style');
    style.textContent = `
      .connection-status.connecting { background: #ffa500; color: white; }
      .connection-status.connected { background: #4caf50; color: white; }
      .connection-status.disconnected { background: #f44336; color: white; }
      .connection-status.error { background: #e91e63; color: white; }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(indicator);
    return indicator;
  }

  // Public API methods
  getCurrentConfig() {
    return this.configManager.getConfig();
  }

  updateConfig(config) {
    this.configManager.updateConfig(config);
  }

  getConnectionStatus() {
    return this.wsClient ? this.wsClient.getConnectionStatus() : null;
  }

  getServerMessages() {
    return [...this.serverMessages];
  }

  showMessageById(messageId) {
    const message = this.serverMessages.find(m => m.id === messageId);
    if (message) {
      this.showMessage(message);
      return true;
    }
    return false;
  }
}

// Initialize the enhanced display when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.enhancedDisplay = new EnhancedDisplay();
  window.enhancedDisplay.init();
});

// Export for use in other modules
window.EnhancedDisplay = EnhancedDisplay;
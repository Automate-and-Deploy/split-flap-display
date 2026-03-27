/**
 * Configuration Manager
 * 
 * Handles dynamic configuration updates from the server
 */

class ConfigManager {
  constructor() {
    this.config = {
      // Default configuration (fallback values)
      display_id: 'default',
      name: 'Enhanced Display',
      grid_cols: 22,
      grid_rows: 5,
      scramble_duration: 800,
      flip_duration: 300,
      stagger_delay: 25,
      message_interval: 4000,
      theme_colors: {
        background: '#000000',
        text: '#ffffff',
        accent: '#ff6600'
      },
      sound_enabled: true
    };

    this.listeners = new Set();
    
    // Try to load saved config from localStorage
    this.loadFromStorage();
  }

  /**
   * Load configuration from localStorage
   */
  loadFromStorage() {
    try {
      const saved = localStorage.getItem('display_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.config = { ...this.config, ...parsed };
        console.log('📋 Configuration loaded from storage');
      }
    } catch (error) {
      console.warn('⚠️ Failed to load configuration from storage:', error);
    }
  }

  /**
   * Save configuration to localStorage
   */
  saveToStorage() {
    try {
      localStorage.setItem('display_config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('⚠️ Failed to save configuration to storage:', error);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    console.log('⚙️ Configuration updated:', newConfig);
    
    // Save to storage
    this.saveToStorage();
    
    // Notify listeners
    this.notifyListeners(oldConfig, this.config);
    
    // Apply configuration to DOM/CSS
    this.applyConfiguration();
  }

  /**
   * Apply configuration to the display
   */
  applyConfiguration() {
    const config = this.config;
    
    // Update CSS custom properties for theming
    const root = document.documentElement;
    const colors = config.theme_colors;
    
    if (colors) {
      if (colors.background) root.style.setProperty('--bg-color', colors.background);
      if (colors.text) root.style.setProperty('--text-color', colors.text);
      if (colors.accent) root.style.setProperty('--accent-color', colors.accent);
    }

    // Update grid configuration
    if (window.board && typeof window.board.updateGridSize === 'function') {
      window.board.updateGridSize(config.grid_cols, config.grid_rows);
    }

    // Update timing constants
    if (window.SCRAMBLE_DURATION !== undefined) {
      window.SCRAMBLE_DURATION = config.scramble_duration;
    }
    if (window.FLIP_DURATION !== undefined) {
      window.FLIP_DURATION = config.flip_duration;
    }
    if (window.STAGGER_DELAY !== undefined) {
      window.STAGGER_DELAY = config.stagger_delay;
    }
    if (window.MESSAGE_INTERVAL !== undefined) {
      window.MESSAGE_INTERVAL = config.message_interval;
    }

    // Update sound settings
    if (window.soundEngine) {
      if (config.sound_enabled) {
        window.soundEngine.enable();
      } else {
        window.soundEngine.disable();
      }
    }

    // Apply grid size to board element
    const boardElement = document.querySelector('.board');
    if (boardElement) {
      boardElement.style.setProperty('--grid-cols', config.grid_cols);
      boardElement.style.setProperty('--grid-rows', config.grid_rows);
    }
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Get specific configuration value
   */
  get(key) {
    return this.config[key];
  }

  /**
   * Set specific configuration value
   */
  set(key, value) {
    const oldValue = this.config[key];
    this.config[key] = value;
    
    if (oldValue !== value) {
      this.saveToStorage();
      this.applyConfiguration();
      
      // Notify specific change
      this.listeners.forEach(listener => {
        if (typeof listener.onConfigChange === 'function') {
          listener.onConfigChange(key, value, oldValue);
        }
      });
    }
  }

  /**
   * Add configuration change listener
   */
  addListener(listener) {
    this.listeners.add(listener);
  }

  /**
   * Remove configuration change listener
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of configuration changes
   */
  notifyListeners(oldConfig, newConfig) {
    this.listeners.forEach(listener => {
      try {
        if (typeof listener === 'function') {
          listener(newConfig, oldConfig);
        } else if (typeof listener.onConfigUpdate === 'function') {
          listener.onConfigUpdate(newConfig, oldConfig);
        }
      } catch (error) {
        console.error('❌ Error in configuration listener:', error);
      }
    });
  }

  /**
   * Reset to default configuration
   */
  resetToDefaults() {
    const defaults = {
      grid_cols: 22,
      grid_rows: 5,
      scramble_duration: 800,
      flip_duration: 300,
      stagger_delay: 25,
      message_interval: 4000,
      theme_colors: {
        background: '#000000',
        text: '#ffffff',
        accent: '#ff6600'
      },
      sound_enabled: true
    };

    this.updateConfig(defaults);
  }

  /**
   * Get display dimensions for responsive sizing
   */
  getDisplayDimensions() {
    const cols = this.config.grid_cols;
    const rows = this.config.grid_rows;
    
    // Calculate optimal tile size based on viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Leave some margin for headers/UI
    const availableWidth = viewportWidth * 0.9;
    const availableHeight = viewportHeight * 0.8;
    
    // Calculate tile size that fits the grid
    const tileWidth = Math.floor(availableWidth / cols);
    const tileHeight = Math.floor(availableHeight / rows);
    
    // Use the smaller dimension to maintain aspect ratio
    const tileSize = Math.min(tileWidth, tileHeight);
    
    return {
      cols,
      rows,
      tileSize,
      totalWidth: tileSize * cols,
      totalHeight: tileSize * rows,
      fontSize: Math.max(tileSize * 0.6, 12) // Minimum font size of 12px
    };
  }

  /**
   * Apply responsive sizing
   */
  applyResponsiveSizing() {
    const dimensions = this.getDisplayDimensions();
    const root = document.documentElement;
    
    root.style.setProperty('--tile-size', `${dimensions.tileSize}px`);
    root.style.setProperty('--font-size', `${dimensions.fontSize}px`);
    root.style.setProperty('--board-width', `${dimensions.totalWidth}px`);
    root.style.setProperty('--board-height', `${dimensions.totalHeight}px`);
    
    console.log('📏 Applied responsive sizing:', dimensions);
  }

  /**
   * Export configuration for backup/sharing
   */
  exportConfig() {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from backup/sharing
   */
  importConfig(configJson) {
    try {
      const imported = JSON.parse(configJson);
      
      // Validate essential fields
      if (typeof imported.grid_cols !== 'number' || imported.grid_cols < 1 || imported.grid_cols > 100) {
        throw new Error('Invalid grid_cols');
      }
      if (typeof imported.grid_rows !== 'number' || imported.grid_rows < 1 || imported.grid_rows > 20) {
        throw new Error('Invalid grid_rows');
      }
      
      this.updateConfig(imported);
      console.log('📥 Configuration imported successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to import configuration:', error);
      return false;
    }
  }
}

// Create global config manager instance
window.configManager = new ConfigManager();

// Apply initial configuration
window.configManager.applyConfiguration();

// Handle window resize for responsive sizing
window.addEventListener('resize', () => {
  window.configManager.applyResponsiveSizing();
});

// Apply responsive sizing on load
window.addEventListener('load', () => {
  window.configManager.applyResponsiveSizing();
});

// Export for use in other modules
window.ConfigManager = ConfigManager;
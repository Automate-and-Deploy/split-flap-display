import { Tile } from "./Tile.js";
import {
  GRID_COLS,
  GRID_ROWS,
  STAGGER_DELAY,
  SCRAMBLE_DURATION,
  TOTAL_TRANSITION,
  ACCENT_COLORS,
  SCRAMBLE_COLORS,
  COLOR_THEMES,
  TILE_STYLES,
} from "./constants.js";

export class Board {
  constructor(containerEl, soundEngine, cols = GRID_COLS, rows = GRID_ROWS) {
    this.cols = cols;
    this.rows = rows;
    this.soundEngine = soundEngine;
    this.isTransitioning = false;
    this.tiles = [];
    this.currentGrid = [];
    this.accentIndex = 0;

    // Active color/style config
    this.activeScrambleColors = [...SCRAMBLE_COLORS];
    this.activeAccentColors = [...ACCENT_COLORS];
    this.activeTileBackground = "#222222";
    this.activeTextColor = "#FFFFFF";
    this.activeStyle = "gloss"; // default matches original look

    // Build board DOM
    this.boardEl = document.createElement("div");
    this.boardEl.className = "board";
    this.boardEl.style.setProperty("--grid-cols", this.cols);
    this.boardEl.style.setProperty("--grid-rows", this.rows);

    // Left accent squares
    this.leftBar = this._createAccentBar("accent-bar-left");
    this.boardEl.appendChild(this.leftBar);

    // Tile grid
    this.gridEl = document.createElement("div");
    this.gridEl.className = "tile-grid";

    this._buildTiles();

    this.boardEl.appendChild(this.gridEl);

    // Right accent squares
    this.rightBar = this._createAccentBar("accent-bar-right");
    this.boardEl.appendChild(this.rightBar);

    // Connection status dots (bottom right)
    this.connStatusBar = this._createConnectionStatusBar();
    this.boardEl.appendChild(this.connStatusBar);

    // Keyboard hint
    const hint = document.createElement("div");
    hint.className = "keyboard-hint";
    hint.textContent = "N";
    hint.title = "Keyboard shortcuts";
    hint.addEventListener("click", (e) => {
      e.stopPropagation();
      const overlay = this.boardEl.querySelector(".shortcuts-overlay");
      if (overlay) overlay.classList.toggle("visible");
    });
    this.boardEl.appendChild(hint);

    // Shortcuts overlay
    const overlay = document.createElement("div");
    overlay.className = "shortcuts-overlay";
    overlay.innerHTML = `
      <div><span>Next message</span><kbd>Enter</kbd></div>
      <div><span>Previous</span><kbd>\u2190</kbd></div>
      <div><span>Fullscreen</span><kbd>F</kbd></div>
      <div><span>Mute</span><kbd>M</kbd></div>
    `;
    this.boardEl.appendChild(overlay);

    containerEl.appendChild(this.boardEl);
    this._updateAccentColors();

    // Set initial connection status to red (disconnected)
    this.setConnectionStatus("disconnected");
  }

  _buildTiles() {
    // Clear existing tiles
    this.gridEl.innerHTML = "";
    this.tiles = [];
    this.currentGrid = [];

    for (let r = 0; r < this.rows; r++) {
      const row = [];
      const charRow = [];
      for (let c = 0; c < this.cols; c++) {
        const tile = new Tile(r, c);
        tile.restingBackground = this.activeTileBackground;
        tile.restingTextColor = this.activeTextColor;
        tile.setScrambleColors(this.activeScrambleColors);
        tile.setChar(" ");
        tile.frontEl.style.backgroundColor = this.activeTileBackground;
        tile.backEl.style.backgroundColor = this.activeTileBackground;
        tile.frontSpan.style.color = this.activeTextColor;
        tile.backSpan.style.color = this.activeTextColor;
        this.gridEl.appendChild(tile.el);
        row.push(tile);
        charRow.push(" ");
      }
      this.tiles.push(row);
      this.currentGrid.push(charRow);
    }

    // Apply current appearance
    this._applyTileAppearance();
  }

  _createAccentBar(extraClass) {
    const bar = document.createElement("div");
    bar.className = `accent-bar ${extraClass}`;
    for (let i = 0; i < 2; i++) {
      const seg = document.createElement("div");
      seg.className = "accent-segment";
      bar.appendChild(seg);
    }
    return bar;
  }

  _createConnectionStatusBar() {
    const bar = document.createElement("div");
    bar.className = "accent-bar accent-bar-conn";

    // Create two dots for connection status
    for (let i = 0; i < 2; i++) {
      const seg = document.createElement("div");
      seg.className = "accent-segment conn-status-dot";
      bar.appendChild(seg);
    }
    return bar;
  }

  setConnectionStatus(status) {
    const dots = this.connStatusBar.querySelectorAll(".conn-status-dot");
    let color;

    switch (status) {
      case "connected":
        color = "#00FF7F";
        break;
      case "warning":
        color = "#FFCC00";
        break;
      case "error":
      case "disconnected":
      default:
        color = "#FF4444";
        break;
    }

    dots.forEach((dot) => {
      dot.style.backgroundColor = color;
    });
  }

  _updateAccentColors() {
    const color =
      this.activeAccentColors[
        this.accentIndex % this.activeAccentColors.length
      ];
    const segments = this.boardEl.querySelectorAll(
      ".accent-segment:not(.conn-status-dot)",
    );
    segments.forEach((seg) => {
      seg.style.backgroundColor = color;
    });
  }

  /**
   * Apply a color theme by name (key from COLOR_THEMES) or a custom config object.
   * Called from admin panel via WebSocket.
   */
  applyColorTheme(themeKeyOrConfig, customColor) {
    let theme;

    if (typeof themeKeyOrConfig === "string") {
      theme = COLOR_THEMES[themeKeyOrConfig];
      if (!theme) return;

      // For "custom" theme, generate scramble shades from the picked color
      if (themeKeyOrConfig === "custom" && customColor) {
        const shades = this._generateColorShades(customColor);
        theme = {
          ...theme,
          scramble: shades,
          accent: [customColor, shades[2], shades[4]],
          tileBackground: "#222222",
          textColor: "#FFFFFF",
        };
      }
    } else {
      theme = themeKeyOrConfig;
    }

    this.activeScrambleColors =
      theme.scramble && theme.scramble.length > 0
        ? [...theme.scramble]
        : [...SCRAMBLE_COLORS];
    this.activeAccentColors =
      theme.accent && theme.accent.length > 0
        ? [...theme.accent]
        : [...ACCENT_COLORS];
    this.activeTileBackground = theme.tileBackground || "#222222";
    this.activeTextColor = theme.textColor || "#FFFFFF";

    // Push colors to all tiles
    this.tiles.flat().forEach((tile) => {
      tile.setScrambleColors(this.activeScrambleColors);
    });

    this._applyTileAppearance();
    this._updateAccentColors();
  }

  /**
   * Apply a tile style effect by name (key from TILE_STYLES).
   */
  applyTileStyle(styleKey) {
    const style = TILE_STYLES[styleKey];
    if (!style) return;
    this.activeStyle = styleKey;
    this._applyTileAppearance();
  }

  /**
   * Push current appearance (colors + style) to all tile DOM elements.
   */
  _applyTileAppearance() {
    const style = TILE_STYLES[this.activeStyle] || TILE_STYLES.gloss;
    const isNeon = this.activeStyle === "neon";

    this.tiles.flat().forEach((tile) => {
      const front = tile.frontEl;
      const back = tile.backEl;

      // Store resting colors on the tile so scramble can restore them
      tile.restingBackground = this.activeTileBackground;
      tile.restingTextColor = this.activeTextColor;

      // Tile face background
      front.style.backgroundColor = this.activeTileBackground;
      back.style.backgroundColor = this.activeTileBackground;

      // Text color
      tile.frontSpan.style.color = this.activeTextColor;
      tile.backSpan.style.color = this.activeTextColor;

      // Box shadow (emboss, inset, gloss, flat)
      const shadow = style.tileShadow === "none" ? "" : style.tileShadow;
      front.style.boxShadow = shadow;
      back.style.boxShadow = shadow;

      // Neon glow on text
      if (isNeon) {
        const glow = `0 0 7px ${this.activeTextColor}, 0 0 20px ${this.activeTextColor}80, 0 0 40px ${this.activeTextColor}40`;
        tile.frontSpan.style.textShadow = glow;
        tile.backSpan.style.textShadow = glow;
      } else {
        tile.frontSpan.style.textShadow = "";
        tile.backSpan.style.textShadow = "";
      }
    });

    // Set CSS custom properties for the ::before (highlight) and ::after (split line)
    this.boardEl.style.setProperty(
      "--tile-highlight",
      style.tileHighlight || "none",
    );
    this.boardEl.style.setProperty(
      "--tile-split-color",
      style.splitLine || "rgba(0,0,0,0.3)",
    );
  }

  /**
   * Generate 6 shades from a single hex color for scramble animation.
   */
  _generateColorShades(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const shade = (factor) => {
      const clamp = (v) => Math.min(255, Math.max(0, Math.round(v)));
      return `#${clamp(r * factor)
        .toString(16)
        .padStart(2, "0")}${clamp(g * factor)
        .toString(16)
        .padStart(2, "0")}${clamp(b * factor)
        .toString(16)
        .padStart(2, "0")}`;
    };

    return [hex, shade(0.8), shade(1.2), shade(0.6), shade(1.4), shade(0.9)];
  }

  _isLightColor(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 160;
  }

  /**
   * Darken a hex color by a factor (0-1). 0.35 = 35% of original brightness.
   */
  _darkenColor(hex, factor) {
    const r = Math.round(parseInt(hex.slice(1, 3), 16) * factor);
    const g = Math.round(parseInt(hex.slice(3, 5), 16) * factor);
    const b = Math.round(parseInt(hex.slice(5, 7), 16) * factor);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }

  // Update grid size dynamically (from admin)
  updateGridSize(cols, rows) {
    if (cols === this.cols && rows === this.rows) return;

    this.cols = cols;
    this.rows = rows;
    this.boardEl.style.setProperty("--grid-cols", this.cols);
    this.boardEl.style.setProperty("--grid-rows", this.rows);

    // Rebuild tiles with new dimensions
    this._buildTiles();
  }

  displayMessage(lines) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    // Format lines into grid
    const newGrid = this._formatToGrid(lines);

    // Determine which tiles need to change
    let hasChanges = false;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const newChar = newGrid[r][c];
        const oldChar = this.currentGrid[r][c];

        if (newChar !== oldChar) {
          const delay = (r * this.cols + c) * STAGGER_DELAY;
          this.tiles[r][c].scrambleTo(newChar, delay);
          hasChanges = true;
        }
      }
    }

    // Play sound with delay to sync with animations
    if (hasChanges && this.soundEngine) {
      setTimeout(() => {
        this.soundEngine.playTransition();
      }, STAGGER_DELAY * 3);
    }

    // Update accent bar colors
    this.accentIndex++;
    this._updateAccentColors();

    // Update grid state
    this.currentGrid = newGrid;

    // Clear transitioning flag after animation completes
    setTimeout(() => {
      this.isTransitioning = false;
    }, TOTAL_TRANSITION + 200);
  }

  _formatToGrid(lines) {
    const contentLines = lines.filter((line) => line && line.trim().length > 0);
    const contentHeight = contentLines.length;

    const emptyRows = this.rows - contentHeight;
    const padTop = Math.max(0, Math.floor(emptyRows / 2));

    const centeredLines = [];

    for (let i = 0; i < padTop; i++) {
      centeredLines.push("");
    }

    contentLines.forEach((line) => {
      centeredLines.push(line);
    });

    while (centeredLines.length < this.rows) {
      centeredLines.push("");
    }

    const grid = [];
    for (let r = 0; r < this.rows; r++) {
      const line = (centeredLines[r] || "").toUpperCase();
      const padTotal = this.cols - line.length;
      const padLeft = Math.max(0, Math.floor(padTotal / 2));
      const padded =
        " ".repeat(padLeft) +
        line +
        " ".repeat(Math.max(0, this.cols - padLeft - line.length));
      grid.push(padded.split(""));
    }
    return grid;
  }
}

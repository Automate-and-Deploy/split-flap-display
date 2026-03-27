export const GRID_COLS = 22;
export const GRID_ROWS = 5;

export const SCRAMBLE_DURATION = 800;
export const FLIP_DURATION = 300;
export const STAGGER_DELAY = 25;
export const TOTAL_TRANSITION = 3800;
export const MESSAGE_INTERVAL = 4000;

export const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,-!?'/: ";

export const SCRAMBLE_COLORS = [
  "#00AAFF",
  "#00FFCC",
  "#AA00FF",
  "#FF2D00",
  "#FFCC00",
  "#FFFFFF",
];

export const ACCENT_COLORS = [
  "#00FF7F",
  "#FF4D00",
  "#AA00FF",
  "#00AAFF",
  "#00FFCC",
];

// Color theme presets — tileBackground always dark, colors only affect scramble flash + accents
export const COLOR_THEMES = {
  rainbow: {
    label: "Rainbow",
    scramble: [
      "#00AAFF",
      "#00FFCC",
      "#AA00FF",
      "#FF2D00",
      "#FFCC00",
      "#FFFFFF",
    ],
    accent: ["#00FF7F", "#FF4D00", "#AA00FF", "#00AAFF", "#00FFCC"],
    tileBackground: "#222222",
    textColor: "#FFFFFF",
  },
  classic: {
    label: "Classic Airport",
    scramble: [
      "#D4A017",
      "#C8A415",
      "#BF9B13",
      "#D4A017",
      "#C8A415",
      "#BF9B13",
    ],
    accent: ["#D4A017", "#C8A415"],
    tileBackground: "#222222",
    textColor: "#F5E6C8",
  },
  amber: {
    label: "Vintage Amber",
    scramble: [
      "#FF8C00",
      "#FFA500",
      "#FF6600",
      "#CC7000",
      "#E89000",
      "#FFB347",
    ],
    accent: ["#FF8C00", "#FFA500", "#FF6600"],
    tileBackground: "#222222",
    textColor: "#FFFFFF",
  },
  green: {
    label: "Terminal Green",
    scramble: [
      "#00FF41",
      "#00CC33",
      "#33FF66",
      "#00FF41",
      "#00CC33",
      "#33FF66",
    ],
    accent: ["#00FF41", "#00CC33"],
    tileBackground: "#222222",
    textColor: "#FFFFFF",
  },
  blue: {
    label: "Ice Blue",
    scramble: [
      "#00BFFF",
      "#1E90FF",
      "#4FC3F7",
      "#81D4FA",
      "#00BFFF",
      "#87CEEB",
    ],
    accent: ["#00BFFF", "#1E90FF", "#4FC3F7"],
    tileBackground: "#222222",
    textColor: "#FFFFFF",
  },
  red: {
    label: "Hot Red",
    scramble: [
      "#FF1744",
      "#FF5252",
      "#D50000",
      "#FF1744",
      "#FF5252",
      "#FF8A80",
    ],
    accent: ["#FF1744", "#FF5252", "#D50000"],
    tileBackground: "#222222",
    textColor: "#FFFFFF",
  },
  purple: {
    label: "Neon Purple",
    scramble: [
      "#E040FB",
      "#AA00FF",
      "#D500F9",
      "#CE93D8",
      "#EA80FC",
      "#B388FF",
    ],
    accent: ["#E040FB", "#AA00FF", "#D500F9"],
    tileBackground: "#222222",
    textColor: "#FFFFFF",
  },
  mono: {
    label: "Monochrome",
    scramble: [
      "#CCCCCC",
      "#AAAAAA",
      "#888888",
      "#FFFFFF",
      "#DDDDDD",
      "#999999",
    ],
    accent: ["#CCCCCC", "#AAAAAA"],
    tileBackground: "#222222",
    textColor: "#FFFFFF",
  },
  custom: {
    label: "Custom Color",
    scramble: [],
    accent: [],
    tileBackground: "#222222",
    textColor: "#FFFFFF",
  },
};

// Tile style effects
export const TILE_STYLES = {
  flat: {
    label: "Flat",
    tileShadow: "none",
    tileHighlight: "none",
    splitLine: "rgba(0, 0, 0, 0.3)",
  },
  gloss: {
    label: "Gloss",
    tileShadow:
      "inset 0 1px 3px rgba(0,0,0,0.5), inset 0 -1px 1px rgba(255,255,255,0.02)",
    tileHighlight:
      "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 40%, transparent 60%)",
    splitLine: "rgba(0, 0, 0, 0.4)",
  },
  emboss: {
    label: "Emboss",
    tileShadow:
      "inset 0 2px 4px rgba(255,255,255,0.08), inset 0 -2px 4px rgba(0,0,0,0.6), 0 1px 2px rgba(0,0,0,0.4)",
    tileHighlight: "none",
    splitLine: "rgba(0, 0, 0, 0.5)",
  },
  inset: {
    label: "Inset",
    tileShadow:
      "inset 0 2px 6px rgba(0,0,0,0.7), inset 0 -1px 2px rgba(255,255,255,0.05)",
    tileHighlight: "none",
    splitLine: "rgba(0, 0, 0, 0.6)",
  },
  neon: {
    label: "Neon Glow",
    tileShadow: "inset 0 1px 3px rgba(0,0,0,0.5)",
    tileHighlight: "none",
    splitLine: "rgba(0, 0, 0, 0.2)",
    // neon glow applied via text-shadow, handled in JS
  },
};

export const MESSAGES = [
  ["", "GOD IS IN", "THE DETAILS .", "- LUDWIG MIES", ""],
  ["", "STAY HUNGRY", "STAY FOOLISH", "- STEVE JOBS", ""],
  ["", "GOOD DESIGN IS", "GOOD BUSINESS", "- THOMAS WATSON", ""],
  ["", "LESS IS MORE", "", "- MIES VAN DER ROHE", ""],
  ["", "MAKE IT SIMPLE", "BUT SIGNIFICANT", "- DON DRAPER", ""],
  ["", "HAVE NO FEAR OF", "PERFECTION", "- SALVADOR DALI", ""],
];

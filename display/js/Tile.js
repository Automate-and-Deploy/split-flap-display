import {
  CHARSET,
  SCRAMBLE_COLORS,
  SCRAMBLE_DURATION,
  FLIP_DURATION,
} from "./constants.js";

export class Tile {
  constructor(row, col) {
    this.row = row;
    this.col = col;
    this.currentChar = " ";
    this.isAnimating = false;
    this._scrambleTimer = null;
    this._delayTimer = null;
    this._generation = 0; // incremented each scrambleTo call
    this.scrambleColors = [...SCRAMBLE_COLORS];
    this.restingBackground = "#222222";
    this.restingTextColor = "#FFFFFF";

    this.el = document.createElement("div");
    this.el.className = "tile";

    this.innerEl = document.createElement("div");
    this.innerEl.className = "tile-inner";

    this.frontEl = document.createElement("div");
    this.frontEl.className = "tile-front";
    this.frontSpan = document.createElement("span");
    this.frontEl.appendChild(this.frontSpan);

    this.backEl = document.createElement("div");
    this.backEl.className = "tile-back";
    this.backSpan = document.createElement("span");
    this.backEl.appendChild(this.backSpan);

    this.innerEl.appendChild(this.frontEl);
    this.innerEl.appendChild(this.backEl);
    this.el.appendChild(this.innerEl);
  }

  setScrambleColors(colors) {
    this.scrambleColors =
      colors && colors.length > 0 ? colors : [...SCRAMBLE_COLORS];
  }

  setChar(char) {
    this.currentChar = char;
    this.frontSpan.textContent = char === " " ? "" : char;
    this.backSpan.textContent = "";
  }

  _reset() {
    if (this._delayTimer) {
      clearTimeout(this._delayTimer);
      this._delayTimer = null;
    }
    if (this._scrambleTimer) {
      clearInterval(this._scrambleTimer);
      this._scrambleTimer = null;
    }
    this.el.classList.remove("scrambling");
    this.innerEl.style.transition = "";
    this.innerEl.style.transform = "";
    this.frontEl.style.backgroundColor = this.restingBackground;
    this.frontSpan.style.color = this.restingTextColor;
    this.isAnimating = false;
  }

  scrambleTo(targetChar, delay) {
    if (targetChar === this.currentChar) return;

    this._reset();

    // New generation — any stale callbacks from previous calls will see
    // their captured gen !== this._generation and bail out.
    const gen = ++this._generation;
    this.isAnimating = true;

    this._delayTimer = setTimeout(() => {
      if (gen !== this._generation) return;
      this._delayTimer = null;
      this.el.classList.add("scrambling");

      let scrambleCount = 0;
      const maxScrambles = 10 + Math.floor(Math.random() * 4);

      this._scrambleTimer = setInterval(() => {
        if (gen !== this._generation) {
          clearInterval(this._scrambleTimer);
          this._scrambleTimer = null;
          // Stale animation — clean up
          this.frontEl.style.backgroundColor = this.restingBackground;
          this.frontSpan.style.color = this.restingTextColor;
          this.el.classList.remove("scrambling");
          return;
        }

        const randChar = CHARSET[Math.floor(Math.random() * CHARSET.length)];
        this.frontSpan.textContent = randChar === " " ? "" : randChar;

        const color =
          this.scrambleColors[scrambleCount % this.scrambleColors.length];
        this.frontEl.style.backgroundColor = color;

        if (color === "#FFFFFF" || color === "#FFCC00") {
          this.frontSpan.style.color = "#111";
        } else {
          this.frontSpan.style.color = this.restingTextColor;
        }

        scrambleCount++;

        if (scrambleCount >= maxScrambles) {
          clearInterval(this._scrambleTimer);
          this._scrambleTimer = null;

          this.frontEl.style.backgroundColor = this.restingBackground;
          this.frontSpan.style.color = this.restingTextColor;
          this.frontSpan.textContent = targetChar === " " ? "" : targetChar;

          this.innerEl.style.transition = `transform ${FLIP_DURATION}ms ease-in-out`;
          this.innerEl.style.transform = "perspective(400px) rotateX(-8deg)";

          setTimeout(() => {
            if (gen !== this._generation) return;
            this.innerEl.style.transform = "";
            setTimeout(() => {
              if (gen !== this._generation) return;
              this.innerEl.style.transition = "";
              this.el.classList.remove("scrambling");
              this.currentChar = targetChar;
              this.isAnimating = false;
            }, FLIP_DURATION);
          }, FLIP_DURATION / 2);
        }
      }, 70);
    }, delay);
  }
}

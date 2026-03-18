// ========================================================
// Broken Script – modular glyph builder
// ✅ Canvas + High-Res PNG export (2×/4×) + SVG export
// ========================================================

let ui = {};
let glyphFnsU = {};
let glyphFnsL = {};
let G = null;

// ---------- Graphics context + wrappers ----------
function setG(g) { G = g; }

function BS() { G.beginShape(); }
function ES(mode) { (mode !== undefined) ? G.endShape(mode) : G.endShape(); }
function V(x, y) { G.vertex(x, y); }
function QV(cx, cy, x, y) { G.quadraticVertex(cx, cy, x, y); }
function L(x0, y0, x1, y1) { G.line(x0, y0, x1, y1); }
function R(x, y, w, h, r) { (r !== undefined) ? G.rect(x, y, w, h, r) : G.rect(x, y, w, h); }
function NOF() { G.noFill(); }
function NS() { G.noStroke(); }
function F(v) { G.fill(v); }
function S(v) { G.stroke(v); }
function SW(w) { G.strokeWeight(w); }
function SC(cap) { G.strokeCap(cap); }
function SJ(j) { G.strokeJoin(j); }

// ---------- Setup / Draw ----------
function setup() {
  const container = document.getElementById("canvas-container");
  const containerW = Math.max(1, Math.floor(container?.clientWidth  || 800));
  const containerH = Math.max(1, Math.floor(container?.clientHeight || 1000));
  const cnv = createCanvas(containerW, containerH);
  cnv.parent(container || document.body);
  pixelDensity(2);

  initGlyphs();
  buildUI();
}

function fitCanvasToContainer() {
  const container = document.getElementById("canvas-container");
  if (!container) return;

  const w = Math.max(1, Math.floor(container.clientWidth));
  const h = Math.max(1, Math.floor(container.clientHeight));
  if (w !== width || h !== height) {
    resizeCanvas(w, h);
  }
}

function windowResized() {
  fitCanvasToContainer();
}

function draw() {
  const P = getParams();
  const str = (ui.ta && ui.ta.value !== undefined) ? ui.ta.value : "";
  drawScene(this, P, str, width, height);
}

// ---------- Params ----------
function getParams() {
  return {
    size:    Number(ui.size?.value),
    weight:  Number(ui.weight?.value),
    optical: Number(ui.optical?.value),
    autoSW:  Number(ui.autoSW?.value),
    slant:   Number(ui.slant?.value),
    arc:     Number(ui.arc?.value),
    notch:   Number(ui.notch?.value),
    chaos:   Number(ui.chaos?.value),
    track:   Number(ui.track?.value),
    line:    Number(ui.line?.value),
    seed:    Number(ui.seed?.value) | 0,
  };
}

// ---------- Optical stroke ----------
function computeStrokeNorm(P) {
  let sw = P.weight / max(1, P.size);

  const optical = constrain(P.optical ?? 0, 0, 1);
  const scaleRef = 140;
  const ratio = max(0.25, P.size / scaleRef);
  const exp = lerp(0.0, 0.35, optical);
  sw *= pow(ratio, -exp);

  const autoSW = constrain(P.autoSW ?? 0, 0, 1);
  const minSW = lerp(0.15, 0.25, autoSW);
  const maxSW = lerp(0.60, 0.42, autoSW);
  sw = constrain(sw, minSW, maxSW);

  if (!isFinite(sw) || sw <= 0) sw = 0.25;
  return sw;
}

// ---------- Scene / Layout ----------
// w, h are the logical canvas dimensions (pixels at scale=1).
// Always pass them explicitly so exports match the live canvas exactly.
function drawScene(g, P, str, w, h) {
  setG(g);

  // fall back to the live canvas size when called from draw()
  if (w === undefined) w = width;
  if (h === undefined) h = height;

  G.background(255);

  // proportional padding – looks the same at every export scale
  const pad  = w * 0.04;
  const padV = h * 0.06;

  const x0   = pad;
  const y0   = padV + P.size;          // one em below top padding
  const maxW = w - 2 * pad;
  const maxH = h - padV - P.size * 0.5;

  drawTextG(str, x0, y0, maxW, maxH, P);
}

function drawTextG(str, x, y, maxW, maxH, P) {
  const lines = str.replace(/\r/g, "").split("\n");

  let penY = y;
  const em = P.size;
  const lineH = em * P.line;

  for (let li = 0; li < lines.length; li++) {
    let penX = x;
    const line = lines[li];

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];

      if (ch === " ") { penX += em * 0.38; continue; }

      if (penX > x + maxW - em * 0.6) { penX = x; penY += lineH; }
      if (penY > y + maxH) return;

      const w = drawGlyphG(ch, penX, penY, P);
      penX += w + em * P.track;
    }

    penY += lineH;
  }
}

function drawGlyphG(ch, x, y, P) {
  G.push();
  G.translate(x, y);
  G.scale(P.size);

  S(0);
  SW(computeStrokeNorm(P));
  SC(SQUARE);
  SJ(MITER);
  NOF();

  const code = ch.codePointAt(0) || 0;
  const rng = makeRng(P.seed * 1337 + code * 97);

  G.applyMatrix(1, 0, P.slant, 1, 0, 0);

  let adv = 0.62;
  const fnU = glyphFnsU[ch];
  const fnL = glyphFnsL[ch];

  if (fnU) adv = fnU(P, rng);
  else if (fnL) adv = fnL(P, rng);
  else if (isDigit(ch)) adv = drawDigit(ch, P, rng);
  else adv = drawFallback(ch);

  G.pop();
  return adv * P.size;
}

function isDigit(ch) { return ch >= "0" && ch <= "9"; }

// ========================================================
// UI
// ========================================================

function buildUI() {
  const byId = (id) => document.getElementById(id);
  const controlsSection = byId("controls");
  const controlsToggle = byId("controls-toggle");

  const linkValue = (inputId, valueId) => {
    const input = byId(inputId);
    const value = byId(valueId);
    if (!input || !value) return;
    const sync = () => (value.textContent = input.value);
    input.addEventListener("input", sync);
    sync();
  };

  ui.ta     = byId("ui-textarea");
  ui.size   = byId("ui-size");
  ui.weight = byId("ui-weight");
  ui.optical= byId("ui-optical");
  ui.autoSW = byId("ui-autosw");
  ui.slant  = byId("ui-slant");
  ui.arc    = byId("ui-arc");
  ui.notch  = byId("ui-notch");
  ui.chaos  = byId("ui-chaos");
  ui.track  = byId("ui-track");
  ui.line   = byId("ui-line");
  ui.seed   = byId("ui-seed");

  linkValue("ui-size",    "ui-size-value");
  linkValue("ui-weight",  "ui-weight-value");
  linkValue("ui-optical", "ui-optical-value");
  linkValue("ui-autosw",  "ui-autosw-value");
  linkValue("ui-slant",   "ui-slant-value");
  linkValue("ui-arc",     "ui-arc-value");
  linkValue("ui-notch",   "ui-notch-value");
  linkValue("ui-chaos",   "ui-chaos-value");
  linkValue("ui-track",   "ui-track-value");
  linkValue("ui-line",    "ui-line-value");
  linkValue("ui-seed",    "ui-seed-value");

  ui.btnPNG4 = byId("ui-btn-png-4");
  ui.btnPNG2 = byId("ui-btn-png-2");
  ui.btnSVG  = byId("ui-btn-svg");

  if (ui.btnPNG4) ui.btnPNG4.addEventListener("click", () => downloadPNG(4));
  if (ui.btnPNG2) ui.btnPNG2.addEventListener("click", () => downloadPNG(2));
  if (ui.btnSVG)  ui.btnSVG.addEventListener("click",  downloadSVG);

  if (controlsSection && controlsToggle) {
    const setControlsOpen = (open) => {
      controlsSection.classList.toggle("open", open);
      controlsToggle.setAttribute("aria-expanded", open ? "true" : "false");
      controlsToggle.textContent = open ? "Close Controls" : "Open Controls";
    };

    setControlsOpen(true);

    controlsToggle.addEventListener("click", () => {
      setControlsOpen(!controlsSection.classList.contains("open"));
    });
  }

}

// ========================================================
// Exports
// ========================================================

function downloadPNG(scale = 4) {
  const P   = getParams();
  const str = (ui.ta && ui.ta.value !== undefined) ? ui.ta.value : "";

  // Export based on the live canvas size so output always matches displayed size.
  const logW = width;
  const logH = height;

  const pg = createGraphics(logW * scale, logH * scale);
  pg.pixelDensity(1);
  pg.scale(scale);   // everything drawn at logical coords × scale

  // Pass the logical size so drawScene's proportional layout matches exactly.
  drawScene(pg, P, str, logW, logH);

  const filename = `brokenscript_${logW}x${logH}_${scale}x.png`;
  const url = pg.canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  pg.remove();
}

function downloadSVG() {
  if (typeof SVG === "undefined") {
    alert("SVG export needs p5.js-svg. In p5 Web Editor: Sketch → Add Library → search 'p5.js-svg'.");
    return;
  }

  const P   = getParams();
  const str = (ui.ta && ui.ta.value !== undefined) ? ui.ta.value : "";

  const svg = createGraphics(width, height, SVG);
  svg.pixelDensity(1);

  drawScene(svg, P, str, width, height);

  save(svg, `brokenscript_${width}x${height}.svg`);
  svg.remove();
}

// ========================================================
// Baukasten (Modular parts)
// ========================================================

function jitter(rng, s) { return (rng() * 2 - 1) * s; }

function stem(x, y0, y1, P, rng, opts = {}) {
  const c = 0.08 * P.arc;
  const j = P.chaos * 0.10;

  const x0 = x + jitter(rng, j);
  const x1 = x + jitter(rng, j);
  const cx = x + c + jitter(rng, j);

  const nb  = P.notch * 0.18;
  const mid = lerp(y0, y1, 0.55);

  BS(); V(x0, y0); QV(cx, lerp(y0, mid, 0.35), x1, mid - nb); ES();
  BS(); V(x1, mid + nb); QV(cx - c * 0.7, lerp(mid, y1, 0.55), x0, y1); ES();

  if (opts.foot) foot(x0, y1, P, rng);
  if (opts.head) head(x0, y0, P, rng);
}

function head(x, y, P, rng) {
  const j = P.chaos * 0.06;
  const w = 0.12 + 0.05 * P.arc;
  const h = 0.08;
  L(x - w + jitter(rng, j), y + h + jitter(rng, j), x + 0.02 + jitter(rng, j), y + jitter(rng, j));
}

function foot(x, y, P, rng) {
  const j = P.chaos * 0.06;
  const w = 0.14 + 0.06 * P.arc;
  const r = 0.08 + 0.06 * P.arc;
  BS();
  V(x + jitter(rng, j), y + jitter(rng, j));
  QV(x - w, y + r, x - w * 0.1, y + r * 1.15);
  ES();
}

function bowl(cx, cy, rx, ry, a0, a1, P, rng) {
  const steps = 18;
  const j     = P.chaos * 0.03;
  const tooth = 0.0 + P.notch * 0.018;

  BS();
  for (let i = 0; i <= steps; i++) {
    const t   = i / steps;
    const a   = lerp(a0, a1, t);
    const rrx = rx * (1 + jitter(rng, j));
    const rry = ry * (1 + jitter(rng, j));
    let x = cx + cos(a) * rrx;
    let y = cy + sin(a) * rry;
    if (i % 2 === 0) { x += cos(a + HALF_PI) * tooth; y += sin(a + HALF_PI) * tooth; }
    V(x, y);
  }
  ES();
}

function knot(x, y, P, rng) {
  const j = P.chaos * 0.04;
  const s = 0.06 + 0.02 * P.arc;
  BS();
  V(x + jitter(rng, j), y - s);
  V(x + s, y + jitter(rng, j));
  V(x + jitter(rng, j), y + s);
  V(x - s, y + jitter(rng, j));
  ES(CLOSE);
}

function hair(x0, y0, x1, y1, P, rng) {
  G.push();
  const w = max(0.6, computeStrokeNorm(P) * 0.45);
  SW(w);
  const j = P.chaos * 0.04;
  L(x0 + jitter(rng, j), y0 + jitter(rng, j), x1 + jitter(rng, j), y1 + jitter(rng, j));
  G.pop();
}

function cross(x0, y0, x1, y1, P, rng) {
  const j = P.chaos * 0.05;
  L(x0 + jitter(rng, j), y0 + jitter(rng, j), x1 + jitter(rng, j), y1 + jitter(rng, j));
}

// ========================================================
// Glyphs (A–Z + a–z + extras)
// ========================================================

function initGlyphs() {
  // -------- uppercase A–Z --------

  glyphFnsU["Â"] = (P, rng) => {
    stem(0.12, -1.02, 0.02, P, rng, { foot: true, head: true });
    stem(0.58, -1.02, 0.02, P, rng, { foot: true, head: true });
    cross(0.17, -0.55, 0.53, -0.62, P, rng);
    hair(0.10, -0.95, 0.22, -1.05, P, rng);
    return 0.72;
  };

  glyphFnsU["A"] = (P, rng) => {
    stem(0.10, -1.05, 0.02, P, rng, { foot: true, head: true });
    stem(0.60, -1.05, 0.02, P, rng, { foot: true, head: true });
    const j = P.chaos * 0.06;
    cross(0.20 + jitter(rng, j), -0.50 + jitter(rng, j), 0.54 + jitter(rng, j), -0.52 + jitter(rng, j), P, rng);
    hair(0.30, -0.98, 0.44, -1.14, P, rng);
    return 0.74;
  };

  glyphFnsU["B"] = (P, rng) => {
    stem(0.16, -1.05, 0.02, P, rng, { foot: true, head: true });
    bowl(0.40, -0.78, 0.22 * P.arc, 0.18 * P.arc, -PI * 0.55, PI * 0.55, P, rng);
    bowl(0.42, -0.28, 0.24 * P.arc, 0.22 * P.arc, -PI * 0.55, PI * 0.60, P, rng);
    knot(0.30, -0.54, P, rng);
    return 0.70;
  };

  glyphFnsU["C"] = (P, rng) => {
    bowl(0.44, -0.52, 0.30 * P.arc, 0.46 * P.arc, PI * 0.25, PI * 1.75, P, rng);
    hair(0.25, -0.96, 0.38, -1.03, P, rng);
    hair(0.27, -0.08, 0.40, 0.02, P, rng);
    return 0.68;
  };

  glyphFnsU["D"] = (P, rng) => {
    stem(0.16, -1.05, 0.02, P, rng, { foot: true, head: true });
    bowl(0.34, -0.52, 0.34 * P.arc, 0.52 * P.arc, -HALF_PI, HALF_PI, P, rng);
    return 0.74;
  };

  glyphFnsU["E"] = (P, rng) => {
    stem(0.16, -1.05, 0.02, P, rng, { foot: true, head: true });
    cross(0.18, -1.03, 0.56, -1.03, P, rng);
    cross(0.20, -0.56, 0.48, -0.56, P, rng);
    cross(0.18, 0.02, 0.60, 0.02, P, rng);
    return 0.68;
  };

  glyphFnsU["F"] = (P, rng) => {
    stem(0.16, -1.05, 0.02, P, rng, { foot: true, head: true });
    cross(0.18, -1.03, 0.58, -1.03, P, rng);
    cross(0.20, -0.56, 0.50, -0.56, P, rng);
    return 0.66;
  };

  glyphFnsU["G"] = (P, rng) => {
    bowl(0.44, -0.52, 0.30 * P.arc, 0.46 * P.arc, PI * 0.25, PI * 1.82, P, rng);
    cross(0.44, -0.40, 0.62, -0.35, P, rng);
    stem(0.60, -0.35, 0.02, P, rng, { foot: true, head: false });
    return 0.78;
  };

  glyphFnsU["H"] = (P, rng) => {
    stem(0.14, -1.05, 0.02, P, rng, { foot: true, head: true });
    stem(0.58, -1.05, 0.02, P, rng, { foot: true, head: true });
    cross(0.18, -0.55, 0.56, -0.55, P, rng);
    return 0.74;
  };

  glyphFnsU["I"] = (P, rng) => {
    stem(0.28, -1.05, 0.02, P, rng, { foot: true, head: true });
    return 0.48;
  };

  glyphFnsU["J"] = (P, rng) => {
    stem(0.36, -1.05, -0.10, P, rng, { foot: false, head: true });
    bowl(0.22, -0.06, 0.22 * P.arc, 0.18 * P.arc, 0, PI * 0.95, P, rng);
    return 0.60;
  };

  glyphFnsU["K"] = (P, rng) => {
    stem(0.16, -1.05, 0.02, P, rng, { foot: true, head: true });
    cross(0.20, -0.55, 0.60, -1.02, P, rng);
    cross(0.22, -0.55, 0.62, 0.02, P, rng);
    knot(0.30, -0.55, P, rng);
    return 0.72;
  };

  glyphFnsU["L"] = (P, rng) => {
    stem(0.18, -1.05, 0.02, P, rng, { foot: true, head: true });
    cross(0.18, 0.02, 0.62, 0.02, P, rng);
    return 0.66;
  };

  glyphFnsU["M"] = (P, rng) => {
    stem(0.07, -1.05, 0.02, P, rng, { foot: true, head: true });
    stem(0.67, -1.05, 0.02, P, rng, { foot: true, head: true });
    stem(0.37, -0.85, 0.02, P, rng, { foot: true, head: true });
    hair(0.12, -1.02, 0.37, -0.78, P, rng);
    hair(0.62, -1.02, 0.37, -0.78, P, rng);
    return 0.85;
  };

  glyphFnsU["N"] = (P, rng) => {
    stem(0.14, -1.05, 0.02, P, rng, { foot: true, head: true });
    stem(0.62, -1.05, 0.02, P, rng, { foot: true, head: true });
    cross(0.18, -1.02, 0.60, 0.02, P, rng);
    return 0.76;
  };

  glyphFnsU["O"] = (P, rng) => {
    bowl(0.42, -0.52, 0.32 * P.arc, 0.50 * P.arc, 0, TWO_PI, P, rng);
    knot(0.54, -0.82, P, rng);
    return 0.78;
  };

  glyphFnsU["P"] = (P, rng) => {
    stem(0.16, -1.05, 0.02, P, rng, { foot: true, head: true });
    bowl(0.40, -0.78, 0.26 * P.arc, 0.22 * P.arc, -PI * 0.55, PI * 0.60, P, rng);
    knot(0.28, -0.60, P, rng);
    return 0.70;
  };

  glyphFnsU["Q"] = (P, rng) => {
    bowl(0.42, -0.52, 0.32 * P.arc, 0.50 * P.arc, 0, TWO_PI, P, rng);
    cross(0.52, -0.12, 0.70, 0.06, P, rng);
    return 0.82;
  };

  glyphFnsU["R"] = (P, rng) => {
    stem(0.16, -1.05, 0.02, P, rng, { foot: true, head: true });
    bowl(0.40, -0.78, 0.26 * P.arc, 0.22 * P.arc, -PI * 0.55, PI * 0.60, P, rng);
    cross(0.28, -0.56, 0.66, 0.02, P, rng);
    knot(0.28, -0.58, P, rng);
    return 0.74;
  };

  glyphFnsU["Ŝ"] = (P, rng) => {
    bowl(0.42, -0.80, 0.26 * P.arc, 0.22 * P.arc, PI * 1.1, PI * 2.1, P, rng);
    bowl(0.42, -0.25, 0.28 * P.arc, 0.26 * P.arc, -PI * 0.05, PI * 0.95, P, rng);
    cross(0.22, -0.52, 0.58, -0.52, P, rng);
    return 0.70;
  };

  glyphFnsL["ŝ"] = (P, rng) => {
    const xh = -0.62;
    bowl(0.30, xh + 0.10, 0.18 * P.arc, 0.16 * P.arc, PI * 1.0, PI * 2.1, P, rng);
    bowl(0.30, xh + 0.34, 0.18 * P.arc, 0.16 * P.arc, -PI * 0.05, PI * 1.0, P, rng);
    return 0.56;
  };

  glyphFnsU["S"] = (P, rng) => {
    const j = P.chaos * 0.04;
    bowl(0.44 + jitter(rng, j), -0.82 + jitter(rng, j), 0.30 * P.arc, 0.24 * P.arc, PI * 1.15, PI * 2.05, P, rng);
    bowl(0.42 + jitter(rng, j), -0.22 + jitter(rng, j), 0.32 * P.arc, 0.28 * P.arc, -PI * 0.15, PI * 0.95, P, rng);
    cross(0.26 + jitter(rng, j), -0.62 + jitter(rng, j), 0.52 + jitter(rng, j), -0.42 + jitter(rng, j), P, rng);
    cross(0.54 + jitter(rng, j), -0.36 + jitter(rng, j), 0.60 + jitter(rng, j), -0.30 + jitter(rng, j), P, rng);
    return 0.72;
  };

  glyphFnsU["T"] = (P, rng) => {
    stem(0.34, -1.05, 0.02, P, rng, { foot: true, head: true });
    cross(0.14, -1.03, 0.64, -1.03, P, rng);
    return 0.72;
  };

  glyphFnsU["U"] = (P, rng) => {
    stem(0.14, -1.05, -0.12, P, rng, { foot: false, head: true });
    stem(0.60, -1.05, -0.12, P, rng, { foot: false, head: true });
    bowl(0.37, -0.10, 0.26 * P.arc, 0.20 * P.arc, 0, PI, P, rng);
    return 0.76;
  };

  glyphFnsU["V"] = (P, rng) => {
    cross(0.14, -1.05, 0.38, 0.02, P, rng);
    cross(0.62, -1.05, 0.38, 0.02, P, rng);
    foot(0.38, 0.02, P, rng);
    return 0.72;
  };

  glyphFnsU["W"] = (P, rng) => {
    cross(0.12, -1.05, 0.30, 0.02, P, rng);
    cross(0.48, -1.05, 0.30, 0.02, P, rng);
    cross(0.48, -1.05, 0.66, 0.02, P, rng);
    cross(0.84, -1.05, 0.66, 0.02, P, rng);
    return 0.92;
  };

  glyphFnsU["X"] = (P, rng) => {
    cross(0.14, -1.05, 0.62, 0.02, P, rng);
    cross(0.62, -1.05, 0.14, 0.02, P, rng);
    knot(0.38, -0.52, P, rng);
    return 0.76;
  };

  glyphFnsU["Y"] = (P, rng) => {
    cross(0.14, -1.05, 0.38, -0.52, P, rng);
    cross(0.62, -1.05, 0.38, -0.52, P, rng);
    stem(0.38, -0.52, 0.02, P, rng, { foot: true, head: false });
    return 0.74;
  };

  glyphFnsU["Z"] = (P, rng) => {
    cross(0.14, -1.03, 0.64, -1.03, P, rng);
    cross(0.62, -1.02, 0.16, 0.02, P, rng);
    cross(0.14, 0.02, 0.66, 0.02, P, rng);
    return 0.74;
  };

  // -------- lowercase a–z --------
  const xh   = -0.62;
  const base =  0.02;

  glyphFnsL["a"] = (P, rng) => { bowl(0.30, xh + 0.22, 0.20 * P.arc, 0.22 * P.arc, 0, TWO_PI, P, rng); stem(0.52, xh, base, P, rng, { foot: true, head: false }); return 0.66; };
  glyphFnsL["b"] = (P, rng) => { stem(0.18, -1.05, base, P, rng, { foot: true, head: true }); bowl(0.40, xh + 0.20, 0.22 * P.arc, 0.24 * P.arc, -PI * 0.55, PI * 0.60, P, rng); return 0.64; };
  glyphFnsL["c"] = (P, rng) => { bowl(0.34, xh + 0.22, 0.22 * P.arc, 0.24 * P.arc, PI * 0.25, PI * 1.75, P, rng); return 0.56; };
  glyphFnsL["d"] = (P, rng) => { stem(0.50, -1.05, base, P, rng, { foot: true, head: true }); bowl(0.30, xh + 0.22, 0.22 * P.arc, 0.24 * P.arc, 0, TWO_PI, P, rng); return 0.68; };
  glyphFnsL["e"] = (P, rng) => { bowl(0.32, xh + 0.22, 0.22 * P.arc, 0.22 * P.arc, PI * 0.15, PI * 1.95, P, rng); cross(0.18, xh + 0.22, 0.48, xh + 0.22, P, rng); return 0.58; };

  glyphFnsL["f"] = (P, rng) => {
    stem(0.16, -1.05, base, P, rng, { foot: true, head: false });
    cross(0.02, -0.90, 0.38, -0.84, P, rng);
    cross(-0.02, xh + 0.12, 0.40, xh + 0.04, P, rng);
    return 0.45;
  };

  glyphFnsL["g"] = (P, rng) => { bowl(0.30, xh + 0.22, 0.22 * P.arc, 0.24 * P.arc, 0, TWO_PI, P, rng); stem(0.52, xh, 0.42, P, rng, { foot: true, head: false }); bowl(0.32, 0.34, 0.20 * P.arc, 0.16 * P.arc, 0, PI, P, rng); return 0.66; };
  glyphFnsL["h"] = (P, rng) => { stem(0.18, -1.05, base, P, rng, { foot: true, head: true }); stem(0.52, xh, base, P, rng, { foot: true, head: false }); bowl(0.40, xh + 0.10, 0.18 * P.arc, 0.16 * P.arc, PI, TWO_PI, P, rng); return 0.66; };
  glyphFnsL["i"] = (P, rng) => { stem(0.26, xh, base, P, rng, { foot: true, head: false }); knot(0.26, xh - 0.18, P, rng); return 0.38; };
  glyphFnsL["j"] = (P, rng) => { stem(0.26, xh, 0.42, P, rng, { foot: false, head: false }); bowl(0.18, 0.36, 0.20 * P.arc, 0.14 * P.arc, 0, PI, P, rng); knot(0.26, xh - 0.18, P, rng); return 0.40; };
  glyphFnsL["k"] = (P, rng) => { stem(0.18, -1.05, base, P, rng, { foot: true, head: true }); cross(0.22, xh + 0.10, 0.56, xh - 0.25, P, rng); cross(0.22, xh + 0.10, 0.58, base, P, rng); return 0.62; };
  glyphFnsL["l"] = (P, rng) => { stem(0.24, -1.05, base, P, rng, { foot: true, head: true }); return 0.38; };
  glyphFnsL["m"] = (P, rng) => { stem(0.14, xh, base, P, rng, { foot: true, head: false }); stem(0.42, xh, base, P, rng, { foot: true, head: false }); stem(0.70, xh, base, P, rng, { foot: true, head: false }); bowl(0.28, xh + 0.10, 0.14 * P.arc, 0.12 * P.arc, PI, TWO_PI, P, rng); bowl(0.56, xh + 0.10, 0.14 * P.arc, 0.12 * P.arc, PI, TWO_PI, P, rng); return 0.88; };
  glyphFnsL["n"] = (P, rng) => { stem(0.16, xh, base, P, rng, { foot: true, head: false }); stem(0.52, xh, base, P, rng, { foot: true, head: false }); bowl(0.34, xh + 0.10, 0.18 * P.arc, 0.16 * P.arc, PI, TWO_PI, P, rng); return 0.66; };
  glyphFnsL["o"] = (P, rng) => { bowl(0.32, xh + 0.22, 0.22 * P.arc, 0.24 * P.arc, 0, TWO_PI, P, rng); return 0.62; };
  glyphFnsL["p"] = (P, rng) => { stem(0.18, xh, 0.44, P, rng, { foot: false, head: false }); bowl(0.40, xh + 0.20, 0.22 * P.arc, 0.24 * P.arc, -PI * 0.55, PI * 0.60, P, rng); return 0.64; };
  glyphFnsL["q"] = (P, rng) => { bowl(0.30, xh + 0.22, 0.22 * P.arc, 0.24 * P.arc, 0, TWO_PI, P, rng); stem(0.52, xh, 0.44, P, rng, { foot: false, head: false }); return 0.66; };
  glyphFnsL["r"] = (P, rng) => { stem(0.18, xh, base, P, rng, { foot: true, head: false }); bowl(0.34, xh + 0.10, 0.16 * P.arc, 0.14 * P.arc, PI, TWO_PI, P, rng); return 0.50; };

  glyphFnsL["s"] = (P, rng) => {
    const j = P.chaos * 0.035;
    bowl(0.45 + jitter(rng, j), xh + 0.12 + jitter(rng, j), 0.20 * P.arc, 0.18 * P.arc, PI * 1.00, PI * 2.02, P, rng);
    bowl(0.30 + jitter(rng, j), xh + 0.36 + jitter(rng, j), 0.22 * P.arc, 0.20 * P.arc, -PI * 0.12, PI * 0.92, P, rng);
    return 0.59;
  };

  glyphFnsL["t"] = (P, rng) => { stem(0.26, -0.92, base, P, rng, { foot: true, head: true }); cross(0.10, xh + 0.05, 0.46, xh + 0.05, P, rng); return 0.52; };
  glyphFnsL["u"] = (P, rng) => { stem(0.16, xh, -0.08, P, rng, { foot: false, head: false }); stem(0.52, xh, -0.08, P, rng, { foot: false, head: false }); bowl(0.34, -0.06, 0.18 * P.arc, 0.14 * P.arc, 0, PI, P, rng); return 0.66; };
  glyphFnsL["v"] = (P, rng) => { cross(0.14, xh, 0.32, 0.02, P, rng); cross(0.52, xh, 0.32, 0.02, P, rng); foot(0.32, 0.02, P, rng); return 0.62; };
  glyphFnsL["w"] = (P, rng) => { cross(0.12, xh, 0.26, 0.02, P, rng); cross(0.40, xh, 0.26, 0.02, P, rng); cross(0.40, xh, 0.54, 0.02, P, rng); cross(0.68, xh, 0.54, 0.02, P, rng); return 0.82; };
  glyphFnsL["x"] = (P, rng) => { cross(0.14, xh, 0.52, 0.02, P, rng); cross(0.52, xh, 0.14, 0.02, P, rng); knot(0.33, xh + 0.22, P, rng); return 0.62; };
  glyphFnsL["y"] = (P, rng) => { cross(0.14, xh, 0.32, -0.06, P, rng); cross(0.52, xh, 0.32, -0.06, P, rng); stem(0.32, -0.06, 0.44, P, rng, { foot: false, head: false }); bowl(0.20, 0.36, 0.18 * P.arc, 0.12 * P.arc, 0, PI, P, rng); return 0.62; };
  glyphFnsL["z"] = (P, rng) => { cross(0.14, xh, 0.54, xh, P, rng); cross(0.52, xh, 0.16, 0.02, P, rng); cross(0.14, 0.02, 0.56, 0.02, P, rng); return 0.60; };

  // ======================================================
  // Extras
  // ======================================================

  glyphFnsL["."] = (P, rng) => {
    const j = P.chaos * 0.04;
    const x = 0.30 + jitter(rng, j);
    const y = 0.02 + jitter(rng, j);
    const s = 0.06 + 0.02 * P.arc;
    BS(); V(x, y - s); V(x + s, y); V(x, y + s); V(x - s, y); ES(CLOSE);
    return 0.34;
  };

  glyphFnsL[";"] = (P, rng) => {
    glyphFnsL["."](P, rng);
    const j = P.chaos * 0.05;
    bowl(0.30, 0.16 + jitter(rng, j), 0.10 * P.arc, 0.12 * P.arc, -PI * 0.15, PI * 0.85, P, rng);
    hair(0.32, 0.20, 0.26, 0.34, P, rng);
    return 0.40;
  };

  glyphFnsL[","] = (P, rng) => {
    const j = P.chaos * 0.045;
    const x = 0.30 + jitter(rng, j);
    const y = 0.06 + jitter(rng, j);
    const s = 0.06 + 0.02 * P.arc;
    BS(); V(x, y - s); V(x + s, y); V(x, y + s); V(x - s, y); ES(CLOSE);
    bowl(0.30 + jitter(rng, j), 0.16 + jitter(rng, j), 0.09 * P.arc, 0.12 * P.arc, -PI * 0.10, PI * 0.70, P, rng);
    cross(0.30 + jitter(rng, j), 0.18 + jitter(rng, j), 0.26 + jitter(rng, j), 0.32 + jitter(rng, j), P, rng);
    return 0.34;
  };

  glyphFnsL["?"] = (P, rng) => {
    const j = P.chaos * 0.05;
    bowl(0.34, -0.72, 0.18 * P.arc, 0.18 * P.arc, PI * 1.05, PI * 2.15, P, rng);
    cross(0.50, -0.70, 0.26, -0.44, P, rng);
    stem(0.26 + jitter(rng, j), -0.44, -0.22, P, rng, { foot: false, head: false });
    glyphFnsL["."](P, rng);
    return 0.64;
  };

  glyphFnsL["!"] = (P, rng) => {
    stem(0.28, -1.02, -0.18, P, rng, { foot: false, head: true });
    glyphFnsL["."](P, rng);
    return 0.44;
  };

  glyphFnsL["+"] = (P, rng) => {
    cross(0.12, -0.50, 0.60, -0.50, P, rng);
    cross(0.36, -0.82, 0.36, -0.18, P, rng);
    return 0.70;
  };

  glyphFnsL["="] = (P, rng) => {
    cross(0.14, -0.62, 0.62, -0.62, P, rng);
    cross(0.14, -0.34, 0.62, -0.34, P, rng);
    return 0.70;
  };

  glyphFnsL["€"] = (P, rng) => {
    const j = P.chaos * 0.04;
    bowl(0.40 + jitter(rng, j), -0.52 + jitter(rng, j), 0.28 * P.arc, 0.46 * P.arc, PI * 0.25, PI * 1.78, P, rng);
    cross(0.18 + jitter(rng, j), -0.64 + jitter(rng, j), 0.56 + jitter(rng, j), -0.64 + jitter(rng, j), P, rng);
    cross(0.18 + jitter(rng, j), -0.40 + jitter(rng, j), 0.54 + jitter(rng, j), -0.40 + jitter(rng, j), P, rng);
    hair(0.24, -0.96, 0.36, -1.02, P, rng);
    hair(0.24, -0.10, 0.36, -0.04, P, rng);
    return 0.76;
  };

  glyphFnsL["₠"] = (P, rng) => {
    const j = P.chaos * 0.035;
    bowl(0.40 + jitter(rng, j), -0.52 + jitter(rng, j), 0.30 * P.arc, 0.48 * P.arc, PI * 0.05, TWO_PI * 0.98, P, rng);
    cross(0.12 + jitter(rng, j), -0.62 + jitter(rng, j), 0.22 + jitter(rng, j), -0.74 + jitter(rng, j), P, rng);
    cross(0.16 + jitter(rng, j), -0.64 + jitter(rng, j), 0.58 + jitter(rng, j), -0.64 + jitter(rng, j), P, rng);
    cross(0.18 + jitter(rng, j), -0.40 + jitter(rng, j), 0.56 + jitter(rng, j), -0.40 + jitter(rng, j), P, rng);
    hair(0.28, -0.98, 0.40, -1.04, P, rng);
    return 0.80;
  };

  glyphFnsL["¢"] = (P, rng) => {
    const j = P.chaos * 0.04;
    bowl(0.34 + jitter(rng, j), xh + 0.22 + jitter(rng, j), 0.22 * P.arc, 0.24 * P.arc, PI * 0.25, PI * 1.75, P, rng);
    stem(0.34 + jitter(rng, j), xh - 0.10, 0.18, P, rng, { foot: false, head: false });
    return 0.62;
  };

  glyphFnsL[":"] = (P, rng) => {
    const j = P.chaos * 0.04;
    const s = 0.06 + 0.02 * P.arc;
    const dot = (y) => {
      const x = 0.30 + jitter(rng, j);
      BS(); V(x, y - s); V(x + s, y); V(x, y + s); V(x - s, y); ES(CLOSE);
    };
    dot(-0.56 + jitter(rng, j));
    dot(-0.20 + jitter(rng, j));
    return 0.34;
  };

  glyphFnsL["–"] = (P, rng) => {
    const j = P.chaos * 0.03;
    cross(0.14 + jitter(rng, j), -0.46 + jitter(rng, j), 0.66 + jitter(rng, j), -0.52 + jitter(rng, j), P, rng);
    return 0.78;
  };

  glyphFnsL["*"] = (P, rng) => {
    const cx = 0.34, cy = -0.52;
    const r = 0.22 + 0.08 * P.arc;
    for (let k = 0; k < 6; k++) {
      const a = (TWO_PI / 6) * k;
      cross(cx, cy, cx + cos(a) * r, cy + sin(a) * r, P, rng);
    }
    knot(cx, cy, P, rng);
    return 0.72;
  };

  glyphFnsL["&"] = (P, rng) => {
    bowl(0.34, -0.66, 0.22 * P.arc, 0.20 * P.arc, 0, TWO_PI, P, rng);
    bowl(0.34, -0.28, 0.26 * P.arc, 0.22 * P.arc, -PI * 0.10, PI * 1.05, P, rng);
    cross(0.52, -0.58, 0.18, 0.02, P, rng);
    hair(0.42, -0.10, 0.62, 0.08, P, rng);
    return 0.78;
  };

  glyphFnsL["§"] = (P, rng) => {
    bowl(0.34, -0.74, 0.22 * P.arc, 0.18 * P.arc, PI * 1.05, PI * 2.15, P, rng);
    bowl(0.34, -0.32, 0.24 * P.arc, 0.20 * P.arc, -PI * 0.15, PI * 0.95, P, rng);
    cross(0.20, -0.52, 0.56, -0.52, P, rng);
    bowl(0.34, -0.12, 0.22 * P.arc, 0.18 * P.arc, PI * 1.05, PI * 2.15, P, rng);
    bowl(0.34, 0.30, 0.24 * P.arc, 0.20 * P.arc, -PI * 0.15, PI * 0.95, P, rng);
    return 0.72;
  };

  glyphFnsL["%"] = (P, rng) => {
    cross(0.58, -0.98, 0.18, 0.02, P, rng);
    bowl(0.22, -0.78, 0.12 * P.arc, 0.16 * P.arc, 0, TWO_PI, P, rng);
    bowl(0.54, -0.18, 0.14 * P.arc, 0.18 * P.arc, 0, TWO_PI, P, rng);
    return 0.78;
  };

  glyphFnsL["@"] = (P, rng) => {
    bowl(0.32, -0.42, 0.20 * P.arc, 0.22 * P.arc, 0, TWO_PI, P, rng);
    stem(0.54, -0.62, 0.02, P, rng, { foot: true, head: false });
    bowl(0.36, -0.50, 0.34 * P.arc, 0.48 * P.arc, PI * 0.10, TWO_PI * 0.98, P, rng);
    hair(0.64, -0.10, 0.70, -0.02, P, rng);
    return 0.88;
  };

  glyphFnsL["—"] = (P, rng) => {
    const j = P.chaos * 0.03;
    cross(0.08 + jitter(rng, j), -0.46 + jitter(rng, j), 0.92 + jitter(rng, j), -0.54 + jitter(rng, j), P, rng);
    return 1.02;
  };

  // ---- umlaut helper ----
  function umlautDots(x1, x2, y, P, rng) {
    const j = P.chaos * 0.03;
    const s = 0.05 + 0.02 * P.arc;
    const dot = (x) => {
      BS();
      V(x + jitter(rng, j), y - s);
      V(x + s, y + jitter(rng, j));
      V(x + jitter(rng, j), y + s);
      V(x - s, y + jitter(rng, j));
      ES(CLOSE);
    };
    dot(x1);
    dot(x2);
  }

  glyphFnsL["ä"] = (P, rng) => { const adv = glyphFnsL["a"](P, rng); umlautDots(0.22, 0.40, -0.98, P, rng); return adv; };
  glyphFnsL["ö"] = (P, rng) => { const adv = glyphFnsL["o"](P, rng); umlautDots(0.20, 0.44, -0.98, P, rng); return adv; };
  glyphFnsL["ü"] = (P, rng) => { const adv = glyphFnsL["u"](P, rng); umlautDots(0.18, 0.40, -0.98, P, rng); return adv; };

  glyphFnsU["Ä"] = (P, rng) => { const adv = glyphFnsU["A"](P, rng); umlautDots(0.24, 0.46, -1.24, P, rng); return adv; };
  glyphFnsU["Ö"] = (P, rng) => { const adv = glyphFnsU["O"](P, rng); umlautDots(0.26, 0.52, -1.24, P, rng); return adv; };
  glyphFnsU["Ü"] = (P, rng) => { const adv = glyphFnsU["U"](P, rng); umlautDots(0.24, 0.46, -1.24, P, rng); return adv; };

  glyphFnsL["ß"] = (P, rng) => {
    stem(0.20, -1.05, 0.02, P, rng, { foot: true, head: true });
    bowl(0.42, -0.70, 0.18 * P.arc, 0.20 * P.arc, PI * 0.9, PI * 2.1, P, rng);
    bowl(0.40, -0.24, 0.22 * P.arc, 0.22 * P.arc, -PI * 0.10, PI * 1.05, P, rng);
    hair(0.46, -0.06, 0.62, 0.02, P, rng);
    return 0.76;
  };
}

// ========================================================
// Digits + fallback
// ========================================================

function drawDigit(ch, P, rng) {
  const cx = 0.34, cy = -0.52;
  if (ch === "0") { bowl(cx, cy, 0.26 * P.arc, 0.46 * P.arc, 0, TWO_PI, P, rng); return 0.70; }
  if (ch === "1") { stem(0.30, -1.02, 0.02, P, rng, { foot: true, head: true }); return 0.48; }
  if (ch === "2") { bowl(0.36, -0.82, 0.22 * P.arc, 0.20 * P.arc, PI * 1.1, PI * 2.15, P, rng); cross(0.50, -0.72, 0.16, 0.02, P, rng); cross(0.14, 0.02, 0.62, 0.02, P, rng); return 0.68; }
  if (ch === "3") { bowl(0.34, -0.78, 0.22 * P.arc, 0.20 * P.arc, -PI * 0.55, PI * 0.55, P, rng); bowl(0.34, -0.28, 0.24 * P.arc, 0.22 * P.arc, -PI * 0.55, PI * 0.55, P, rng); return 0.66; }
  if (ch === "4") { stem(0.52, -1.02, 0.02, P, rng, { foot: true, head: true }); cross(0.14, -0.55, 0.60, -0.55, P, rng); cross(0.14, -0.55, 0.52, -1.02, P, rng); return 0.70; }
  if (ch === "5") { cross(0.16, -1.02, 0.62, -1.02, P, rng); stem(0.18, -1.02, -0.56, P, rng, { foot: false, head: false }); bowl(0.38, -0.22, 0.26 * P.arc, 0.22 * P.arc, -PI * 0.10, PI * 0.95, P, rng); return 0.70; }
  if (ch === "6") { bowl(0.36, -0.40, 0.26 * P.arc, 0.30 * P.arc, 0, TWO_PI, P, rng); bowl(0.40, -0.78, 0.20 * P.arc, 0.18 * P.arc, PI * 0.9, PI * 2.1, P, rng); return 0.70; }
  if (ch === "7") { cross(0.14, -1.02, 0.66, -1.02, P, rng); cross(0.66, -1.02, 0.20, 0.02, P, rng); return 0.70; }
  if (ch === "8") { bowl(0.34, -0.78, 0.22 * P.arc, 0.20 * P.arc, 0, TWO_PI, P, rng); bowl(0.34, -0.28, 0.24 * P.arc, 0.22 * P.arc, 0, TWO_PI, P, rng); return 0.70; }
  if (ch === "9") { bowl(0.34, -0.64, 0.24 * P.arc, 0.26 * P.arc, 0, TWO_PI, P, rng); stem(0.52, -0.62, 0.02, P, rng, { foot: true, head: false }); return 0.70; }
  return 0.62;
}

function drawFallback(ch) {
  R(0.10, -0.95, 0.48, 0.95);
  return 0.62;
}

// ========================================================
// deterministic RNG
// ========================================================

function makeRng(seed) {
  let t = seed >>> 0;
  return function () {
    t ^= t << 13; t >>>= 0;
    t ^= t >> 17; t >>>= 0;
    t ^= t << 5;  t >>>= 0;
    return (t >>> 0) / 4294967296;
  };
}

// LOOP-Font — Schleifen-Version  + TEXT EDITOR (bis 10 Zeilen)
// Full Set + Radius + SVG Export (mit Kurven) +
// Stylistic Sets + Random Alternates + Ligaturen + Alignment (L/C/R)
// + Extra Symbols: @ € $ % & § # * ~ + Pfeile

let ui = {};
let glyphs = {};
let alternates = {};
let ligatures = {};
let features = {
  ss: "default", // 'default', 'ss01', 'ss02', 'ss03'
  randomAlt: false,
  ligatures: true,
};
let currentParams = {
  loops: 0.6,
  radius: 1.0,
  weight: 16,
  tight: -0.4,
};

function initHtmlUi() {
  ui.textArea = bindTextArea("textArea");
  ui.alignSelect = bindSelect("alignSelect");
  ui.leading = bindRange("leading");
  ui.curve = bindRange("curve");
  ui.loops = bindRange("loops");
  ui.radius = bindRange("radius");
  ui.weight = bindRange("weight");
  ui.spacing = bindRange("spacing");
  ui.fillMode = bindCheckbox("fillMode");
  ui.ssSelect = bindSelect("ssSelect");
  ui.randomAlt = bindCheckbox("randomAlt");
  ui.liga = bindCheckbox("liga");

  ui.textArea.addEventListener("input", () => redraw());

  ui.textArea.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const lines = (ui.textArea.value() || "").replace(/\r/g, "").split("\n");
    if (lines.length >= 25) e.preventDefault();
  });

  ui.alignSelect.addEventListener("change", () => redraw());
  ui.leading.addEventListener("input", () => redraw());
  ui.curve.addEventListener("input", () => redraw());
  ui.loops.addEventListener("input", () => redraw());
  ui.radius.addEventListener("input", () => redraw());
  ui.weight.addEventListener("input", () => redraw());
  ui.spacing.addEventListener("input", () => redraw());
  ui.fillMode.addEventListener("change", () => redraw());

  ui.ssSelect.addEventListener("change", () => {
    features.ss = ui.ssSelect.value();
    redraw();
  });

  ui.randomAlt.addEventListener("change", () => {
    features.randomAlt = ui.randomAlt.checked();
    redraw();
  });

  ui.liga.addEventListener("change", () => {
    features.ligatures = ui.liga.checked();
    redraw();
  });

  const exportBtn = document.getElementById("exportSvgBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", exportSvg);
  }

  features.ss = ui.ssSelect.value();
  features.randomAlt = ui.randomAlt.checked();
  features.ligatures = ui.liga.checked();
}

function bindRange(id) {
  const el = document.getElementById(id);
  return {
    value: () => Number(el.value),
    addEventListener: (type, handler) => el.addEventListener(type, handler),
  };
}

function bindSelect(id) {
  const el = document.getElementById(id);
  return {
    value: () => el.value,
    addEventListener: (type, handler) => el.addEventListener(type, handler),
  };
}

function bindCheckbox(id) {
  const el = document.getElementById(id);
  return {
    checked: () => el.checked,
    addEventListener: (type, handler) => el.addEventListener(type, handler),
  };
}

function bindTextArea(id) {
  const el = document.getElementById(id);
  return {
    value: () => (el.value || ""),
    addEventListener: (type, handler) => el.addEventListener(type, handler),
  };
}

// --------------------------------------------------------
// Setup & Resize
// --------------------------------------------------------
function setup() {
  const sketchHost = document.getElementById("sketch-holder");

  const w = sketchHost.offsetWidth || window.innerWidth;
  const h = sketchHost.offsetHeight || window.innerHeight;

  const canvas = createCanvas(w, h);
  canvas.parent(sketchHost);
  pixelDensity(window.devicePixelRatio || 1);

  initGlyphs();
  initAlternatesAndLigatures();

  textFont("monospace");
  textSize(12);
  noStroke();

  initHtmlUi();

  noLoop();
  redraw();
}

function windowResized() {
  const sketchHost = document.getElementById("sketch-holder");
  resizeCanvas(sketchHost.offsetWidth, sketchHost.offsetHeight);
  redraw();
}

// --------------------------------------------------------
// Draw
// --------------------------------------------------------
function draw() {
  background(255);

  // Responsive layout
  let baseSize = height * 0.14;
  let boxX = width * 0.04;
  let boxW = width - boxX * 2;
  let topY = baseSize * 1.4;         // first baseline
  let leading = ui.leading.value();
  let alignMode = ui.alignSelect.value();

  currentParams = computeEffectiveParams();

  let lines = getEditorLines();
  for (let li = 0; li < lines.length; li++) {
    let line = lines[li];

    let baselineY = topY + li * leading;
    let lineW = measureLineWidth(line);
    let x = getAlignedStartX(lineW, boxX, boxW, alignMode);

    let i = 0;
    while (i < line.length) {
      let info = getGlyphInfo(line, i);
      if (info.type === "space") {
        x += info.advance;
      } else {
        drawGlyph(info.strokes, x, baselineY - baseSize, baseSize);
        x += info.advance;
      }
      i += info.consumed;
    }
  }
}

// --------------------------------------------------------
// Editor helpers
// --------------------------------------------------------
function getEditorLines() {
  let raw = ui.textArea.value() || "";
  raw = raw.replace(/\r/g, "");
  let lines = raw.split("\n");
  return lines.slice(0, 25);
}

function measureLineWidth(line) {
  let w = 0;
  let i = 0;
  while (i < line.length) {
    let info = getGlyphInfo(line, i);
    w += info.advance;
    i += info.consumed;
  }
  return w;
}

function getAlignedStartX(lineWidth, boxX, boxW, alignMode) {
  if (alignMode === "center") return boxX + (boxW - lineWidth) * 0.5;
  if (alignMode === "right") return boxX + (boxW - lineWidth);
  return boxX;
}

// --------------------------------------------------------
// Glyph definitions (0..1 coordinates)
// --------------------------------------------------------
function initGlyphs() {
  glyphs = {
    A: [
      [[0.1, 1], [0.5, 0], [0.9, 1]],
      [[0.25, 0.6], [0.75, 0.6]],
    ],
    B: [
      [[0.1, 0], [0.1, 1]],
      [[0.1, 0], [0.7, 0.2], [0.1, 0.5]],
      [[0.1, 0.5], [0.8, 0.75], [0.1, 1]],
    ],
    C: [[[0.8, 0.1], [0.5, 0], [0.2, 0.2], [0.1, 0.5], [0.2, 0.8], [0.5, 1], [0.8, 0.9]]],
    D: [
      [[0.1, 0], [0.1, 1]],
      [[0.1, 0], [0.7, 0.2], [0.9, 0.5], [0.7, 0.8], [0.1, 1]],
    ],
    E: [
      [[0.8, 0], [0.1, 0], [0.1, 1], [0.8, 1]],
      [[0.1, 0.5], [0.65, 0.5]],
    ],
    F: [
      [[0.1, 0], [0.1, 1]],
      [[0.1, 0], [0.8, 0]],
      [[0.1, 0.5], [0.65, 0.5]],
    ],
    G: [[[0.8, 0.2], [0.6, 0], [0.3, 0.1], [0.1, 0.5], [0.3, 0.9], [0.6, 1], [0.85, 0.8], [0.85, 0.6], [0.55, 0.6]]],
    H: [
      [[0.1, 0], [0.1, 1]],
      [[0.9, 0], [0.9, 1]],
      [[0.1, 0.5], [0.9, 0.5]],
    ],
    I: [
      [[0.2, 0], [0.8, 0]],
      [[0.5, 0], [0.5, 1]],
      [[0.2, 1], [0.8, 1]],
    ],
    J: [[[0.8, 0], [0.8, 0.7], [0.7, 0.95], [0.5, 1], [0.3, 0.85]]],
    K: [
      [[0.1, 0], [0.1, 1]],
      [[0.1, 0.5], [0.9, 0]],
      [[0.1, 0.5], [0.9, 1]],
    ],
    L: [[[0.1, 0], [0.1, 1], [0.85, 1]]],
    M: [[[0.1, 1], [0.1, 0], [0.5, 0.5], [0.9, 0], [0.9, 1]]],
    N: [[[0.1, 1], [0.1, 0], [0.9, 1], [0.9, 0]]],
    O: [[[0.5, 0], [0.85, 0.2], [0.9, 0.5], [0.85, 0.8], [0.5, 1], [0.15, 0.8], [0.1, 0.5], [0.15, 0.2], [0.5, 0]]],
    P: [
      [[0.1, 1], [0.1, 0]],
      [[0.1, 0], [0.8, 0.2], [0.7, 0.5], [0.1, 0.55]],
    ],
    Q: [
      [[0.5, 0], [0.85, 0.2], [0.9, 0.5], [0.85, 0.8], [0.5, 1], [0.15, 0.8], [0.1, 0.5], [0.15, 0.2], [0.5, 0]],
      [[0.6, 0.7], [0.9, 1]],
    ],
    R: [
      [[0.1, 1], [0.1, 0]],
      [[0.1, 0], [0.7, 0.15], [0.7, 0.45], [0.1, 0.55]],
      [[0.1, 0.55], [0.75, 1]],
    ],
    S: [[[0.8, 0.1], [0.4, 0], [0.2, 0.25], [0.6, 0.45], [0.8, 0.65], [0.6, 0.9], [0.2, 1]]],
    T: [
      [[0.1, 0], [0.9, 0]],
      [[0.5, 0], [0.5, 1]],
    ],
    U: [[[0.1, 0], [0.1, 0.7], [0.3, 1], [0.7, 1], [0.9, 0.7], [0.9, 0]]],
    V: [[[0.1, 0], [0.5, 1], [0.9, 0]]],
    W: [[[0.1, 0], [0.3, 1], [0.5, 0.4], [0.7, 1], [0.9, 0]]],
    X: [
      [[0.1, 0], [0.9, 1]],
      [[0.9, 0], [0.1, 1]],
    ],
    Y: [
      [[0.1, 0], [0.5, 0.5], [0.9, 0]],
      [[0.5, 0.5], [0.5, 1]],
    ],
    Z: [[[0.1, 0], [0.9, 0], [0.1, 1], [0.9, 1]]],
    "?": [
      [[0.2, 0.2], [0.5, 0], [0.8, 0.2], [0.7, 0.4], [0.5, 0.5], [0.5, 0.7]],
      [[0.5, 0.9], [0.5, 1]],
    ],
  };

  // Lowercase a–z
  glyphs["a"] = [
    [[0.3, 0.4], [0.55, 0.3], [0.8, 0.45], [0.8, 0.7], [0.55, 0.9], [0.3, 0.8], [0.3, 0.4]],
    [[0.8, 0.45], [0.9, 0.2]],
  ];
  glyphs["b"] = [
    [[0.2, 0], [0.2, 1]],
    [[0.2, 0.4], [0.6, 0.3], [0.8, 0.5], [0.6, 0.7], [0.2, 0.75]],
  ];
  glyphs["c"] = [[[0.8, 0.45], [0.6, 0.3], [0.3, 0.35], [0.2, 0.6], [0.4, 0.85], [0.7, 0.9]]];
  glyphs["d"] = [
    [[0.8, 0], [0.8, 1]],
    [[0.8, 0.4], [0.55, 0.3], [0.3, 0.4], [0.25, 0.65], [0.45, 0.9], [0.7, 0.8]],
  ];
  glyphs["e"] = [
    [[0.3, 0.55], [0.8, 0.55]],
    [[0.8, 0.45], [0.6, 0.3], [0.35, 0.35], [0.25, 0.55], [0.35, 0.8], [0.7, 0.85]],
  ];
  glyphs["f"] = [
    [[0.55, 0], [0.45, 0.25], [0.45, 1]],
    [[0.25, 0.3], [0.7, 0.3]],
  ];
  glyphs["g"] = [
    [[0.7, 0.35], [0.5, 0.25], [0.3, 0.35], [0.25, 0.6], [0.45, 0.85], [0.7, 0.8]],
    [[0.7, 0.8], [0.75, 1.1], [0.45, 1.15], [0.25, 1.0]],
  ];
  glyphs["h"] = [
    [[0.2, 0], [0.2, 1]],
    [[0.2, 0.5], [0.55, 0.35], [0.8, 0.45], [0.8, 1]],
  ];
  glyphs["i"] = [
    [[0.5, 0.4], [0.5, 0.95]],
    [[0.5, 0.15], [0.5, 0.2]],
  ];
  glyphs["j"] = [
    [[0.6, 0.4], [0.6, 1.1], [0.4, 1.2], [0.25, 1.0]],
    [[0.6, 0.15], [0.6, 0.2]],
  ];
  glyphs["k"] = [
    [[0.2, 0], [0.2, 1]],
    [[0.2, 0.6], [0.8, 0.3]],
    [[0.2, 0.6], [0.8, 0.95]],
  ];
  glyphs["l"] = [[[0.4, 0], [0.4, 1]]];
  glyphs["m"] = [
    [[0.15, 0.95], [0.15, 0.45], [0.35, 0.3], [0.5, 0.45], [0.5, 0.95]],
    [[0.5, 0.95], [0.5, 0.45], [0.7, 0.3], [0.85, 0.45], [0.85, 0.95]],
  ];
  glyphs["n"] = [[[0.2, 0.95], [0.2, 0.45], [0.45, 0.3], [0.7, 0.45], [0.7, 0.95]]];
  glyphs["o"] = [[[0.5, 0.3], [0.75, 0.4], [0.8, 0.6], [0.7, 0.85], [0.45, 0.9], [0.25, 0.75], [0.25, 0.5], [0.4, 0.35], [0.5, 0.3]]];
  glyphs["p"] = [
    [[0.2, 0.4], [0.2, 1.2]],
    [[0.2, 0.4], [0.55, 0.3], [0.8, 0.5], [0.6, 0.7], [0.2, 0.75]],
  ];
  glyphs["q"] = [
    [[0.75, 0.4], [0.75, 1.2]],
    [[0.75, 0.4], [0.5, 0.3], [0.3, 0.4], [0.25, 0.65], [0.4, 0.85], [0.65, 0.8]],
  ];
  glyphs["r"] = [
    [[0.25, 0.95], [0.25, 0.45]],
    [[0.25, 0.5], [0.5, 0.35], [0.7, 0.45]],
  ];
  glyphs["s"] = [[[0.75, 0.35], [0.5, 0.3], [0.3, 0.4], [0.55, 0.55], [0.75, 0.7], [0.55, 0.85], [0.3, 0.9]]];
  glyphs["t"] = [
    [[0.5, 0.1], [0.45, 0.4], [0.45, 0.95]],
    [[0.25, 0.4], [0.7, 0.4]],
  ];
  glyphs["u"] = [[[0.2, 0.45], [0.2, 0.8], [0.4, 0.95], [0.65, 0.9], [0.8, 0.7], [0.8, 0.45]]];
  glyphs["v"] = [[[0.2, 0.45], [0.5, 0.95], [0.8, 0.45]]];
  glyphs["w"] = [[[0.15, 0.45], [0.3, 0.95], [0.5, 0.55], [0.7, 0.95], [0.85, 0.45]]];
  glyphs["x"] = [
    [[0.25, 0.4], [0.8, 0.9]],
    [[0.8, 0.4], [0.25, 0.9]],
  ];
  glyphs["y"] = [
    [[0.2, 0.45], [0.5, 0.75], [0.8, 0.45]],
    [[0.5, 0.75], [0.5, 1.2]],
  ];
  glyphs["z"] = [[[0.25, 0.45], [0.8, 0.45], [0.25, 0.9], [0.8, 0.9]]];

  // Digits 0–9
  glyphs["0"] = [[[0.5, 0], [0.8, 0.2], [0.9, 0.5], [0.8, 0.8], [0.5, 1], [0.2, 0.8], [0.1, 0.5], [0.2, 0.2], [0.5, 0]]];
  glyphs["1"] = [
    [[0.4, 0.15], [0.5, 0], [0.5, 1]],
    [[0.3, 1], [0.7, 1]],
  ];
  glyphs["2"] = [[[0.2, 0.2], [0.4, 0], [0.7, 0.1], [0.8, 0.3], [0.6, 0.55], [0.3, 0.8], [0.2, 1], [0.8, 1]]];
  glyphs["3"] = [[[0.25, 0.1], [0.55, 0], [0.8, 0.15], [0.6, 0.35], [0.75, 0.55], [0.6, 0.8], [0.35, 1], [0.2, 0.9]]];
  glyphs["4"] = [
    [[0.7, 0], [0.7, 1]],
    [[0.15, 0.5], [0.85, 0.5]],
    [[0.3, 0], [0.15, 0.5]],
  ];
  glyphs["5"] = [[[0.8, 0.1], [0.4, 0], [0.25, 0.35], [0.7, 0.35], [0.85, 0.6], [0.6, 0.9], [0.25, 1]]];
  glyphs["6"] = [[[0.7, 0.1], [0.45, 0], [0.2, 0.35], [0.25, 0.8], [0.5, 1], [0.8, 0.85], [0.7, 0.6], [0.4, 0.55], [0.25, 0.7]]];
  glyphs["7"] = [[[0.2, 0.05], [0.85, 0.05], [0.4, 1]]];
  glyphs["8"] = [
    [[0.5, 0], [0.8, 0.2], [0.5, 0.4], [0.2, 0.2], [0.5, 0]],
    [[0.5, 0.4], [0.85, 0.65], [0.5, 1], [0.15, 0.65], [0.5, 0.4]],
  ];
  glyphs["9"] = [[[0.25, 0.9], [0.5, 1], [0.8, 0.7], [0.75, 0.3], [0.5, 0], [0.3, 0.2], [0.55, 0.4], [0.75, 0.35]]];

  // Punctuation
  glyphs["."] = [[[0.45, 0.9], [0.55, 1.0]]];
  glyphs[","] = [[[0.45, 0.9], [0.55, 1.05], [0.45, 1.15]]];
  glyphs[":"] = [
    [[0.5, 0.25], [0.5, 0.3]],
    [[0.5, 0.8], [0.5, 0.85]],
  ];
  glyphs[";"] = [
    [[0.5, 0.25], [0.5, 0.3]],
    [[0.45, 0.8], [0.55, 0.95], [0.45, 1.05]],
  ];
  glyphs["!"] = [
    [[0.5, 0.05], [0.5, 0.8]],
    [[0.5, 0.9], [0.5, 0.95]],
  ];
  glyphs["-"] = [[[0.2, 0.55], [0.8, 0.5]]];
  glyphs["+"] = [
    [[0.5, 0.3], [0.5, 0.8]],
    [[0.25, 0.55], [0.75, 0.55]],
  ];
  glyphs["/"] = [[[0.2, 1.0], [0.8, 0.0]]];
  glyphs["("] = [[[0.7, 0.0], [0.4, 0.2], [0.3, 0.5], [0.4, 0.8], [0.7, 1.0]]];
  glyphs[")"] = [[[0.3, 0.0], [0.6, 0.2], [0.7, 0.5], [0.6, 0.8], [0.3, 1.0]]];
  glyphs['"'] = [
    [[0.35, 0.1], [0.35, 0.25]],
    [[0.65, 0.1], [0.65, 0.25]],
  ];
  glyphs["'"] = [[[0.5, 0.1], [0.55, 0.25]]];

  // Umlaute & ß
  glyphs["Ä"] = JSON.parse(JSON.stringify(glyphs["A"]));
  glyphs["Ä"].push([[0.3, -0.05], [0.3, 0.0]]);
  glyphs["Ä"].push([[0.7, -0.05], [0.7, 0.0]]);

  glyphs["Ö"] = JSON.parse(JSON.stringify(glyphs["O"]));
  glyphs["Ö"].push([[0.35, -0.05], [0.35, 0.0]]);
  glyphs["Ö"].push([[0.65, -0.05], [0.65, 0.0]]);

  glyphs["Ü"] = JSON.parse(JSON.stringify(glyphs["U"]));
  glyphs["Ü"].push([[0.35, -0.05], [0.35, 0.0]]);
  glyphs["Ü"].push([[0.65, -0.05], [0.65, 0.0]]);

  glyphs["ä"] = JSON.parse(JSON.stringify(glyphs["a"]));
  glyphs["ä"].push([[0.35, 0.15], [0.35, 0.2]]);
  glyphs["ä"].push([[0.6, 0.15], [0.6, 0.2]]);

  glyphs["ö"] = JSON.parse(JSON.stringify(glyphs["o"]));
  glyphs["ö"].push([[0.35, 0.15], [0.35, 0.2]]);
  glyphs["ö"].push([[0.6, 0.15], [0.6, 0.2]]);

  glyphs["ü"] = JSON.parse(JSON.stringify(glyphs["u"]));
  glyphs["ü"].push([[0.35, 0.15], [0.35, 0.2]]);
  glyphs["ü"].push([[0.6, 0.15], [0.6, 0.2]]);

  glyphs["ß"] = [
    [[0.2, 0.0], [0.35, 0.15], [0.35, 0.45]],
    [[0.35, 0.15], [0.7, 0.1], [0.8, 0.3], [0.45, 0.4]],
    [[0.45, 0.4], [0.75, 0.5], [0.8, 0.8], [0.5, 1.0], [0.3, 0.9]],
  ];

  // Extra symbols: @ € $ % & § # * ~
  glyphs["@"] = [
    [[0.55, 0.08], [0.78, 0.15], [0.9, 0.38], [0.82, 0.72], [0.55, 0.9], [0.25, 0.82], [0.12, 0.5], [0.25, 0.18], [0.55, 0.08]],
    [[0.38, 0.55], [0.52, 0.42], [0.68, 0.48], [0.68, 0.64], [0.55, 0.72], [0.4, 0.66], [0.38, 0.55]],
    [[0.68, 0.48], [0.78, 0.38], [0.82, 0.5], [0.75, 0.62]],
  ];

  glyphs["€"] = [
    [[0.82, 0.18], [0.55, 0.06], [0.28, 0.18], [0.18, 0.5], [0.28, 0.82], [0.55, 0.94], [0.82, 0.82]],
    [[0.22, 0.42], [0.7, 0.42]],
    [[0.22, 0.6], [0.7, 0.6]],
  ];

  glyphs["$"] = [
    [[0.78, 0.18], [0.45, 0.06], [0.22, 0.2], [0.55, 0.46], [0.8, 0.7], [0.55, 0.94], [0.22, 0.82]],
    [[0.5, 0.02], [0.5, 0.98]],
  ];

  glyphs["%"] = [
    [[0.25, 0.25], [0.35, 0.15], [0.45, 0.25], [0.35, 0.35], [0.25, 0.25]],
    [[0.55, 0.75], [0.65, 0.65], [0.75, 0.75], [0.65, 0.85], [0.55, 0.75]],
    [[0.25, 0.85], [0.75, 0.15]],
  ];

  glyphs["&"] = [[[0.7, 0.22], [0.55, 0.08], [0.35, 0.18], [0.45, 0.38], [0.7, 0.6], [0.55, 0.88], [0.28, 0.78], [0.28, 0.62], [0.52, 0.52], [0.8, 0.9]]];

  glyphs["§"] = [
    [[0.75, 0.16], [0.45, 0.06], [0.28, 0.22], [0.55, 0.4], [0.72, 0.56], [0.55, 0.72], [0.28, 0.62]],
    [[0.72, 0.44], [0.45, 0.34], [0.28, 0.5], [0.55, 0.68], [0.72, 0.84], [0.55, 0.96], [0.28, 0.86]],
  ];

  glyphs["#"] = [
    [[0.35, 0.1], [0.3, 0.9]],
    [[0.65, 0.1], [0.6, 0.9]],
    [[0.18, 0.38], [0.85, 0.32]],
    [[0.15, 0.68], [0.82, 0.62]],
  ];

  glyphs["*"] = [
    [[0.5, 0.15], [0.5, 0.85]],
    [[0.22, 0.32], [0.78, 0.68]],
    [[0.78, 0.32], [0.22, 0.68]],
  ];

  glyphs["~"] = [[[0.15, 0.58], [0.32, 0.42], [0.48, 0.58], [0.65, 0.42], [0.85, 0.58]]];

  // Arrows
  glyphs["←"] = [
    [[0.85, 0.5], [0.2, 0.5]],
    [[0.35, 0.35], [0.2, 0.5], [0.35, 0.65]],
  ];
  glyphs["→"] = [
    [[0.15, 0.5], [0.8, 0.5]],
    [[0.65, 0.35], [0.8, 0.5], [0.65, 0.65]],
  ];
  glyphs["↑"] = [
    [[0.5, 0.85], [0.5, 0.2]],
    [[0.35, 0.35], [0.5, 0.2], [0.65, 0.35]],
  ];
  glyphs["↓"] = [
    [[0.5, 0.15], [0.5, 0.8]],
    [[0.35, 0.65], [0.5, 0.8], [0.65, 0.65]],
  ];
  glyphs["↔"] = [
    [[0.2, 0.5], [0.8, 0.5]],
    [[0.35, 0.35], [0.2, 0.5], [0.35, 0.65]],
    [[0.65, 0.35], [0.8, 0.5], [0.65, 0.65]],
  ];
  glyphs["↕"] = [
    [[0.5, 0.2], [0.5, 0.8]],
    [[0.35, 0.35], [0.5, 0.2], [0.65, 0.35]],
    [[0.35, 0.65], [0.5, 0.8], [0.65, 0.65]],
  ];
  glyphs["↗"] = [
    [[0.25, 0.75], [0.75, 0.25]],
    [[0.62, 0.25], [0.75, 0.25], [0.75, 0.38]],
  ];
  glyphs["↖"] = [
    [[0.75, 0.75], [0.25, 0.25]],
    [[0.38, 0.25], [0.25, 0.25], [0.25, 0.38]],
  ];
  glyphs["↘"] = [
    [[0.25, 0.25], [0.75, 0.75]],
    [[0.62, 0.75], [0.75, 0.75], [0.75, 0.62]],
  ];
  glyphs["↙"] = [
    [[0.75, 0.25], [0.25, 0.75]],
    [[0.38, 0.75], [0.25, 0.75], [0.25, 0.62]],
  ];
  glyphs["↰"] = [
    [[0.65, 0.8], [0.65, 0.25], [0.25, 0.25]],
    [[0.38, 0.12], [0.25, 0.25], [0.38, 0.38]],
  ];
  glyphs["↱"] = [
    [[0.35, 0.8], [0.35, 0.25], [0.75, 0.25]],
    [[0.62, 0.12], [0.75, 0.25], [0.62, 0.38]],
  ];
  glyphs["↩"] = [
    [[0.8, 0.35], [0.35, 0.35], [0.35, 0.75], [0.2, 0.75]],
    [[0.35, 0.6], [0.2, 0.75], [0.35, 0.9]],
  ];
}

// --------------------------------------------------------
// Alternates & Ligatures
// --------------------------------------------------------
function initAlternatesAndLigatures() {
  alternates = {};
  ligatures = {};

  function cloneGlyph(strokes) {
    return strokes.map((st) => st.map((p) => [p[0], p[1]]));
  }
  function tweakGlyph(strokes, dx, dy) {
    let g = cloneGlyph(strokes);
    for (let s = 0; s < g.length; s++) {
      for (let i = 0; i < g[s].length; i++) {
        if (i % 2 === 1) {
          g[s][i][0] += dx;
          g[s][i][1] += dy;
        }
      }
    }
    return g;
  }
  function makeAlt(ch, dx, dy) {
    if (!glyphs[ch]) return;
    if (!alternates[ch]) alternates[ch] = [];
    alternates[ch].push(tweakGlyph(glyphs[ch], dx, dy));
  }

  makeAlt("A", 0.06, -0.08);
  makeAlt("A", -0.04, 0.06);
  makeAlt("O", 0.08, 0.0);
  makeAlt("O", -0.06, 0.05);
  makeAlt("S", 0.05, -0.05);
  makeAlt("R", -0.04, 0.05);
  makeAlt("M", 0.03, -0.05);
  makeAlt("N", -0.03, 0.07);
  makeAlt("E", 0.02, -0.06);
  makeAlt("a", 0.04, -0.06);
  makeAlt("o", -0.04, 0.05);
  makeAlt("s", 0.05, -0.04);

  ligatures["ff"] = [
    [[0.15, 0], [0.15, 1]],
    [[0.45, 0], [0.45, 1]],
    [[0.1, 0.32], [0.9, 0.3]],
  ];
  ligatures["fi"] = [
    [[0.2, 0], [0.2, 1]],
    [[0.1, 0.32], [0.8, 0.3]],
    [[0.75, 0.4], [0.75, 1]],
    [[0.75, 0.15], [0.75, 0.2]],
  ];
  ligatures["fl"] = [
    [[0.2, 0], [0.2, 1]],
    [[0.1, 0.32], [0.8, 0.3]],
    [[0.75, 0], [0.75, 1]],
  ];
  ligatures["tt"] = [
    [[0.25, 0.1], [0.25, 0.95]],
    [[0.55, 0.1], [0.55, 0.95]],
    [[0.05, 0.4], [0.9, 0.4]],
  ];
  ligatures["ss"] = [
    [[0.15, 0.2], [0.45, 0.1], [0.3, 0.4], [0.5, 0.55], [0.25, 0.8], [0.1, 0.9]],
    [[0.5, 0.2], [0.8, 0.1], [0.65, 0.4], [0.85, 0.55], [0.6, 0.8], [0.45, 0.9]],
  ];
  ligatures["st"] = [
    [[0.15, 0.2], [0.45, 0.1], [0.3, 0.4], [0.55, 0.55], [0.3, 0.8], [0.15, 0.9]],
    [[0.65, 0.1], [0.6, 0.4], [0.6, 0.95]],
    [[0.45, 0.4], [0.9, 0.4]],
  ];
}

// --------------------------------------------------------
// Loop injection
// --------------------------------------------------------
function addLoopsToStroke(pts, loopStrength, size, radiusFactor) {
  if (loopStrength <= 0.01 || pts.length < 2) return pts;

  let newPts = [];
  let maxAmp = loopStrength * size * 0.5 * radiusFactor;

  for (let i = 0; i < pts.length - 1; i++) {
    let p0 = pts[i];
    let p1 = pts[i + 1];
    newPts.push(p0.copy());

    let seg = p5.Vector.sub(p1, p0);
    let len = seg.mag();
    if (len > 0.0001) {
      let normal = createVector(-seg.y, seg.x).normalize();
      let base = p5.Vector.add(p0, p5.Vector.mult(seg, 0.5));
      let sign = i % 2 === 0 ? 1 : -1;
      let amp = maxAmp * 0.7 * sign;
      let loopPoint = p5.Vector.add(base, p5.Vector.mult(normal, amp));
      newPts.push(loopPoint);
    }
  }
  newPts.push(pts[pts.length - 1].copy());
  return newPts;
}

// --------------------------------------------------------
// Transform strokes
// --------------------------------------------------------
function getTransformedStrokes(strokes, x0, y0, size) {
  let loopStrength = currentParams.loops;
  let radiusFactor = currentParams.radius;
  let result = [];

  for (let s = 0; s < strokes.length; s++) {
    let basePts = strokes[s].map((p) =>
      createVector(x0 + p[0] * size, y0 + p[1] * size)
    );
    let pts = addLoopsToStroke(basePts, loopStrength, size, radiusFactor);
    if (pts.length >= 2) result.push(pts);
  }
  return result;
}

// --------------------------------------------------------
// Stylistic set params
// --------------------------------------------------------
function computeEffectiveParams() {
  let loops = ui.loops.value();
  let radius = ui.radius.value();
  let weight = ui.weight.value();
  let tight = ui.curve.value();

  switch (features.ss) {
    case "ss01":
      loops *= 1.4;
      radius *= 1.3;
      tight -= 0.2;
      break;
    case "ss02":
      loops *= 0.5;
      radius *= 0.8;
      tight += 0.3;
      weight *= 0.8;
      break;
    case "ss03":
      loops *= 1.1;
      radius *= 1.6;
      break;
  }

  loops = constrain(loops, 0, 1);
  radius = constrain(radius, 0.2, 2.5);
  tight = constrain(tight, -1, 1);

  return { loops, radius, weight, tight };
}

// --------------------------------------------------------
// Glyph selection
// --------------------------------------------------------
function getGlyphInfo(txt, index) {
  let spacing = ui.spacing.value();
  let ch = txt[index];

  if (ch === " ") {
    return { type: "space", consumed: 1, advance: spacing * 0.6 };
  }

  if (features.ligatures) {
    for (let len = 3; len >= 2; len--) {
      if (index + len <= txt.length) {
        let key = txt.substring(index, index + len);
        if (ligatures[key]) {
          return {
            type: "glyph",
            strokes: ligatures[key],
            consumed: len,
            advance: spacing * len * 0.95,
          };
        }
      }
    }
  }

  let base = glyphs[ch] || glyphs["?"];
  let strokes = base;

  if (features.randomAlt && alternates[ch] && alternates[ch].length > 0) {
    let variants = alternates[ch];
    let seed = (index + ch.charCodeAt(0) * 31) >>> 0;
    let r = ((seed * 9301 + 49297) % 233280) / 233280.0;
    let choice = floor(r * (variants.length + 1));
    if (choice > 0) strokes = variants[choice - 1];
  }

  return { type: "glyph", strokes: strokes, consumed: 1, advance: spacing };
}

// --------------------------------------------------------
// Canvas rendering
// --------------------------------------------------------
function drawGlyph(strokes, x0, y0, size) {
  let tight = currentParams.tight;
  let w = currentParams.weight;
  let fillMode = ui.fillMode.checked();

  curveTightness(tight);
  strokeJoin(ROUND);
  strokeCap(ROUND);
  noFill();

  let transformed = getTransformedStrokes(strokes, x0, y0, size);

  for (let pts of transformed) {
    let first = pts[0];
    let last = pts[pts.length - 1];

    stroke(0);
    strokeWeight(w + 4);
    beginShape();
    curveVertex(first.x, first.y);
    for (let v of pts) curveVertex(v.x, v.y);
    curveVertex(last.x, last.y);
    endShape();

    if (!fillMode) {
      stroke(255);
      strokeWeight(w);
      beginShape();
      curveVertex(first.x, first.y);
      for (let v of pts) curveVertex(v.x, v.y);
      curveVertex(last.x, last.y);
      endShape();
    }
  }
}

// --------------------------------------------------------
// Curve sampling for SVG export
// --------------------------------------------------------
function sampleCurvePoints(pts, detail) {
  let sampled = [];
  if (pts.length < 2) return pts.slice();

  let cp = [];
  cp.push(pts[0]);
  for (let p of pts) cp.push(p);
  cp.push(pts[pts.length - 1]);

  for (let i = 1; i < cp.length - 2; i++) {
    for (let t = 0; t <= 1.0001; t += 1 / detail) {
      let x = curvePoint(cp[i - 1].x, cp[i].x, cp[i + 1].x, cp[i + 2].x, t);
      let y = curvePoint(cp[i - 1].y, cp[i].y, cp[i + 1].y, cp[i + 2].y, t);
      sampled.push(createVector(x, y));
    }
  }
  return sampled;
}

// --------------------------------------------------------
// SVG Export
// --------------------------------------------------------
function exportSvg() {
  let baseSize = height * 0.14;
  let boxX = width * 0.04;
  let boxW = width - boxX * 2;
  let topY = baseSize * 1.4;
  let fillMode = ui.fillMode.checked();
  let leading = ui.leading.value();
  let alignMode = ui.alignSelect.value();

  currentParams = computeEffectiveParams();
  let wStroke = currentParams.weight;
  let tight = currentParams.tight;
  curveTightness(tight);

  let svg = [];
  svg.push('<?xml version="1.0" encoding="UTF-8"?>');
  svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);

  let lines = getEditorLines();
  for (let li = 0; li < lines.length; li++) {
    let line = lines[li];
    let baselineY = topY + li * leading;
    let lineW = measureLineWidth(line);
    let x = getAlignedStartX(lineW, boxX, boxW, alignMode);

    let i = 0;
    while (i < line.length) {
      let info = getGlyphInfo(line, i);

      if (info.type === "space") {
        x += info.advance;
        i += info.consumed;
        continue;
      }

      let transformed = getTransformedStrokes(info.strokes, x, baselineY - baseSize, baseSize);

      for (let pts of transformed) {
        if (pts.length < 2) continue;

        let curvePts = sampleCurvePoints(pts, 16);
        let d = `M ${curvePts[0].x.toFixed(2)} ${curvePts[0].y.toFixed(2)}`;
        for (let j = 1; j < curvePts.length; j++) {
          d += ` L ${curvePts[j].x.toFixed(2)} ${curvePts[j].y.toFixed(2)}`;
        }

        svg.push(`<path d="${d}" fill="none" stroke="black" stroke-width="${(wStroke + 4).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" />`);
        if (!fillMode) {
          svg.push(`<path d="${d}" fill="none" stroke="white" stroke-width="${wStroke.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" />`);
        }
      }

      x += info.advance;
      i += info.consumed;
    }
  }

  svg.push("</svg>");
  saveStrings(svg, "loop_text", "svg");
}

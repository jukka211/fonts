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

function setup() {
  let maxLines = 25;
  createCanvas(2500, 3500 + maxLines * 200);
  pixelDensity(1);

  initGlyphs();
  initAlternatesAndLigatures();

  textFont("monospace");
  textSize(12);
  noStroke();

  // --- TEXT EDITOR UI (bis 10 Zeilen) ---
  ui.textArea = createElement(
    "textarea",
    "Loop Font\näöü ÄÖÜ 123!?\n@ € $ % & § # * ~\n← ↑ → ↓ ↔ ↕"
  );
  ui.textArea.position(20, 20);
  ui.textArea.size(320, 180);
  ui.textArea.input(() => redraw());

  ui.alignSelect = createSelect();
  ui.alignSelect.position(360, 20);
  ui.alignSelect.option("Links", "left");
  ui.alignSelect.option("Zentriert", "center");
  ui.alignSelect.option("Rechts", "right");
  ui.alignSelect.changed(() => redraw());
  ui.alignSelect.value("left");

  ui.boxWidth = createSlider(300, 920, 920, 1);
  ui.boxWidth.position(360, 50);
  ui.boxWidth.style("width", "320px");
  ui.boxWidth.input(redraw);

  ui.leading = createSlider(120, 260, 190, 1); // Zeilenabstand px
  ui.leading.position(360, 80);
  ui.leading.style("width", "320px");
  ui.leading.input(redraw);

  // optional: keine 11. Zeile zulassen
  ui.textArea.elt.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      let lines = (ui.textArea.value() || "")
        .replace(/\r/g, "")
        .split("\n");
      if (lines.length >= 25) e.preventDefault();
    }
  });

  // --- PARAM UI (wie gehabt) ---
  ui.curve = createSlider(-1.0, 1.0, -0.4, 0.01);
  ui.curve.position(20, 220);
  ui.curve.style("width", "320px");
  ui.curve.input(redraw);

  ui.loops = createSlider(0, 1, 0.6, 0.01); // Schleifen-Stärke
  ui.loops.position(20, 250);
  ui.loops.style("width", "320px");
  ui.loops.input(redraw);

  ui.radius = createSlider(0.2, 2.0, 1.0, 0.01); // Radius der Krümmungen
  ui.radius.position(20, 280);
  ui.radius.style("width", "320px");
  ui.radius.input(redraw);

  ui.weight = createSlider(4, 40, 16, 1);
  ui.weight.position(20, 310);
  ui.weight.style("width", "320px");
  ui.weight.input(redraw);

  ui.spacing = createSlider(30, 160, 90, 1);
  ui.spacing.position(20, 340);
  ui.spacing.style("width", "320px");
  ui.spacing.input(redraw);

  ui.fillMode = createCheckbox("Gefüllt (schwarz)", false);
  ui.fillMode.position(20, 370);
  ui.fillMode.changed(redraw);

  ui.exportSvgBtn = createButton("SVG Export");
  ui.exportSvgBtn.position(20, 400);
  ui.exportSvgBtn.mousePressed(exportSvg);

  // OpenType-Style Features
  ui.ssSelect = createSelect();
  ui.ssSelect.position(360, 120);
  ui.ssSelect.option("Standard", "default");
  ui.ssSelect.option("ss01 – Wild", "ss01");
  ui.ssSelect.option("ss02 – Minimal", "ss02");
  ui.ssSelect.option("ss03 – Overcross", "ss03");
  ui.ssSelect.changed(() => {
    features.ss = ui.ssSelect.value();
    redraw();
  });
  ui.ssSelect.value("default");

  ui.randomAlt = createCheckbox("Random Alternates", false);
  ui.randomAlt.position(360, 150);
  ui.randomAlt.changed(() => {
    features.randomAlt = ui.randomAlt.checked();
    redraw();
  });

  ui.liga = createCheckbox("Ligaturen aktiv", true);
  ui.liga.position(360, 180);
  ui.liga.changed(() => {
    features.ligatures = ui.liga.checked();
    redraw();
  });
  ui.liga.checked(true);

  noLoop();
  redraw();
}

function draw() {
  background(255);

  // UI Labels
  fill(0);
  noStroke();
  text("Text (bis 10 Zeilen)", 20, 16);
  text("Ausrichtung", ui.alignSelect.x + ui.alignSelect.width + 10, 34);
  text("Textbox-Breite", ui.boxWidth.x + ui.boxWidth.width + 10, 64);
  text("Zeilenabstand", ui.leading.x + ui.leading.width + 10, 94);

  text("Krümmung", ui.curve.x + ui.curve.width + 10, 234);
  text("Schleifen", ui.loops.x + ui.loops.width + 10, 264);
  text("Radius", ui.radius.x + ui.radius.width + 10, 294);
  text("Strichstärke", ui.weight.x + ui.weight.width + 10, 324);
  text("Abstand", ui.spacing.x + ui.spacing.width + 10, 354);

  // --- Textbox / Layout ---
  let baseSize = 180;
  let boxX = 40;
  let boxW = ui.boxWidth.value();
  let topY = 660; // Start der Textfläche
  let leading = ui.leading.value();
  let alignMode = ui.alignSelect.value();

  // Textbox Rahmen
  noFill();
  stroke(220);
  strokeWeight(0);
  rect(boxX, topY - baseSize, boxW, leading * 0);

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
// Glyph-Definitionen (0..1-Koordinaten)
// --------------------------------------------------------
function initGlyphs() {
  glyphs = {
    // --- Großbuchstaben A–Z ---
    A: [
      [
        [0.1, 1],
        [0.5, 0],
        [0.9, 1],
      ],
      [
        [0.25, 0.6],
        [0.75, 0.6],
      ],
    ],
    B: [
      [
        [0.1, 0],
        [0.1, 1],
      ],
      [
        [0.1, 0],
        [0.7, 0.2],
        [0.1, 0.5],
      ],
      [
        [0.1, 0.5],
        [0.8, 0.75],
        [0.1, 1],
      ],
    ],
    C: [
      [
        [0.8, 0.1],
        [0.5, 0],
        [0.2, 0.2],
        [0.1, 0.5],
        [0.2, 0.8],
        [0.5, 1],
        [0.8, 0.9],
      ],
    ],
    D: [
      [
        [0.1, 0],
        [0.1, 1],
      ],
      [
        [0.1, 0],
        [0.7, 0.2],
        [0.9, 0.5],
        [0.7, 0.8],
        [0.1, 1],
      ],
    ],
    E: [
      [
        [0.8, 0],
        [0.1, 0],
        [0.1, 1],
        [0.8, 1],
      ],
      [
        [0.1, 0.5],
        [0.65, 0.5],
      ],
    ],
    F: [
      [
        [0.1, 0],
        [0.1, 1],
      ],
      [
        [0.1, 0],
        [0.8, 0],
      ],
      [
        [0.1, 0.5],
        [0.65, 0.5],
      ],
    ],
    G: [
      [
        [0.8, 0.2],
        [0.6, 0],
        [0.3, 0.1],
        [0.1, 0.5],
        [0.3, 0.9],
        [0.6, 1],
        [0.85, 0.8],
        [0.85, 0.6],
        [0.55, 0.6],
      ],
    ],
    H: [
      [
        [0.1, 0],
        [0.1, 1],
      ],
      [
        [0.9, 0],
        [0.9, 1],
      ],
      [
        [0.1, 0.5],
        [0.9, 0.5],
      ],
    ],
    I: [
      [
        [0.2, 0],
        [0.8, 0],
      ],
      [
        [0.5, 0],
        [0.5, 1],
      ],
      [
        [0.2, 1],
        [0.8, 1],
      ],
    ],
    J: [
      [
        [0.8, 0],
        [0.8, 0.7],
        [0.7, 0.95],
        [0.5, 1],
        [0.3, 0.85],
      ],
    ],
    K: [
      [
        [0.1, 0],
        [0.1, 1],
      ],
      [
        [0.1, 0.5],
        [0.9, 0],
      ],
      [
        [0.1, 0.5],
        [0.9, 1],
      ],
    ],
    L: [
      [
        [0.1, 0],
        [0.1, 1],
        [0.85, 1],
      ],
    ],
    M: [
      [
        [0.1, 1],
        [0.1, 0],
        [0.5, 0.5],
        [0.9, 0],
        [0.9, 1],
      ],
    ],
    N: [
      [
        [0.1, 1],
        [0.1, 0],
        [0.9, 1],
        [0.9, 0],
      ],
    ],
    O: [
      [
        [0.5, 0],
        [0.85, 0.2],
        [0.9, 0.5],
        [0.85, 0.8],
        [0.5, 1],
        [0.15, 0.8],
        [0.1, 0.5],
        [0.15, 0.2],
        [0.5, 0],
      ],
    ],
    P: [
      [
        [0.1, 1],
        [0.1, 0],
      ],
      [
        [0.1, 0],
        [0.8, 0.2],
        [0.7, 0.5],
        [0.1, 0.55],
      ],
    ],
    Q: [
      [
        [0.5, 0],
        [0.85, 0.2],
        [0.9, 0.5],
        [0.85, 0.8],
        [0.5, 1],
        [0.15, 0.8],
        [0.1, 0.5],
        [0.15, 0.2],
        [0.5, 0],
      ],
      [
        [0.6, 0.7],
        [0.9, 1],
      ],
    ],
    R: [
      [
        [0.1, 1],
        [0.1, 0],
      ],
      [
        [0.1, 0],
        [0.7, 0.15],
        [0.7, 0.45],
        [0.1, 0.55],
      ],
      [
        [0.1, 0.55],
        [0.75, 1],
      ],
    ],
    S: [
      [
        [0.8, 0.1],
        [0.4, 0],
        [0.2, 0.25],
        [0.6, 0.45],
        [0.8, 0.65],
        [0.6, 0.9],
        [0.2, 1],
      ],
    ],
    T: [
      [
        [0.1, 0],
        [0.9, 0],
      ],
      [
        [0.5, 0],
        [0.5, 1],
      ],
    ],
    U: [
      [
        [0.1, 0],
        [0.1, 0.7],
        [0.3, 1],
        [0.7, 1],
        [0.9, 0.7],
        [0.9, 0],
      ],
    ],
    V: [
      [
        [0.1, 0],
        [0.5, 1],
        [0.9, 0],
      ],
    ],
    W: [
      [
        [0.1, 0],
        [0.3, 1],
        [0.5, 0.4],
        [0.7, 1],
        [0.9, 0],
      ],
    ],
    X: [
      [
        [0.1, 0],
        [0.9, 1],
      ],
      [
        [0.9, 0],
        [0.1, 1],
      ],
    ],
    Y: [
      [
        [0.1, 0],
        [0.5, 0.5],
        [0.9, 0],
      ],
      [
        [0.5, 0.5],
        [0.5, 1],
      ],
    ],
    Z: [
      [
        [0.1, 0],
        [0.9, 0],
        [0.1, 1],
        [0.9, 1],
      ],
    ],

    // Fallback
    "?": [
      [
        [0.2, 0.2],
        [0.5, 0],
        [0.8, 0.2],
        [0.7, 0.4],
        [0.5, 0.5],
        [0.5, 0.7],
      ],
      [
        [0.5, 0.9],
        [0.5, 1],
      ],
    ],
  };

  // --- Kleinbuchstaben a–z ---
  glyphs["a"] = [
    [
      [0.3, 0.4],
      [0.55, 0.3],
      [0.8, 0.45],
      [0.8, 0.7],
      [0.55, 0.9],
      [0.3, 0.8],
      [0.3, 0.4],
    ],
    [
      [0.8, 0.45],
      [0.9, 0.2],
    ],
  ];
  glyphs["b"] = [
    [
      [0.2, 0],
      [0.2, 1],
    ],
    [
      [0.2, 0.4],
      [0.6, 0.3],
      [0.8, 0.5],
      [0.6, 0.7],
      [0.2, 0.75],
    ],
  ];
  glyphs["c"] = [
    [
      [0.8, 0.45],
      [0.6, 0.3],
      [0.3, 0.35],
      [0.2, 0.6],
      [0.4, 0.85],
      [0.7, 0.9],
    ],
  ];
  glyphs["d"] = [
    [
      [0.8, 0],
      [0.8, 1],
    ],
    [
      [0.8, 0.4],
      [0.55, 0.3],
      [0.3, 0.4],
      [0.25, 0.65],
      [0.45, 0.9],
      [0.7, 0.8],
    ],
  ];
  glyphs["e"] = [
    [
      [0.3, 0.55],
      [0.8, 0.55],
    ],
    [
      [0.8, 0.45],
      [0.6, 0.3],
      [0.35, 0.35],
      [0.25, 0.55],
      [0.35, 0.8],
      [0.7, 0.85],
    ],
  ];
  glyphs["f"] = [
    [
      [0.55, 0],
      [0.45, 0.25],
      [0.45, 1],
    ],
    [
      [0.25, 0.3],
      [0.7, 0.3],
    ],
  ];
  glyphs["g"] = [
    [
      [0.7, 0.35],
      [0.5, 0.25],
      [0.3, 0.35],
      [0.25, 0.6],
      [0.45, 0.85],
      [0.7, 0.8],
    ],
    [
      [0.7, 0.8],
      [0.75, 1.1],
      [0.45, 1.15],
      [0.25, 1.0],
    ],
  ];
  glyphs["h"] = [
    [
      [0.2, 0],
      [0.2, 1],
    ],
    [
      [0.2, 0.5],
      [0.55, 0.35],
      [0.8, 0.45],
      [0.8, 1],
    ],
  ];
  glyphs["i"] = [
    [
      [0.5, 0.4],
      [0.5, 0.95],
    ],
    [
      [0.5, 0.15],
      [0.5, 0.2],
    ],
  ];
  glyphs["j"] = [
    [
      [0.6, 0.4],
      [0.6, 1.1],
      [0.4, 1.2],
      [0.25, 1.0],
    ],
    [
      [0.6, 0.15],
      [0.6, 0.2],
    ],
  ];
  glyphs["k"] = [
    [
      [0.2, 0],
      [0.2, 1],
    ],
    [
      [0.2, 0.6],
      [0.8, 0.3],
    ],
    [
      [0.2, 0.6],
      [0.8, 0.95],
    ],
  ];
  glyphs["l"] = [[[0.4, 0], [0.4, 1]]];
  glyphs["m"] = [
    [
      [0.15, 0.95],
      [0.15, 0.45],
      [0.35, 0.3],
      [0.5, 0.45],
      [0.5, 0.95],
    ],
    [
      [0.5, 0.95],
      [0.5, 0.45],
      [0.7, 0.3],
      [0.85, 0.45],
      [0.85, 0.95],
    ],
  ];
  glyphs["n"] = [
    [
      [0.2, 0.95],
      [0.2, 0.45],
      [0.45, 0.3],
      [0.7, 0.45],
      [0.7, 0.95],
    ],
  ];
  glyphs["o"] = [
    [
      [0.5, 0.3],
      [0.75, 0.4],
      [0.8, 0.6],
      [0.7, 0.85],
      [0.45, 0.9],
      [0.25, 0.75],
      [0.25, 0.5],
      [0.4, 0.35],
      [0.5, 0.3],
    ],
  ];
  glyphs["p"] = [
    [
      [0.2, 0.4],
      [0.2, 1.2],
    ],
    [
      [0.2, 0.4],
      [0.55, 0.3],
      [0.8, 0.5],
      [0.6, 0.7],
      [0.2, 0.75],
    ],
  ];
  glyphs["q"] = [
    [
      [0.75, 0.4],
      [0.75, 1.2],
    ],
    [
      [0.75, 0.4],
      [0.5, 0.3],
      [0.3, 0.4],
      [0.25, 0.65],
      [0.4, 0.85],
      [0.65, 0.8],
    ],
  ];
  glyphs["r"] = [
    [
      [0.25, 0.95],
      [0.25, 0.45],
    ],
    [
      [0.25, 0.5],
      [0.5, 0.35],
      [0.7, 0.45],
    ],
  ];
  glyphs["s"] = [
    [
      [0.75, 0.35],
      [0.5, 0.3],
      [0.3, 0.4],
      [0.55, 0.55],
      [0.75, 0.7],
      [0.55, 0.85],
      [0.3, 0.9],
    ],
  ];
  glyphs["t"] = [
    [
      [0.5, 0.1],
      [0.45, 0.4],
      [0.45, 0.95],
    ],
    [
      [0.25, 0.4],
      [0.7, 0.4],
    ],
  ];
  glyphs["u"] = [
    [
      [0.2, 0.45],
      [0.2, 0.8],
      [0.4, 0.95],
      [0.65, 0.9],
      [0.8, 0.7],
      [0.8, 0.45],
    ],
  ];
  glyphs["v"] = [
    [
      [0.2, 0.45],
      [0.5, 0.95],
      [0.8, 0.45],
    ],
  ];
  glyphs["w"] = [
    [
      [0.15, 0.45],
      [0.3, 0.95],
      [0.5, 0.55],
      [0.7, 0.95],
      [0.85, 0.45],
    ],
  ];
  glyphs["x"] = [
    [
      [0.25, 0.4],
      [0.8, 0.9],
    ],
    [
      [0.8, 0.4],
      [0.25, 0.9],
    ],
  ];
  glyphs["y"] = [
    [
      [0.2, 0.45],
      [0.5, 0.75],
      [0.8, 0.45],
    ],
    [
      [0.5, 0.75],
      [0.5, 1.2],
    ],
  ];
  glyphs["z"] = [
    [
      [0.25, 0.45],
      [0.8, 0.45],
      [0.25, 0.9],
      [0.8, 0.9],
    ],
  ];

  // --- Ziffern 0–9 ---
  glyphs["0"] = [
    [
      [0.5, 0],
      [0.8, 0.2],
      [0.9, 0.5],
      [0.8, 0.8],
      [0.5, 1],
      [0.2, 0.8],
      [0.1, 0.5],
      [0.2, 0.2],
      [0.5, 0],
    ],
  ];
  glyphs["1"] = [
    [
      [0.4, 0.15],
      [0.5, 0],
      [0.5, 1],
    ],
    [
      [0.3, 1],
      [0.7, 1],
    ],
  ];
  glyphs["2"] = [
    [
      [0.2, 0.2],
      [0.4, 0],
      [0.7, 0.1],
      [0.8, 0.3],
      [0.6, 0.55],
      [0.3, 0.8],
      [0.2, 1],
      [0.8, 1],
    ],
  ];
  glyphs["3"] = [
    [
      [0.25, 0.1],
      [0.55, 0],
      [0.8, 0.15],
      [0.6, 0.35],
      [0.75, 0.55],
      [0.6, 0.8],
      [0.35, 1],
      [0.2, 0.9],
    ],
  ];
  glyphs["4"] = [
    [
      [0.7, 0],
      [0.7, 1],
    ],
    [
      [0.15, 0.5],
      [0.85, 0.5],
    ],
    [
      [0.3, 0],
      [0.15, 0.5],
    ],
  ];
  glyphs["5"] = [
    [
      [0.8, 0.1],
      [0.4, 0],
      [0.25, 0.35],
      [0.7, 0.35],
      [0.85, 0.6],
      [0.6, 0.9],
      [0.25, 1],
    ],
  ];
  glyphs["6"] = [
    [
      [0.7, 0.1],
      [0.45, 0],
      [0.2, 0.35],
      [0.25, 0.8],
      [0.5, 1],
      [0.8, 0.85],
      [0.7, 0.6],
      [0.4, 0.55],
      [0.25, 0.7],
    ],
  ];
  glyphs["7"] = [[[0.2, 0.05], [0.85, 0.05], [0.4, 1]]];
  glyphs["8"] = [
    [
      [0.5, 0],
      [0.8, 0.2],
      [0.5, 0.4],
      [0.2, 0.2],
      [0.5, 0],
    ],
    [
      [0.5, 0.4],
      [0.85, 0.65],
      [0.5, 1],
      [0.15, 0.65],
      [0.5, 0.4],
    ],
  ];
  glyphs["9"] = [
    [
      [0.25, 0.9],
      [0.5, 1],
      [0.8, 0.7],
      [0.75, 0.3],
      [0.5, 0],
      [0.3, 0.2],
      [0.55, 0.4],
      [0.75, 0.35],
    ],
  ];

  // --- Satzzeichen ---
  glyphs["."] = [[[0.45, 0.9], [0.55, 1.0]]];
  glyphs[","] = [[[0.45, 0.9], [0.55, 1.05], [0.45, 1.15]]];
  glyphs[":"] = [
    [
      [0.5, 0.25],
      [0.5, 0.3],
    ],
    [
      [0.5, 0.8],
      [0.5, 0.85],
    ],
  ];
  glyphs[";"] = [
    [
      [0.5, 0.25],
      [0.5, 0.3],
    ],
    [
      [0.45, 0.8],
      [0.55, 0.95],
      [0.45, 1.05],
    ],
  ];
  glyphs["!"] = [
    [
      [0.5, 0.05],
      [0.5, 0.8],
    ],
    [
      [0.5, 0.9],
      [0.5, 0.95],
    ],
  ];
  glyphs["-"] = [[[0.2, 0.55], [0.8, 0.5]]];
  glyphs["+"] = [
    [
      [0.5, 0.3],
      [0.5, 0.8],
    ],
    [
      [0.25, 0.55],
      [0.75, 0.55],
    ],
  ];
  glyphs["/"] = [[[0.2, 1.0], [0.8, 0.0]]];
  glyphs["("] = [
    [
      [0.7, 0.0],
      [0.4, 0.2],
      [0.3, 0.5],
      [0.4, 0.8],
      [0.7, 1.0],
    ],
  ];
  glyphs[")"] = [
    [
      [0.3, 0.0],
      [0.6, 0.2],
      [0.7, 0.5],
      [0.6, 0.8],
      [0.3, 1.0],
    ],
  ];
  glyphs['"'] = [
    [
      [0.35, 0.1],
      [0.35, 0.25],
    ],
    [
      [0.65, 0.1],
      [0.65, 0.25],
    ],
  ];
  glyphs["'"] = [[[0.5, 0.1], [0.55, 0.25]]];

  // --- Umlaute & ß ---
  glyphs["Ä"] = JSON.parse(JSON.stringify(glyphs["A"]));
  glyphs["Ä"].push([
    [0.3, -0.05],
    [0.3, 0.0],
  ]);
  glyphs["Ä"].push([
    [0.7, -0.05],
    [0.7, 0.0],
  ]);

  glyphs["Ö"] = JSON.parse(JSON.stringify(glyphs["O"]));
  glyphs["Ö"].push([
    [0.35, -0.05],
    [0.35, 0.0],
  ]);
  glyphs["Ö"].push([
    [0.65, -0.05],
    [0.65, 0.0],
  ]);

  glyphs["Ü"] = JSON.parse(JSON.stringify(glyphs["U"]));
  glyphs["Ü"].push([
    [0.35, -0.05],
    [0.35, 0.0],
  ]);
  glyphs["Ü"].push([
    [0.65, -0.05],
    [0.65, 0.0],
  ]);

  glyphs["ä"] = JSON.parse(JSON.stringify(glyphs["a"]));
  glyphs["ä"].push([
    [0.35, 0.15],
    [0.35, 0.2],
  ]);
  glyphs["ä"].push([
    [0.6, 0.15],
    [0.6, 0.2],
  ]);

  glyphs["ö"] = JSON.parse(JSON.stringify(glyphs["o"]));
  glyphs["ö"].push([
    [0.35, 0.15],
    [0.35, 0.2],
  ]);
  glyphs["ö"].push([
    [0.6, 0.15],
    [0.6, 0.2],
  ]);

  glyphs["ü"] = JSON.parse(JSON.stringify(glyphs["u"]));
  glyphs["ü"].push([
    [0.35, 0.15],
    [0.35, 0.2],
  ]);
  glyphs["ü"].push([
    [0.6, 0.15],
    [0.6, 0.2],
  ]);

  glyphs["ß"] = [
    [
      [0.2, 0.0],
      [0.35, 0.15],
      [0.35, 0.45],
    ],
    [
      [0.35, 0.15],
      [0.7, 0.1],
      [0.8, 0.3],
      [0.45, 0.4],
    ],
    [
      [0.45, 0.4],
      [0.75, 0.5],
      [0.8, 0.8],
      [0.5, 1.0],
      [0.3, 0.9],
    ],
  ];

  // ======================================================
  // EXTRA SYMBOLS: @€$%&§#*~ + Pfeile
  // (simple, loop-friendly strokes — du kannst später noch "typografischer" feilen)
  // ======================================================

  // @ : Außenring + kleines "a" + Häkchen
  glyphs["@"] = [
    [
      [0.55, 0.08],
      [0.78, 0.15],
      [0.9, 0.38],
      [0.82, 0.72],
      [0.55, 0.9],
      [0.25, 0.82],
      [0.12, 0.5],
      [0.25, 0.18],
      [0.55, 0.08],
    ],
    [
      [0.38, 0.55],
      [0.52, 0.42],
      [0.68, 0.48],
      [0.68, 0.64],
      [0.55, 0.72],
      [0.4, 0.66],
      [0.38, 0.55],
    ],
    [
      [0.68, 0.48],
      [0.78, 0.38],
      [0.82, 0.5],
      [0.75, 0.62],
    ],
  ];

  // € : C-Form + 2 Querstriche
  glyphs["€"] = [
    [
      [0.82, 0.18],
      [0.55, 0.06],
      [0.28, 0.18],
      [0.18, 0.5],
      [0.28, 0.82],
      [0.55, 0.94],
      [0.82, 0.82],
    ],
    [
      [0.22, 0.42],
      [0.7, 0.42],
    ],
    [
      [0.22, 0.6],
      [0.7, 0.6],
    ],
  ];

  // $ : S + Vertikalstrich
  glyphs["$"] = [
    [
      [0.78, 0.18],
      [0.45, 0.06],
      [0.22, 0.2],
      [0.55, 0.46],
      [0.8, 0.7],
      [0.55, 0.94],
      [0.22, 0.82],
    ],
    [
      [0.5, 0.02],
      [0.5, 0.98],
    ],
  ];

  // % : 2 Kreise + Diagonal
  glyphs["%"] = [
    [
      [0.25, 0.25],
      [0.35, 0.15],
      [0.45, 0.25],
      [0.35, 0.35],
      [0.25, 0.25],
    ],
    [
      [0.55, 0.75],
      [0.65, 0.65],
      [0.75, 0.75],
      [0.65, 0.85],
      [0.55, 0.75],
    ],
    [
      [0.25, 0.85],
      [0.75, 0.15],
    ],
  ];

  // & : loopige Form (vereinfacht)
  glyphs["&"] = [
    [
      [0.7, 0.22],
      [0.55, 0.08],
      [0.35, 0.18],
      [0.45, 0.38],
      [0.7, 0.6],
      [0.55, 0.88],
      [0.28, 0.78],
      [0.28, 0.62],
      [0.52, 0.52],
      [0.8, 0.9],
    ],
  ];

  // § : Doppel-S (vereinfacht)
  glyphs["§"] = [
    [
      [0.75, 0.16],
      [0.45, 0.06],
      [0.28, 0.22],
      [0.55, 0.4],
      [0.72, 0.56],
      [0.55, 0.72],
      [0.28, 0.62],
    ],
    [
      [0.72, 0.44],
      [0.45, 0.34],
      [0.28, 0.5],
      [0.55, 0.68],
      [0.72, 0.84],
      [0.55, 0.96],
      [0.28, 0.86],
    ],
  ];

  // # : Gitter
  glyphs["#"] = [
    [
      [0.35, 0.1],
      [0.3, 0.9],
    ],
    [
      [0.65, 0.1],
      [0.6, 0.9],
    ],
    [
      [0.18, 0.38],
      [0.85, 0.32],
    ],
    [
      [0.15, 0.68],
      [0.82, 0.62],
    ],
  ];

  // * : Stern
  glyphs["*"] = [
    [
      [0.5, 0.15],
      [0.5, 0.85],
    ],
    [
      [0.22, 0.32],
      [0.78, 0.68],
    ],
    [
      [0.78, 0.32],
      [0.22, 0.68],
    ],
  ];

  // ~ : Welle
  glyphs["~"] = [
    [
      [0.15, 0.58],
      [0.32, 0.42],
      [0.48, 0.58],
      [0.65, 0.42],
      [0.85, 0.58],
    ],
  ];

  // ---------------------------
  // Pfeile (einheitlicher Style)
  // ---------------------------

  // ←
  glyphs["←"] = [
    [
      [0.85, 0.5],
      [0.2, 0.5],
    ],
    [
      [0.35, 0.35],
      [0.2, 0.5],
      [0.35, 0.65],
    ],
  ];

  // →
  glyphs["→"] = [
    [
      [0.15, 0.5],
      [0.8, 0.5],
    ],
    [
      [0.65, 0.35],
      [0.8, 0.5],
      [0.65, 0.65],
    ],
  ];

  // ↑
  glyphs["↑"] = [
    [
      [0.5, 0.85],
      [0.5, 0.2],
    ],
    [
      [0.35, 0.35],
      [0.5, 0.2],
      [0.65, 0.35],
    ],
  ];

  // ↓
  glyphs["↓"] = [
    [
      [0.5, 0.15],
      [0.5, 0.8],
    ],
    [
      [0.35, 0.65],
      [0.5, 0.8],
      [0.65, 0.65],
    ],
  ];

  // ↔
  glyphs["↔"] = [
    [
      [0.2, 0.5],
      [0.8, 0.5],
    ],
    [
      [0.35, 0.35],
      [0.2, 0.5],
      [0.35, 0.65],
    ],
    [
      [0.65, 0.35],
      [0.8, 0.5],
      [0.65, 0.65],
    ],
  ];

  // ↕
  glyphs["↕"] = [
    [
      [0.5, 0.2],
      [0.5, 0.8],
    ],
    [
      [0.35, 0.35],
      [0.5, 0.2],
      [0.65, 0.35],
    ],
    [
      [0.35, 0.65],
      [0.5, 0.8],
      [0.65, 0.65],
    ],
  ];

  // ↗ (NE)
  glyphs["↗"] = [
    [
      [0.25, 0.75],
      [0.75, 0.25],
    ],
    [
      [0.62, 0.25],
      [0.75, 0.25],
      [0.75, 0.38],
    ],
  ];

  // ↖ (NW)
  glyphs["↖"] = [
    [
      [0.75, 0.75],
      [0.25, 0.25],
    ],
    [
      [0.38, 0.25],
      [0.25, 0.25],
      [0.25, 0.38],
    ],
  ];

  // ↘ (SE)
  glyphs["↘"] = [
    [
      [0.25, 0.25],
      [0.75, 0.75],
    ],
    [
      [0.62, 0.75],
      [0.75, 0.75],
      [0.75, 0.62],
    ],
  ];

  // ↙ (SW)
  glyphs["↙"] = [
    [
      [0.75, 0.25],
      [0.25, 0.75],
    ],
    [
      [0.38, 0.75],
      [0.25, 0.75],
      [0.25, 0.62],
    ],
  ];

  // ↰ (up then left)
  glyphs["↰"] = [
    [
      [0.65, 0.8],
      [0.65, 0.25],
      [0.25, 0.25],
    ],
    [
      [0.38, 0.12],
      [0.25, 0.25],
      [0.38, 0.38],
    ],
  ];

  // ↱ (up then right)
  glyphs["↱"] = [
    [
      [0.35, 0.8],
      [0.35, 0.25],
      [0.75, 0.25],
    ],
    [
      [0.62, 0.12],
      [0.75, 0.25],
      [0.62, 0.38],
    ],
  ];

  // ↩ (return / hook left) — vereinfacht als "rechts->links mit Haken"
  glyphs["↩"] = [
    [
      [0.8, 0.35],
      [0.35, 0.35],
      [0.35, 0.75],
      [0.2, 0.75],
    ],
    [
      [0.35, 0.6],
      [0.2, 0.75],
      [0.35, 0.9],
    ],
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

  // Alternates
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

  // Ligaturen (ff, fi, fl, tt, ss, st)
  ligatures["ff"] = [
    [
      [0.15, 0],
      [0.15, 1],
    ],
    [
      [0.45, 0],
      [0.45, 1],
    ],
    [
      [0.1, 0.32],
      [0.9, 0.3],
    ],
  ];
  ligatures["fi"] = [
    [
      [0.2, 0],
      [0.2, 1],
    ],
    [
      [0.1, 0.32],
      [0.8, 0.3],
    ],
    [
      [0.75, 0.4],
      [0.75, 1],
    ],
    [
      [0.75, 0.15],
      [0.75, 0.2],
    ],
  ];
  ligatures["fl"] = [
    [
      [0.2, 0],
      [0.2, 1],
    ],
    [
      [0.1, 0.32],
      [0.8, 0.3],
    ],
    [
      [0.75, 0],
      [0.75, 1],
    ],
  ];
  ligatures["tt"] = [
    [
      [0.25, 0.1],
      [0.25, 0.95],
    ],
    [
      [0.55, 0.1],
      [0.55, 0.95],
    ],
    [
      [0.05, 0.4],
      [0.9, 0.4],
    ],
  ];
  ligatures["ss"] = [
    [
      [0.15, 0.2],
      [0.45, 0.1],
      [0.3, 0.4],
      [0.5, 0.55],
      [0.25, 0.8],
      [0.1, 0.9],
    ],
    [
      [0.5, 0.2],
      [0.8, 0.1],
      [0.65, 0.4],
      [0.85, 0.55],
      [0.6, 0.8],
      [0.45, 0.9],
    ],
  ];
  ligatures["st"] = [
    [
      [0.15, 0.2],
      [0.45, 0.1],
      [0.3, 0.4],
      [0.55, 0.55],
      [0.3, 0.8],
      [0.15, 0.9],
    ],
    [
      [0.65, 0.1],
      [0.6, 0.4],
      [0.6, 0.95],
    ],
    [
      [0.45, 0.4],
      [0.9, 0.4],
    ],
  ];
}

// --------------------------------------------------------
// Schleifen hinzufügen
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
// transformierte Strokes (inkl. Schleifen & Radius)
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
// Stylistic-Set-Parameter berechnen
// --------------------------------------------------------
function computeEffectiveParams() {
  let loops = ui.loops.value();
  let radius = ui.radius.value();
  let weight = ui.weight.value();
  let tight = ui.curve.value();

  switch (features.ss) {
    case "ss01": // Wild
      loops *= 1.4;
      radius *= 1.3;
      tight -= 0.2;
      break;
    case "ss02": // Minimal
      loops *= 0.5;
      radius *= 0.8;
      tight += 0.3;
      weight *= 0.8;
      break;
    case "ss03": // Overcross
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
// Glyph-Auswahl inkl. Ligaturen & Alternates
// --------------------------------------------------------
function getGlyphInfo(txt, index) {
  let spacing = ui.spacing.value();
  let ch = txt[index];

  if (ch === " ") {
    return { type: "space", consumed: 1, advance: spacing * 0.6 };
  }

  // Ligaturen prüfen (3er, dann 2er)
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

  // normale Glyphe + Alternates
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
// Canvas-Rendering
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

    if (fillMode) {
      stroke(0);
      strokeWeight(w + 4);
      beginShape();
      curveVertex(first.x, first.y);
      for (let v of pts) curveVertex(v.x, v.y);
      curveVertex(last.x, last.y);
      endShape();
    } else {
      stroke(0);
      strokeWeight(w + 4);
      beginShape();
      curveVertex(first.x, first.y);
      for (let v of pts) curveVertex(v.x, v.y);
      curveVertex(last.x, last.y);
      endShape();

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
// Kurven-Sampling für SVG (approx. curveVertex)
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
// SVG-Export (mehrzeilig + Align)
// --------------------------------------------------------
function exportSvg() {
  let baseSize = 170;
  let fillMode = ui.fillMode.checked();

  let boxX = 40;
  let boxW = ui.boxWidth.value();
  let topY = 520;
  let leading = ui.leading.value();
  let alignMode = ui.alignSelect.value();

  currentParams = computeEffectiveParams();
  let wStroke = currentParams.weight;
  let tight = currentParams.tight;
  curveTightness(tight);

  let svg = [];
  svg.push('<?xml version="1.0" encoding="UTF-8"?>');
  svg.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
  );

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

      let transformed = getTransformedStrokes(
        info.strokes,
        x,
        baselineY - baseSize,
        baseSize
      );

      for (let pts of transformed) {
        if (pts.length < 2) continue;

        let curvePts = sampleCurvePoints(pts, 16);

        let d = `M ${curvePts[0].x.toFixed(2)} ${curvePts[0].y.toFixed(2)}`;
        for (let j = 1; j < curvePts.length; j++) {
          d += ` L ${curvePts[j].x.toFixed(2)} ${curvePts[j].y.toFixed(2)}`;
        }

        if (fillMode) {
          svg.push(
            `<path d="${d}" fill="none" stroke="black" stroke-width="${(
              wStroke + 4
            ).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" />`
          );
        } else {
          svg.push(
            `<path d="${d}" fill="none" stroke="black" stroke-width="${(
              wStroke + 4
            ).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" />`
          );
          svg.push(
            `<path d="${d}" fill="none" stroke="white" stroke-width="${wStroke.toFixed(
              2
            )}" stroke-linecap="round" stroke-linejoin="round" />`
          );
        }
      }

      x += info.advance;
      i += info.consumed;
    }
  }

  svg.push("</svg>");
  saveStrings(svg, "loop_text", "svg");
}
export const FIRE_KEY = "f";
export const SHIP_SPEED = 22;
export const COMBO_WINDOW_MS = 1400;

export const BULLET = {
  speedPxPerFrame: 18,
  maxLifeMs: 1800,
  thickness: 4,
  length: 18,
  cooldownMs: 90,
};

export const WEAPONS = {
  pulse: {
    label: "Pulse",
    cooldownMs: 90,
    speedBoost: 0,
    damage: 1,
    pellets: 1,
    spread: 0,
    pierce: 0,
    gradient:
      "linear-gradient(to bottom, rgba(139,92,246,0), rgba(139,92,246,1), rgba(167,139,250,1), rgba(139,92,246,0))",
    glow: "0 0 18px rgba(139,92,246,0.85)",
  },
  scatter: {
    label: "Scatter",
    cooldownMs: 150,
    speedBoost: -2,
    damage: 1,
    pellets: 3,
    spread: 1.4,
    pierce: 0,
    gradient:
      "linear-gradient(to bottom, rgba(236,72,153,0), rgba(236,72,153,1), rgba(244,114,182,1), rgba(236,72,153,0))",
    glow: "0 0 18px rgba(236,72,153,0.85)",
  },
  rail: {
    label: "Rail",
    cooldownMs: 240,
    speedBoost: 9,
    damage: 2,
    pellets: 1,
    spread: 0,
    pierce: 1,
    gradient:
      "linear-gradient(to bottom, rgba(56,189,248,0), rgba(56,189,248,1), rgba(125,211,252,1), rgba(56,189,248,0))",
    glow: "0 0 22px rgba(56,189,248,0.9)",
  },
};

export const IMPACT = {
  imgUrl: "./img/fire.png",
  lifeMs: 420,
  size: 180,
  burstCount: 10,
  burstSpreadPx: 90,
};

export const SCROLL = { durationMs: 900 };

export const DRIFT = {
  intervalMs: 18,
  baseDurationMin: 300,
  baseDurationMax: 520,
  baseLengthMin: 12,
  baseLengthMax: 42,
};

export const EXCLUDE_SELECTORS = [
  ".destroy-toggle",
  ".destroy-layer",
  ".ship",
  ".ship *",
  ".destroy-intro",
  ".destroy-intro *",
  ".page-flash",
  ".destroy-hud",
  ".destroy-toast",
  ".portfolio-thanks",
  ".portfolio-thanks *",
  ".destroy-ui",
  ".hero-hit-bg",
  ".hero-hit-divider",
  "script",
  "style",
  "meta",
  "link",
  "head",
];

export const HP = {
  item: 3,
  section: 12,
  header: 10,
};

export const ITEM_SELECTOR = [
  "h1",
  "h2",
  "h3",
  "h4",
  "p",
  "li",
  "span",
  "strong",
  "em",
  "time",
  "small",
  "a",
  "button",
  "input",
  "textarea",
  "label",
  ".hero__tag",
  ".hero__subtitle",
  ".hero__actions",
  ".section-head",
  ".nav",
  ".nav__list li",
  ".btn",
  ".nav__list a",
  ".logo",
  ".tags li",
  ".skill-pills li",
  ".project-links a",
  ".project-more",
  ".edu-item",
  ".field__control",
  ".link-btn",
  ".contact-btn",
  ".project-thumb",
  ".project-card",
  ".about__panel",
  ".panel",
  ".code-window",
].join(",");

export const SECTION_SELECTOR = "main section[id], .hero";

export const SCROLL_BY_KEYS = {
  maxPxPerFrame: 22,
  accel: 0.32,
  friction: 0.24,
};

export const Z_INDEX = {
  impact: 10003,
  impactFront: 10004,
  bullet: 10001,
};

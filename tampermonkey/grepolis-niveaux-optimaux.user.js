// ==UserScript==
// @name         Grepolis - Niveaux optimaux de batiments
// @namespace    https://github.com/GoldenEagleFr/Wiki_Grepolis
// @version      1.3.0
// @description  Niveaux optimaux avec priorite, mode monde (Revolte/Conquete), fenetre deplacable et redimensionnable.
// @author       GoldenEagleFr
// @match        https://*.grepolis.com/game/*
// @match        https://*.grepolis.fr/game/*
// @grant        unsafeWindow
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  const uw = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
  const STORAGE_KEY = "tm_grepolis_preset_v1";
  const WORLD_MODE_KEY = "tm_grepolis_world_mode_v1";
  const CUSTOM_TARGETS_KEY_PREFIX = "tm_grepolis_custom_targets_v2";
  const LEGACY_CUSTOM_TARGETS_KEY = "tm_grepolis_custom_targets_v1";
  const PANEL_LAYOUT_KEY = "tm_grepolis_panel_layout_v1";
  const PANEL_ID = "tm-grepolis-opt-panel";
  const CUSTOM_PRESET_ID = "custom";
  const ICON_BASE_URL = "https://raw.githubusercontent.com/GoldenEagleFr/Wiki_Grepolis/main/assets/icons/batiments/";
  const SPECIAL_BUILDING_KEYS = new Set(["lighthouse", "tower", "thermal", "library", "theater", "trade_office"]);
  const DEFAULT_PANEL_LAYOUT = Object.freeze({
    top: 86,
    right: 12,
    left: null,
    width: 300,
    height: 0
  });
  const WORLD_MODES = Object.freeze({
    revolte: { label: "Revolte" },
    conquete: { label: "Conquete" }
  });
  const DEFAULT_WORLD_MODE = "revolte";
  const BUILDING_KEY_ALIASES = {
    dock: ["dock", "docks", "harbor"],
    storage: ["storage", "warehouse"],
    market: ["market", "marketplace"],
    wall: ["wall", "city_wall"],
    main: ["main", "senate"]
  };
  const KNOWN_BUILDING_KEYS = Object.freeze([
    "farm",
    "dock",
    "academy",
    "storage",
    "market",
    "barracks",
    "temple",
    "wall",
    "tower",
    "thermal",
    "lighthouse",
    "library",
    "theater",
    "trade_office",
    "main",
    "lumber",
    "stoner",
    "ironer"
  ]);

  const BUILDING_ICON_FILES = {
    farm: "farm.png",
    dock: "docks.png",
    academy: "academy.png",
    storage: "storage.png",
    market: "market.png",
    barracks: "barracks.png",
    temple: "temple.png",
    wall: "wall.png",
    tower: "tower.png",
    thermal: "thermal.png",
    lighthouse: "lighthouse.png",
    library: "library.png",
    theater: "theater.png",
    trade_office: "trade_office.png",
    main: "senate.png",
    lumber: "lumber.png",
    stoner: "stoner.png",
    ironer: "ironer.png"
  };

  const BUILDING_LABELS = {
    farm: "Ferme",
    dock: "Port",
    academy: "Academie",
    storage: "Entrepot",
    market: "Marche",
    barracks: "Caserne",
    temple: "Temple",
    wall: "Rempart",
    tower: "Tour",
    thermal: "Thermes",
    lighthouse: "Phare",
    library: "Bibliotheque",
    theater: "Theatre",
    trade_office: "Comptoir",
    main: "Senat",
    lumber: "Scierie",
    stoner: "Carriere",
    ironer: "Mine d'argent"
  };

  const PRESETS_BY_MODE = {
    revolte: {
      def_navale: {
        label: "DEF navale",
        specialBuilding: { key: "lighthouse", target: [1, 1] },
        priorityOrder: ["farm", "main", "dock", "academy", "lighthouse", "storage", "market", "barracks", "temple"],
        targets: {
          farm: [45, 45],
          main: [24, 25],
          dock: [25, 30],
          academy: [30, 30],
          lighthouse: [1, 1],
          storage: [30, 35],
          market: [15, 20],
          barracks: [10, 15],
          temple: [1, 10]
        }
      },
      off_navale: {
        label: "OFF navale",
        specialBuilding: { key: "lighthouse", target: [1, 1] },
        priorityOrder: ["farm", "main", "dock", "market", "academy", "lighthouse", "storage", "wall", "temple"],
        targets: {
          farm: [45, 45],
          main: [24, 25],
          dock: [30, 30],
          market: [20, 25],
          academy: [28, 30],
          lighthouse: [1, 1],
          storage: [28, 32],
          wall: [1, 10],
          temple: [1, 10]
        }
      },
      def_terre: {
        label: "DEF terrestre",
        specialBuilding: { key: "tower", target: [1, 1] },
        priorityOrder: ["farm", "main", "barracks", "wall", "tower", "academy", "storage", "market", "temple"],
        targets: {
          farm: [45, 45],
          main: [24, 25],
          barracks: [20, 25],
          wall: [25, 25],
          tower: [1, 1],
          academy: [30, 30],
          market: [15, 20],
          storage: [30, 35],
          temple: [1, 10]
        }
      },
      off_terre: {
        label: "OFF terrestre",
        specialBuilding: { key: "thermal", target: [1, 1] },
        priorityOrder: ["farm", "main", "barracks", "academy", "dock", "market", "thermal", "wall", "temple"],
        targets: {
          farm: [45, 45],
          main: [24, 25],
          barracks: [20, 25],
          academy: [30, 30],
          dock: [20, 25],
          market: [20, 20],
          thermal: [1, 1],
          wall: [1, 10],
          temple: [1, 10]
        }
      },
      off_myth: {
        label: "OFF mythique",
        specialBuilding: { key: "thermal", target: [1, 1] },
        priorityOrder: ["farm", "main", "temple", "academy", "barracks", "dock", "market", "thermal", "wall"],
        targets: {
          farm: [45, 45],
          main: [24, 25],
          temple: [25, 30],
          academy: [30, 30],
          barracks: [20, 20],
          dock: [20, 20],
          market: [20, 20],
          thermal: [1, 1],
          wall: [1, 10]
        }
      },
      def_myth: {
        label: "DEF mythique",
        specialBuilding: { key: "tower", target: [1, 1] },
        priorityOrder: ["farm", "main", "temple", "wall", "tower", "barracks", "academy", "storage", "market"],
        targets: {
          farm: [45, 45],
          main: [24, 25],
          temple: [25, 30],
          wall: [25, 25],
          tower: [1, 1],
          barracks: [20, 20],
          academy: [30, 30],
          market: [15, 20],
          storage: [30, 35]
        }
      }
    },
    conquete: {
      def_navale: {
        label: "DEF navale",
        specialBuilding: { key: "lighthouse", target: [1, 1] },
        priorityOrder: ["farm", "main", "dock", "academy", "lighthouse", "storage", "market", "barracks", "temple"],
        targets: {
          farm: [45, 45],
          main: [24, 25],
          dock: [25, 30],
          academy: [30, 30],
          lighthouse: [1, 1],
          storage: [32, 35],
          market: [18, 22],
          barracks: [10, 15],
          temple: [5, 15]
        }
      },
      off_navale: {
        label: "OFF navale",
        specialBuilding: { key: "lighthouse", target: [1, 1] },
        priorityOrder: ["farm", "main", "dock", "market", "academy", "lighthouse", "storage", "wall", "temple"],
        targets: {
          farm: [45, 45],
          main: [24, 25],
          dock: [30, 30],
          market: [22, 25],
          academy: [30, 30],
          lighthouse: [1, 1],
          storage: [30, 35],
          wall: [1, 5],
          temple: [1, 10]
        }
      },
      def_terre: {
        label: "DEF terrestre",
        specialBuilding: { key: "tower", target: [1, 1] },
        priorityOrder: ["farm", "main", "barracks", "wall", "tower", "academy", "storage", "market", "temple"],
        targets: {
          farm: [45, 45],
          main: [24, 25],
          barracks: [20, 25],
          wall: [25, 25],
          tower: [1, 1],
          academy: [30, 30],
          market: [18, 22],
          storage: [32, 35],
          temple: [1, 10]
        }
      },
      off_terre: {
        label: "OFF terrestre",
        specialBuilding: { key: "thermal", target: [1, 1] },
        priorityOrder: ["farm", "main", "barracks", "academy", "dock", "market", "thermal", "wall", "temple"],
        targets: {
          farm: [45, 45],
          main: [24, 25],
          barracks: [20, 25],
          academy: [30, 30],
          dock: [18, 22],
          market: [22, 25],
          thermal: [1, 1],
          wall: [1, 5],
          temple: [1, 10]
        }
      },
      off_myth: {
        label: "OFF mythique",
        specialBuilding: { key: "thermal", target: [1, 1] },
        priorityOrder: ["farm", "main", "temple", "academy", "barracks", "dock", "market", "thermal", "wall"],
        targets: {
          farm: [45, 45],
          main: [24, 25],
          temple: [28, 30],
          academy: [30, 30],
          barracks: [20, 20],
          dock: [18, 20],
          market: [22, 25],
          thermal: [1, 1],
          wall: [1, 5]
        }
      },
      def_myth: {
        label: "DEF mythique",
        specialBuilding: { key: "tower", target: [1, 1] },
        priorityOrder: ["farm", "main", "temple", "wall", "tower", "barracks", "academy", "storage", "market"],
        targets: {
          farm: [45, 45],
          main: [24, 25],
          temple: [28, 30],
          wall: [25, 25],
          tower: [1, 1],
          barracks: [20, 20],
          academy: [30, 30],
          market: [18, 22],
          storage: [32, 35]
        }
      }
    }
  };

  let isCustomEditMode = false;
  let refreshTimer = null;
  const levelCacheByTown = new Map();

  function toInt(value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      return fallback;
    }
    return Math.max(0, Math.floor(n));
  }

  function normalizeRange(range) {
    if (!Array.isArray(range) || range.length !== 2) {
      return null;
    }
    let min = toInt(range[0], 0);
    let max = toInt(range[1], 0);
    if (max < min) {
      const tmp = min;
      min = max;
      max = tmp;
    }
    return [min, max];
  }

  function cloneTargets(targets) {
    const out = {};
    if (!targets || typeof targets !== "object") {
      return out;
    }
    Object.entries(targets).forEach(([key, value]) => {
      const normalized = normalizeRange(value);
      if (normalized) {
        out[key] = normalized;
      }
    });
    return out;
  }

  function getSelectedWorldMode() {
    const stored = localStorage.getItem(WORLD_MODE_KEY);
    if (stored && WORLD_MODES[stored]) {
      return stored;
    }
    return DEFAULT_WORLD_MODE;
  }

  function setSelectedWorldMode(mode) {
    const nextMode = WORLD_MODES[mode] ? mode : DEFAULT_WORLD_MODE;
    localStorage.setItem(WORLD_MODE_KEY, nextMode);
  }

  function getPresetMap(modeOverride) {
    const mode = modeOverride && WORLD_MODES[modeOverride] ? modeOverride : getSelectedWorldMode();
    return PRESETS_BY_MODE[mode] || PRESETS_BY_MODE[DEFAULT_WORLD_MODE];
  }

  function getDefaultPresetKey(presets) {
    if (presets && presets.def_navale) {
      return "def_navale";
    }
    const first = presets ? Object.keys(presets)[0] : "";
    return first || "def_navale";
  }

  function getCustomTargetsStorageKey() {
    return `${CUSTOM_TARGETS_KEY_PREFIX}_${getSelectedWorldMode()}`;
  }

  function getDefaultCustomTargets() {
    const presets = getPresetMap();
    const fallbackKey = getDefaultPresetKey(presets);
    const fallback = presets[fallbackKey];
    return cloneTargets((fallback && fallback.targets) || {});
  }

  function inferSpecialBuilding(targets) {
    if (!targets || typeof targets !== "object") {
      return null;
    }
    const candidates = Object.keys(targets).filter((key) => SPECIAL_BUILDING_KEYS.has(key));
    if (!candidates.length) {
      return null;
    }
    candidates.sort((a, b) => {
      const aRange = normalizeRange(targets[a]) || [0, 0];
      const bRange = normalizeRange(targets[b]) || [0, 0];
      return bRange[1] - aRange[1];
    });
    const bestKey = candidates[0];
    return {
      key: bestKey,
      target: normalizeRange(targets[bestKey]) || [1, 1]
    };
  }

  function buildPriorityOrder(baseOrder, targets) {
    const ordered = [];
    const seen = new Set();
    if (Array.isArray(baseOrder)) {
      baseOrder.forEach((key) => {
        if (targets[key] && !seen.has(key)) {
          seen.add(key);
          ordered.push(key);
        }
      });
    }
    Object.keys(targets).forEach((key) => {
      if (!seen.has(key)) {
        seen.add(key);
        ordered.push(key);
      }
    });
    return ordered;
  }

  function getCustomTargets() {
    const storageKey = getCustomTargetsStorageKey();
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        const legacyRaw = localStorage.getItem(LEGACY_CUSTOM_TARGETS_KEY);
        if (legacyRaw) {
          try {
            const legacyParsed = JSON.parse(legacyRaw);
            const legacyNormalized = cloneTargets(legacyParsed);
            if (Object.keys(legacyNormalized).length) {
              saveCustomTargets(legacyNormalized);
              return legacyNormalized;
            }
          } catch (_) {}
        }
        return getDefaultCustomTargets();
      }
      const parsed = JSON.parse(raw);
      const normalized = cloneTargets(parsed);
      if (Object.keys(normalized).length) {
        return normalized;
      }
    } catch (_) {}
    return getDefaultCustomTargets();
  }

  function saveCustomTargets(targets) {
    localStorage.setItem(getCustomTargetsStorageKey(), JSON.stringify(cloneTargets(targets)));
  }

  function getPresetConfig(presetKey) {
    const presets = getPresetMap();
    if (presetKey === CUSTOM_PRESET_ID) {
      const targets = getCustomTargets();
      return {
        key: CUSTOM_PRESET_ID,
        label: "Personnalise",
        targets,
        priorityOrder: buildPriorityOrder([], targets),
        specialBuilding: inferSpecialBuilding(targets),
        isCustom: true
      };
    }

    if (presets[presetKey]) {
      const preset = presets[presetKey];
      const targets = preset.targets;
      return {
        key: presetKey,
        label: preset.label,
        targets,
        priorityOrder: buildPriorityOrder(preset.priorityOrder, targets),
        specialBuilding: preset.specialBuilding || inferSpecialBuilding(targets),
        isCustom: false
      };
    }

    const fallbackKey = getDefaultPresetKey(presets);
    const fallback = presets[fallbackKey];
    if (!fallback) {
      return {
        key: CUSTOM_PRESET_ID,
        label: "Personnalise",
        targets: getCustomTargets(),
        priorityOrder: [],
        specialBuilding: null,
        isCustom: true
      };
    }
    return {
      key: fallbackKey,
      label: fallback.label,
      targets: fallback.targets,
      priorityOrder: buildPriorityOrder(fallback.priorityOrder, fallback.targets),
      specialBuilding: fallback.specialBuilding || inferSpecialBuilding(fallback.targets),
      isCustom: false
    };
  }

  function getPriorityPlan(preset, levels) {
    const order = Array.isArray(preset.priorityOrder) ? preset.priorityOrder : Object.keys(preset.targets);
    const orderIndex = new Map(order.map((key, index) => [key, index]));
    const tasks = [];

    Object.entries(preset.targets).forEach(([key, range]) => {
      const normalized = normalizeRange(range);
      if (!normalized) {
        return;
      }
      const [min, max] = normalized;
      const level = getLevelForBuilding(levels, key);
      if (level < min) {
        tasks.push({
          key,
          kind: "required",
          level,
          min,
          max,
          gap: min - level,
          order: orderIndex.has(key) ? orderIndex.get(key) : 9999
        });
      } else if (level < max) {
        tasks.push({
          key,
          kind: "optional",
          level,
          min,
          max,
          gap: max - level,
          order: orderIndex.has(key) ? orderIndex.get(key) : 9999
        });
      }
    });

    tasks.sort((a, b) => {
      const groupA = a.kind === "required" ? 0 : 1;
      const groupB = b.kind === "required" ? 0 : 1;
      if (groupA !== groupB) {
        return groupA - groupB;
      }
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      if (b.gap !== a.gap) {
        return b.gap - a.gap;
      }
      const labelA = BUILDING_LABELS[a.key] || a.key;
      const labelB = BUILDING_LABELS[b.key] || b.key;
      return labelA.localeCompare(labelB, "fr");
    });

    return tasks;
  }

  function getSelectedPreset() {
    const presets = getPresetMap();
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === CUSTOM_PRESET_ID || (stored && presets[stored])) {
      return stored;
    }
    return getDefaultPresetKey(presets);
  }

  function setSelectedPreset(key) {
    localStorage.setItem(STORAGE_KEY, key);
  }

  function getIconUrl(buildingKey) {
    const file = BUILDING_ICON_FILES[buildingKey];
    if (!file) {
      return null;
    }
    return `${ICON_BASE_URL}${file}`;
  }

  function getTown() {
    try {
      if (uw.ITowns && typeof uw.ITowns.getCurrentTown === "function") {
        const town = uw.ITowns.getCurrentTown();
        if (town) {
          return town;
        }
      }
    } catch (_) {}

    try {
      const townId = uw.Game && uw.Game.townId;
      if (townId && uw.ITowns && typeof uw.ITowns.getTown === "function") {
        return uw.ITowns.getTown(townId);
      }
    } catch (_) {}

    return null;
  }

  function getTownName(town) {
    if (!town) {
      return "Ville active";
    }
    try {
      if (typeof town.getName === "function") {
        return town.getName() || "Ville active";
      }
    } catch (_) {}
    try {
      if (town.attributes && town.attributes.name) {
        return String(town.attributes.name);
      }
    } catch (_) {}
    return "Ville active";
  }

  function getTownIdentifier(town) {
    if (!town) {
      return "unknown";
    }
    try {
      if (typeof town.getId === "function") {
        const id = town.getId();
        if (id !== null && id !== undefined && id !== "") {
          return `id:${String(id)}`;
        }
      }
    } catch (_) {}
    try {
      if (town.attributes && town.attributes.id !== undefined && town.attributes.id !== null) {
        return `id:${String(town.attributes.id)}`;
      }
    } catch (_) {}
    try {
      if (town.id !== undefined && town.id !== null) {
        return `id:${String(town.id)}`;
      }
    } catch (_) {}
    return `name:${getTownName(town)}`;
  }

  function readNumericValue(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (/^\d+$/.test(trimmed)) {
        return Number(trimmed);
      }
    }
    return null;
  }

  function getLevelForBuilding(levels, buildingKey) {
    if (!levels || !buildingKey) {
      return 0;
    }
    const aliases = BUILDING_KEY_ALIASES[buildingKey] || [buildingKey];
    for (const key of aliases) {
      if (typeof levels[key] === "number") {
        return levels[key];
      }
    }
    return 0;
  }

  function extractBuildingLevels(town) {
    if (!town) {
      return null;
    }

    let attributes = null;
    let model = null;

    try {
      if (typeof town.buildings === "function") {
        model = town.buildings();
        if (model && model.attributes && typeof model.attributes === "object") {
          attributes = model.attributes;
        }
      }
    } catch (_) {}

    if (!attributes) {
      try {
        if (town.attributes && town.attributes.buildings && typeof town.attributes.buildings === "object") {
          attributes = town.attributes.buildings;
        }
      } catch (_) {}
    }

    if (!attributes) {
      return null;
    }

    const levels = {};
    for (const [key, value] of Object.entries(attributes)) {
      const parsed = readNumericValue(value);
      if (parsed !== null) {
        levels[key] = parsed;
      }
    }

    if (model && typeof model.get === "function") {
      KNOWN_BUILDING_KEYS.forEach((buildingKey) => {
        const aliases = BUILDING_KEY_ALIASES[buildingKey] || [buildingKey];
        aliases.forEach((aliasKey) => {
          if (typeof levels[aliasKey] === "number") {
            return;
          }
          try {
            const parsed = readNumericValue(model.get(aliasKey));
            if (parsed !== null) {
              levels[aliasKey] = parsed;
            }
          } catch (_) {}
        });
      });
    }

    if (typeof levels.docks === "number" && typeof levels.dock !== "number") {
      levels.dock = levels.docks;
    }
    if (typeof levels.dock === "number" && typeof levels.docks !== "number") {
      levels.docks = levels.dock;
    }

    const townId = getTownIdentifier(town);
    const cache = levelCacheByTown.get(townId);
    if (cache && typeof cache === "object") {
      Object.entries(cache).forEach(([key, value]) => {
        if (typeof levels[key] !== "number" && typeof value === "number") {
          levels[key] = value;
        }
      });
    }
    if (Object.keys(levels).length) {
      levelCacheByTown.set(townId, { ...levels });
    }

    return levels;
  }

  function formatTarget(range) {
    if (!Array.isArray(range) || range.length !== 2) {
      return "-";
    }
    const min = Number(range[0]);
    const max = Number(range[1]);
    return min === max ? String(min) : `${min}-${max}`;
  }

  function evaluateLevel(level, range) {
    if (!Array.isArray(range) || range.length !== 2) {
      return { cls: "tm-neutral", text: `Niv ${level} | cible -` };
    }

    const min = Number(range[0]);
    const max = Number(range[1]);

    if (level < min) {
      return { cls: "tm-low", text: `Niv ${level} | manque ${min - level}` };
    }

    if (level < max) {
      return { cls: "tm-mid", text: `Niv ${level} | dans la plage (peut monter)` };
    }

    if (level > max) {
      return { cls: "tm-high", text: `Niv ${level} | excedent +${level - max}` };
    }

    return { cls: "tm-ok", text: `Niv ${level} | ok` };
  }

  function normalizePanelLayout(raw) {
    if (!raw || typeof raw !== "object") {
      return null;
    }
    const top = toInt(raw.top, DEFAULT_PANEL_LAYOUT.top);
    const right = toInt(raw.right, DEFAULT_PANEL_LAYOUT.right);
    const width = toInt(raw.width, DEFAULT_PANEL_LAYOUT.width);
    const height = toInt(raw.height, DEFAULT_PANEL_LAYOUT.height);
    const left = raw.left === null || raw.left === undefined ? null : toInt(raw.left, 0);
    return {
      top: Math.max(0, top),
      right: Math.max(0, right),
      left: left === null ? null : Math.max(0, left),
      width: Math.max(260, width),
      height: Math.max(0, height)
    };
  }

  function getPanelLayout() {
    try {
      const raw = localStorage.getItem(PANEL_LAYOUT_KEY);
      if (!raw) {
        return { ...DEFAULT_PANEL_LAYOUT };
      }
      const parsed = JSON.parse(raw);
      return normalizePanelLayout(parsed) || { ...DEFAULT_PANEL_LAYOUT };
    } catch (_) {
      return { ...DEFAULT_PANEL_LAYOUT };
    }
  }

  function savePanelLayout(layout) {
    const normalized = normalizePanelLayout(layout) || { ...DEFAULT_PANEL_LAYOUT };
    localStorage.setItem(PANEL_LAYOUT_KEY, JSON.stringify(normalized));
  }

  function applyPanelLayout(panel, layout) {
    if (!panel) {
      return;
    }
    const normalized = normalizePanelLayout(layout) || { ...DEFAULT_PANEL_LAYOUT };
    panel.style.top = `${normalized.top}px`;
    if (normalized.left === null) {
      panel.style.left = "";
      panel.style.right = `${normalized.right}px`;
    } else {
      panel.style.left = `${normalized.left}px`;
      panel.style.right = "auto";
    }
    panel.style.width = `${normalized.width}px`;
    if (normalized.height > 0) {
      panel.style.height = `${normalized.height}px`;
    } else {
      panel.style.height = "";
    }
  }

  function persistPanelLayout(panel) {
    if (!panel) {
      return;
    }
    const rect = panel.getBoundingClientRect();
    const hasManualHeight = typeof panel.style.height === "string" && /px$/.test(panel.style.height);
    const layout = {
      top: Math.max(0, Math.round(rect.top)),
      left: Math.max(0, Math.round(rect.left)),
      right: DEFAULT_PANEL_LAYOUT.right,
      width: Math.max(260, Math.round(rect.width)),
      height: hasManualHeight ? Math.max(220, Math.round(rect.height)) : 0
    };
    savePanelLayout(layout);
  }

  function constrainPanelToViewport(panel) {
    if (!panel) {
      return;
    }
    const rect = panel.getBoundingClientRect();
    const maxLeft = Math.max(0, window.innerWidth - rect.width);
    const maxTop = Math.max(0, window.innerHeight - Math.min(rect.height, window.innerHeight));
    const left = Math.min(Math.max(0, rect.left), maxLeft);
    const top = Math.min(Math.max(0, rect.top), maxTop);
    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = `${Math.round(top)}px`;
    panel.style.right = "auto";
  }

  function resetPanelLayout(panel) {
    savePanelLayout({ ...DEFAULT_PANEL_LAYOUT });
    applyPanelLayout(panel, DEFAULT_PANEL_LAYOUT);
  }

  function attachPanelInteractions(panel) {
    if (!panel || panel.getAttribute("data-layout-ready") === "1") {
      return;
    }
    panel.setAttribute("data-layout-ready", "1");
    applyPanelLayout(panel, getPanelLayout());

    const header = panel.querySelector(".tm-header");
    let dragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    if (header) {
      header.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) {
          return;
        }
        const target = event.target;
        if (target instanceof HTMLElement && target.closest("button, select, input, option")) {
          return;
        }
        const rect = panel.getBoundingClientRect();
        dragging = true;
        dragOffsetX = event.clientX - rect.left;
        dragOffsetY = event.clientY - rect.top;
        panel.classList.add("tm-dragging");
        panel.style.left = `${Math.round(rect.left)}px`;
        panel.style.top = `${Math.round(rect.top)}px`;
        panel.style.right = "auto";
      });
    }

    document.addEventListener("pointermove", (event) => {
      if (!dragging) {
        return;
      }
      const rect = panel.getBoundingClientRect();
      const maxLeft = Math.max(0, window.innerWidth - rect.width);
      const maxTop = Math.max(0, window.innerHeight - Math.min(rect.height, window.innerHeight));
      const nextLeft = Math.min(Math.max(0, event.clientX - dragOffsetX), maxLeft);
      const nextTop = Math.min(Math.max(0, event.clientY - dragOffsetY), maxTop);
      panel.style.left = `${Math.round(nextLeft)}px`;
      panel.style.top = `${Math.round(nextTop)}px`;
      panel.style.right = "auto";
    });

    document.addEventListener("pointerup", () => {
      if (!dragging) {
        return;
      }
      dragging = false;
      panel.classList.remove("tm-dragging");
      persistPanelLayout(panel);
    });

    let resizeTimer = null;
    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(() => {
        if (resizeTimer) {
          clearTimeout(resizeTimer);
        }
        resizeTimer = setTimeout(() => {
          constrainPanelToViewport(panel);
          persistPanelLayout(panel);
        }, 180);
      });
      observer.observe(panel);
    }

    window.addEventListener("resize", () => {
      constrainPanelToViewport(panel);
      persistPanelLayout(panel);
    });
  }

  function populatePresetSelect(select) {
    if (!select) {
      return;
    }
    const presets = getPresetMap();
    const previous = getSelectedPreset();
    select.innerHTML = "";
    Object.entries(presets).forEach(([key, value]) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = value.label;
      select.appendChild(option);
    });
    const customOption = document.createElement("option");
    customOption.value = CUSTOM_PRESET_ID;
    customOption.textContent = "Personnalise";
    select.appendChild(customOption);

    const fallback = getDefaultPresetKey(presets);
    const nextValue = previous === CUSTOM_PRESET_ID || presets[previous] ? previous : fallback;
    if (nextValue !== previous) {
      setSelectedPreset(nextValue);
      isCustomEditMode = false;
    }
    select.value = nextValue;
  }

  function buildPanel() {
    if (document.getElementById(PANEL_ID)) {
      return document.getElementById(PANEL_ID);
    }

    const panel = document.createElement("aside");
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <div class="tm-header">
        <strong>Niveaux optimaux</strong>
        <button type="button" class="tm-collapse-btn" aria-label="Reduire">-</button>
      </div>
      <div class="tm-controls">
        <label>
          Monde:
          <select class="tm-world-select"></select>
        </label>
        <label>
          Type:
          <select class="tm-preset-select"></select>
        </label>
        <div class="tm-actions">
          <button type="button" class="tm-clone-btn">Cloner en perso</button>
          <button type="button" class="tm-edit-btn">Modifier perso</button>
          <button type="button" class="tm-apply-btn">Appliquer</button>
          <button type="button" class="tm-reset-btn">Reinit perso</button>
          <button type="button" class="tm-layout-reset-btn">Reset fenetre</button>
        </div>
      </div>
      <div class="tm-town-name">Ville active</div>
      <div class="tm-next-action"></div>
      <div class="tm-special-building"></div>
      <div class="tm-body">
        <table>
          <thead>
            <tr><th>Prio</th><th>Batiment</th><th>Etat</th><th>Cible</th></tr>
          </thead>
          <tbody class="tm-rows"></tbody>
        </table>
        <p class="tm-hint">MAJ auto. Passe en "Personnalise" pour modifier tes objectifs. Glisse l'entete pour deplacer, redimensionne au coin bas-droit.</p>
      </div>
    `;

    document.body.appendChild(panel);

    const worldSelect = panel.querySelector(".tm-world-select");
    const select = panel.querySelector(".tm-preset-select");
    Object.entries(WORLD_MODES).forEach(([key, value]) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = value.label;
      worldSelect.appendChild(option);
    });
    worldSelect.value = getSelectedWorldMode();
    worldSelect.addEventListener("change", () => {
      setSelectedWorldMode(worldSelect.value);
      populatePresetSelect(select);
      render(true);
    });

    populatePresetSelect(select);
    select.addEventListener("change", () => {
      setSelectedPreset(select.value);
      if (select.value !== CUSTOM_PRESET_ID) {
        isCustomEditMode = false;
      }
      render(true);
    });

    const collapseBtn = panel.querySelector(".tm-collapse-btn");
    collapseBtn.addEventListener("click", () => {
      const collapsed = panel.classList.toggle("tm-collapsed");
      collapseBtn.textContent = collapsed ? "+" : "-";
      collapseBtn.setAttribute("aria-label", collapsed ? "Agrandir" : "Reduire");
    });

    const cloneBtn = panel.querySelector(".tm-clone-btn");
    cloneBtn.addEventListener("click", () => {
      const currentConfig = getPresetConfig(getSelectedPreset());
      saveCustomTargets(cloneTargets(currentConfig.targets));
      setSelectedPreset(CUSTOM_PRESET_ID);
      select.value = CUSTOM_PRESET_ID;
      isCustomEditMode = true;
      render(true);
    });

    const editBtn = panel.querySelector(".tm-edit-btn");
    editBtn.addEventListener("click", () => {
      if (getSelectedPreset() !== CUSTOM_PRESET_ID) {
        return;
      }
      isCustomEditMode = !isCustomEditMode;
      render(true);
    });

    const applyBtn = panel.querySelector(".tm-apply-btn");
    applyBtn.addEventListener("click", () => {
      const wrappers = Array.from(panel.querySelectorAll(".tm-target-inputs[data-building-key]"));
      if (!wrappers.length) {
        return;
      }

      const currentConfig = getPresetConfig(getSelectedPreset());
      const wrapByKey = new Map();
      wrappers.forEach((wrap) => {
        const key = wrap.getAttribute("data-building-key");
        if (key) {
          wrapByKey.set(key, wrap);
        }
      });

      const nextTargets = {};
      const orderedKeys = Object.keys(currentConfig.targets);
      const allKeys = orderedKeys.concat(
        Array.from(wrapByKey.keys()).filter((key) => !orderedKeys.includes(key))
      );

      allKeys.forEach((buildingKey) => {
        const wrap = wrapByKey.get(buildingKey);
        if (!wrap) {
          return;
        }
        const minInput = wrap.querySelector(".tm-min");
        const maxInput = wrap.querySelector(".tm-max");
        if (!minInput || !maxInput) {
          return;
        }

        let min = toInt(minInput.value, 0);
        let max = toInt(maxInput.value, min);
        if (max < min) {
          const tmp = min;
          min = max;
          max = tmp;
        }
        nextTargets[buildingKey] = [min, max];
      });

      if (!Object.keys(nextTargets).length) {
        return;
      }

      saveCustomTargets(nextTargets);
      isCustomEditMode = false;
      render(true);
    });

    const resetBtn = panel.querySelector(".tm-reset-btn");
    resetBtn.addEventListener("click", () => {
      saveCustomTargets(getDefaultCustomTargets());
      isCustomEditMode = false;
      if (select.value !== CUSTOM_PRESET_ID) {
        setSelectedPreset(CUSTOM_PRESET_ID);
        select.value = CUSTOM_PRESET_ID;
      }
      render(true);
    });

    const layoutResetBtn = panel.querySelector(".tm-layout-reset-btn");
    layoutResetBtn.addEventListener("click", () => {
      resetPanelLayout(panel);
      render(true);
    });

    attachPanelInteractions(panel);

    return panel;
  }

  function updateActions(panel, presetConfig) {
    const cloneBtn = panel.querySelector(".tm-clone-btn");
    const editBtn = panel.querySelector(".tm-edit-btn");
    const applyBtn = panel.querySelector(".tm-apply-btn");
    const resetBtn = panel.querySelector(".tm-reset-btn");
    if (!cloneBtn || !editBtn || !applyBtn || !resetBtn) {
      return;
    }

    if (presetConfig.isCustom) {
      cloneBtn.style.display = "none";
      editBtn.style.display = "inline-block";
      resetBtn.style.display = "inline-block";
      applyBtn.style.display = "inline-block";
      applyBtn.disabled = !isCustomEditMode;
      editBtn.textContent = isCustomEditMode ? "Annuler edition" : "Modifier perso";
    } else {
      cloneBtn.style.display = "inline-block";
      editBtn.style.display = "none";
      resetBtn.style.display = "none";
      applyBtn.style.display = "none";
    }
  }

  function injectStyles() {
    if (document.getElementById("tm-grepolis-opt-style")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "tm-grepolis-opt-style";
    style.textContent = `
      #${PANEL_ID} {
        position: fixed;
        right: 12px;
        top: 86px;
        width: 300px;
        min-width: 260px;
        min-height: 260px;
        max-width: min(92vw, 540px);
        max-height: 92vh;
        resize: both;
        overflow: auto;
        z-index: 12000;
        color: #f7f2dd;
        font-family: Verdana, sans-serif;
        font-size: 12px;
        border: 1px solid #8a6428;
        border-radius: 4px;
        background:
          radial-gradient(circle at 8% 10%, rgba(247, 217, 150, 0.16) 0%, transparent 30%),
          linear-gradient(180deg, rgba(24, 31, 43, 0.96) 0%, rgba(14, 19, 28, 0.97) 100%);
        box-shadow:
          0 12px 26px rgba(0, 0, 0, 0.45),
          inset 0 0 0 1px rgba(255, 236, 189, 0.1),
          inset 0 12px 22px rgba(0, 0, 0, 0.22);
      }

      #${PANEL_ID}::before,
      #${PANEL_ID}::after {
        content: "";
        position: absolute;
        width: 18px;
        height: 18px;
        pointer-events: none;
        opacity: 0.65;
      }

      #${PANEL_ID}::before {
        left: 4px;
        top: 4px;
        border-top: 2px solid rgba(239, 194, 112, 0.85);
        border-left: 2px solid rgba(239, 194, 112, 0.85);
      }

      #${PANEL_ID}::after {
        right: 4px;
        bottom: 4px;
        border-right: 2px solid rgba(239, 194, 112, 0.85);
        border-bottom: 2px solid rgba(239, 194, 112, 0.85);
      }

      #${PANEL_ID}.tm-dragging {
        box-shadow:
          0 18px 34px rgba(0, 0, 0, 0.52),
          inset 0 0 0 1px rgba(255, 236, 189, 0.12);
      }

      #${PANEL_ID} .tm-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 8px 10px;
        background:
          linear-gradient(180deg, #91692a 0%, #694915 52%, #5a3f13 100%);
        border-bottom: 1px solid rgba(255, 226, 166, 0.22);
        cursor: grab;
        user-select: none;
      }

      #${PANEL_ID} .tm-header strong {
        letter-spacing: 0.2px;
        text-shadow: 0 1px 0 rgba(0, 0, 0, 0.65);
      }

      #${PANEL_ID}.tm-dragging .tm-header {
        cursor: grabbing;
      }

      #${PANEL_ID} .tm-collapse-btn {
        border: 1px solid rgba(255, 233, 185, 0.45);
        color: #fff4d4;
        background: rgba(0, 0, 0, 0.28);
        width: 24px;
        height: 22px;
        border-radius: 2px;
        cursor: pointer;
      }

      #${PANEL_ID} .tm-controls,
      #${PANEL_ID} .tm-town-name,
      #${PANEL_ID} .tm-next-action,
      #${PANEL_ID} .tm-special-building,
      #${PANEL_ID} .tm-hint {
        padding: 8px 10px;
      }

      #${PANEL_ID} .tm-controls label {
        display: grid;
        gap: 4px;
        margin-bottom: 6px;
      }

      #${PANEL_ID} .tm-controls label:last-child {
        margin-bottom: 0;
      }

      #${PANEL_ID} .tm-controls select {
        width: 100%;
        border: 1px solid #8b6a33;
        background: #f4ebd8;
        color: #2f220f;
        font: inherit;
        padding: 4px 6px;
        border-radius: 2px;
      }

      #${PANEL_ID} .tm-actions {
        margin-top: 8px;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 6px;
      }

      #${PANEL_ID} .tm-actions button {
        border: 1px solid #8f6a2d;
        background: linear-gradient(180deg, #f2d88f 0%, #c59a43 100%);
        color: #2a1b07;
        font: inherit;
        padding: 3px 7px;
        cursor: pointer;
        border-radius: 2px;
        transition: filter 0.12s ease;
      }

      #${PANEL_ID} .tm-actions button:hover {
        filter: brightness(1.07);
      }

      #${PANEL_ID} .tm-actions button:disabled {
        opacity: 0.6;
        cursor: default;
      }

      #${PANEL_ID} .tm-town-name {
        color: #f6d58e;
        border-top: 1px solid rgba(255, 255, 255, 0.12);
      }

      #${PANEL_ID} .tm-next-action,
      #${PANEL_ID} .tm-special-building {
        border-top: 1px solid rgba(255, 255, 255, 0.12);
      }

      #${PANEL_ID} .tm-next-action {
        color: #9ad9ff;
      }

      #${PANEL_ID} .tm-special-building {
        color: #f7d08a;
        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      }

      #${PANEL_ID} .tm-body {
        padding-bottom: 8px;
      }

      #${PANEL_ID} table {
        width: calc(100% - 20px);
        margin: 8px 10px 0;
        border-collapse: collapse;
      }

      #${PANEL_ID} th,
      #${PANEL_ID} td {
        border: 1px solid rgba(255, 255, 255, 0.15);
        padding: 5px 6px;
        text-align: left;
        vertical-align: top;
      }

      #${PANEL_ID} th {
        background: rgba(255, 255, 255, 0.08);
      }

      #${PANEL_ID} .tm-building-cell {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      #${PANEL_ID} .tm-prio-cell {
        white-space: nowrap;
        font-weight: 700;
      }

      #${PANEL_ID} .tm-building-icon {
        width: 18px;
        height: 18px;
        object-fit: contain;
        border: 1px solid rgba(255, 255, 255, 0.25);
        background: rgba(255, 255, 255, 0.1);
      }

      #${PANEL_ID} .tm-target-inputs {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      #${PANEL_ID} .tm-target-inputs input {
        width: 44px;
        border: 1px solid rgba(255, 255, 255, 0.3);
        background: rgba(255, 255, 255, 0.95);
        color: #201302;
        font: inherit;
        padding: 2px 3px;
      }

      #${PANEL_ID} .tm-ok { color: #9be28f; }
      #${PANEL_ID} .tm-low { color: #ff9d9d; }
      #${PANEL_ID} .tm-mid { color: #9ad9ff; }
      #${PANEL_ID} .tm-high { color: #ffd889; }
      #${PANEL_ID} .tm-neutral { color: #d8d8d8; }

      #${PANEL_ID}.tm-collapsed .tm-body,
      #${PANEL_ID}.tm-collapsed .tm-controls,
      #${PANEL_ID}.tm-collapsed .tm-next-action,
      #${PANEL_ID}.tm-collapsed .tm-special-building,
      #${PANEL_ID}.tm-collapsed .tm-town-name {
        display: none;
      }

      #${PANEL_ID}.tm-collapsed {
        min-height: 0;
        height: auto !important;
        resize: none;
      }

      @media (max-width: 700px) {
        #${PANEL_ID} {
          left: 8px;
          right: 8px;
          top: 8px;
          width: auto;
          max-width: none;
          max-height: calc(100vh - 16px);
          resize: none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  let lastSignature = "";

  function render(force) {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) {
      return;
    }

    const presetKey = getSelectedPreset();
    const preset = getPresetConfig(presetKey);
    const town = getTown();
    const levels = extractBuildingLevels(town);
    const rowsEl = panel.querySelector(".tm-rows");
    const townNameEl = panel.querySelector(".tm-town-name");
    const nextActionEl = panel.querySelector(".tm-next-action");
    const specialEl = panel.querySelector(".tm-special-building");
    const worldSelect = panel.querySelector(".tm-world-select");
    const select = panel.querySelector(".tm-preset-select");

    const currentWorldMode = getSelectedWorldMode();
    if (worldSelect && worldSelect.value !== currentWorldMode) {
      worldSelect.value = currentWorldMode;
      populatePresetSelect(select);
    }
    if (select && select.value !== presetKey) {
      select.value = presetKey;
    }
    updateActions(panel, preset);

    if (!levels || !preset || !rowsEl || !townNameEl || !nextActionEl || !specialEl) {
      rowsEl.innerHTML = `<tr><td colspan="4" class="tm-neutral">Impossible de lire les batiments. Ouvre une ville et attends 1-2 secondes.</td></tr>`;
      return;
    }

    if (!force && preset.isCustom && isCustomEditMode) {
      return;
    }

    const townName = getTownName(town);
    const signature = JSON.stringify({
      town: townName,
      mode: currentWorldMode,
      preset: preset.key,
      edit: isCustomEditMode,
      order: preset.priorityOrder,
      special: preset.specialBuilding,
      values: Object.keys(preset.targets).map((key) => getLevelForBuilding(levels, key)),
      targets: preset.targets
    });

    if (!force && signature === lastSignature) {
      return;
    }
    lastSignature = signature;

    townNameEl.textContent = townName;
    rowsEl.innerHTML = "";

    const plan = getPriorityPlan(preset, levels);
    const priorityByKey = new Map();
    plan.forEach((item, index) => {
      priorityByKey.set(item.key, {
        rank: index + 1,
        kind: item.kind
      });
    });

    if (plan.length) {
      const first = plan[0];
      const firstName = BUILDING_LABELS[first.key] || first.key;
      const firstTarget = first.kind === "required" ? first.min : first.max;
      const firstTag = first.kind === "required" ? "obligatoire" : "optimisation";
      nextActionEl.textContent = `Action maintenant: #1 ${firstName} -> viser niv ${firstTarget} (${firstTag})`;
    } else {
      nextActionEl.textContent = "Action maintenant: aucun batiment prioritaire (template atteint).";
    }

    const special = preset.specialBuilding || inferSpecialBuilding(preset.targets);
    if (special && special.key) {
      const specialRange = normalizeRange(special.target) || normalizeRange(preset.targets[special.key]) || [1, 1];
      const specialLevel = getLevelForBuilding(levels, special.key);
      const specialName = BUILDING_LABELS[special.key] || special.key;
      const specialStatus = specialLevel < specialRange[0]
        ? "a construire maintenant"
        : specialLevel < specialRange[1]
          ? "a poursuivre"
          : "ok";
      specialEl.textContent = `Batiment special: ${specialName} (${specialLevel}/${formatTarget(specialRange)}) - ${specialStatus}`;
    } else {
      specialEl.textContent = "Batiment special: non defini pour ce preset.";
    }

    const orderIndex = new Map((preset.priorityOrder || []).map((key, index) => [key, index]));
    const targetEntries = Object.entries(preset.targets).sort((a, b) => {
      const aPrio = priorityByKey.get(a[0]);
      const bPrio = priorityByKey.get(b[0]);
      const aRank = aPrio ? aPrio.rank : 9999;
      const bRank = bPrio ? bPrio.rank : 9999;
      if (aRank !== bRank) {
        return aRank - bRank;
      }
      const aOrder = orderIndex.has(a[0]) ? orderIndex.get(a[0]) : 9999;
      const bOrder = orderIndex.has(b[0]) ? orderIndex.get(b[0]) : 9999;
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      const aLabel = BUILDING_LABELS[a[0]] || a[0];
      const bLabel = BUILDING_LABELS[b[0]] || b[0];
      return aLabel.localeCompare(bLabel, "fr");
    });

    targetEntries.forEach(([buildingKey, range]) => {
      const level = getLevelForBuilding(levels, buildingKey);
      const status = evaluateLevel(level, range);
      const row = document.createElement("tr");

      const prioCell = document.createElement("td");
      prioCell.className = "tm-prio-cell";
      const prioInfo = priorityByKey.get(buildingKey);
      if (prioInfo) {
        prioCell.textContent = `#${prioInfo.rank}${prioInfo.kind === "optional" ? " opt" : ""}`;
      } else {
        prioCell.textContent = "-";
      }

      const nameCell = document.createElement("td");
      const wrap = document.createElement("div");
      wrap.className = "tm-building-cell";
      const iconUrl = getIconUrl(buildingKey);
      if (iconUrl) {
        const img = document.createElement("img");
        img.className = "tm-building-icon";
        img.alt = "";
        img.loading = "lazy";
        img.decoding = "async";
        img.src = iconUrl;
        img.addEventListener("error", () => {
          img.style.display = "none";
        });
        wrap.appendChild(img);
      }
      const nameText = document.createElement("span");
      nameText.textContent = BUILDING_LABELS[buildingKey] || buildingKey;
      wrap.appendChild(nameText);
      nameCell.appendChild(wrap);

      const stateCell = document.createElement("td");
      stateCell.className = status.cls;
      stateCell.textContent = status.text;

      const targetCell = document.createElement("td");
      if (preset.isCustom && isCustomEditMode) {
        const targetWrap = document.createElement("div");
        targetWrap.className = "tm-target-inputs";
        targetWrap.setAttribute("data-building-key", buildingKey);

        const minInput = document.createElement("input");
        minInput.type = "number";
        minInput.className = "tm-min";
        minInput.min = "0";
        minInput.value = String(range[0]);

        const sep = document.createElement("span");
        sep.textContent = "-";

        const maxInput = document.createElement("input");
        maxInput.type = "number";
        maxInput.className = "tm-max";
        maxInput.min = "0";
        maxInput.value = String(range[1]);

        targetWrap.appendChild(minInput);
        targetWrap.appendChild(sep);
        targetWrap.appendChild(maxInput);
        targetCell.appendChild(targetWrap);
      } else {
        targetCell.textContent = formatTarget(range);
      }

      row.appendChild(prioCell);
      row.appendChild(nameCell);
      row.appendChild(stateCell);
      row.appendChild(targetCell);
      rowsEl.appendChild(row);
    });
  }

  function init() {
    if (!/\/game\//.test(window.location.pathname)) {
      return;
    }
    injectStyles();
    buildPanel();
    render(true);
    if (!refreshTimer) {
      refreshTimer = setInterval(() => render(false), 1500);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();


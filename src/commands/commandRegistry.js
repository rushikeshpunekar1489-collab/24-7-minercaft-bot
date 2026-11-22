"use strict";

// Whitelist of allowed mining blocks
const ALLOWED_MINE_BLOCKS = [
  "oak_log",
  "birch_log",
  "spruce_log",
  "jungle_log",
  "acacia_log",
  "dark_oak_log",
  "mangrove_log",
  "cherry_log",
  "log",
  "wood",
  "stone",
  "cobblestone",
  "dirt",
  "sand",
  "gravel",
  "coal_ore",
  "deepslate_coal_ore",
  "iron_ore",
  "deepslate_iron_ore",
  "copper_ore",
  "deepslate_copper_ore",
  "gold_ore",
  "deepslate_gold_ore",
  "diamond_ore",
  "deepslate_diamond_ore",
  "netherrack",
  "clay",
];

// Whitelist of allowed building structures
const ALLOWED_BUILD_STRUCTURES = [
  "small_house",
  "shelter",
  "wall",
  "pillar",
  "floor",
];

// Whitelist of allowed building materials
const ALLOWED_BUILD_MATERIALS = [
  "dirt",
  "cobblestone",
  "stone",
  "oak_planks",
  "birch_planks",
  "spruce_planks",
  "stone_bricks",
];

// Allowed action definitions with parameter validators
const ACTION_DEFINITIONS = {
  follow: {
    description: "Follow an authorized player",
    validate: (params, sender) => {
      const target = (params?.target || sender || "").trim();
      if (!target) return { valid: false, error: "Missing target player" };
      const distance = Math.max(1, Math.min(10, parseInt(params?.distance || "2", 10)));
      return { valid: true, params: { target, distance } };
    },
  },

  stop: {
    description: "Stop current action or movement",
    validate: () => ({ valid: true, params: {} }),
  },

  come_here: {
    description: "Move to calling player location",
    validate: (params, sender) => {
      const target = (params?.target || sender || "").trim();
      if (!target) return { valid: false, error: "Target player missing" };
      return { valid: true, params: { target } };
    },
  },

  look_at: {
    description: "Turn and look towards a player",
    validate: (params, sender) => {
      const target = (params?.target || sender || "").trim();
      if (!target) return { valid: false, error: "Target player missing" };
      return { valid: true, params: { target } };
    },
  },

  explore: {
    description: "Explore nearby safe coordinates within safe radius",
    validate: (params) => {
      const radius = Math.max(5, Math.min(30, parseInt(params?.radius || "15", 10)));
      return { valid: true, params: { radius } };
    },
  },

  status: {
    description: "Report health, food, position, and status",
    validate: () => ({ valid: true, params: {} }),
  },

  inventory: {
    description: "List items currently in inventory",
    validate: () => ({ valid: true, params: {} }),
  },

  mine: {
    description: "Mine specified block type up to a safe count limit",
    validate: (params) => {
      let block = (params?.blockType || params?.block || "stone").toLowerCase().trim();
      // Normalize aliases
      if (block === "wood") block = "oak_log";
      if (block === "coal") block = "coal_ore";
      if (block === "iron") block = "iron_ore";

      const matched = ALLOWED_MINE_BLOCKS.find(
        (b) => b === block || b.includes(block) || block.includes(b)
      );

      if (!matched) {
        return {
          valid: false,
          error: `Block type '${block}' is not permitted for automated mining.`,
        };
      }

      const count = Math.max(1, Math.min(32, parseInt(params?.count || "3", 10)));
      return { valid: true, params: { blockType: matched, count } };
    },
  },

  build: {
    description: "Build a simple structure from available materials",
    validate: (params) => {
      const structure = (params?.structureType || params?.structure || "shelter")
        .toLowerCase()
        .trim();
      const matched = ALLOWED_BUILD_STRUCTURES.find(
        (s) => s === structure || structure.includes(s)
      );

      if (!matched) {
        return {
          valid: false,
          error: `Structure '${structure}' is not supported. Supported: ${ALLOWED_BUILD_STRUCTURES.join(", ")}`,
        };
      }

      const material = (params?.material || "cobblestone").toLowerCase().trim();
      return {
        valid: true,
        params: { structureType: matched, material },
      };
    },
  },

  drop: {
    description: "Drop items for the player",
    validate: (params, sender) => {
      const item = (params?.itemType || "all").toLowerCase().trim();
      const count = params?.count ? parseInt(params.count, 10) : undefined;
      return { valid: true, params: { itemType: item, count, target: sender } };
    },
  },

  help: {
    description: "Show available Jarvis commands",
    validate: () => ({ valid: true, params: {} }),
  },

  say: {
    description: "Chat a response message",
    validate: (params) => {
      const message = String(params?.message || "").slice(0, 150);
      return { valid: true, params: { message } };
    },
  },
};

/**
 * Validates a proposed action against the action registry.
 * @param {string} type
 * @param {object} params
 * @param {string} sender
 * @returns {{ valid: boolean, action?: object, error?: string }}
 */
function validateAction(type, params = {}, sender = "") {
  if (!type || typeof type !== "string") {
    return { valid: false, error: "Action type must be a non-empty string" };
  }

  const normalizedType = type.toLowerCase().trim();
  const definition = ACTION_DEFINITIONS[normalizedType];

  if (!definition) {
    return {
      valid: false,
      error: `Unknown action '${normalizedType}'. Not in allowed action registry.`,
    };
  }

  const result = definition.validate(params, sender);
  if (!result.valid) {
    return result;
  }

  return {
    valid: true,
    action: {
      type: normalizedType,
      params: result.params,
    },
  };
}

module.exports = {
  ACTION_DEFINITIONS,
  ALLOWED_MINE_BLOCKS,
  ALLOWED_BUILD_STRUCTURES,
  ALLOWED_BUILD_MATERIALS,
  validateAction,
};

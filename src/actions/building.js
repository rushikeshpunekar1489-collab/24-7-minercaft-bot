"use strict";

const { Vec3 } = require("vec3");
const logger = require("../utils/logger");

/**
 * Generates relative offset blueprint coordinates for supported structures.
 * @param {string} structureType
 * @returns {Array<{dx: number, dy: number, dz: number}>}
 */
function getStructureBlueprint(structureType) {
  const norm = (structureType || "shelter").toLowerCase();

  if (norm === "pillar") {
    // 3 blocks tall pillar directly adjacent
    return [
      { dx: 1, dy: 0, dz: 0 },
      { dx: 1, dy: 1, dz: 0 },
      { dx: 1, dy: 2, dz: 0 },
    ];
  }

  if (norm === "wall") {
    // 3 wide x 2 tall wall
    return [
      { dx: 1, dy: 0, dz: -1 },
      { dx: 1, dy: 0, dz: 0 },
      { dx: 1, dy: 0, dz: 1 },
      { dx: 1, dy: 1, dz: -1 },
      { dx: 1, dy: 1, dz: 0 },
      { dx: 1, dy: 1, dz: 1 },
    ];
  }

  if (norm === "floor") {
    // 3x3 platform at ground level
    const offsets = [];
    for (let x = 1; x <= 3; x++) {
      for (let z = -1; z <= 1; z++) {
        offsets.push({ dx: x, dy: -1, dz: z });
      }
    }
    return offsets;
  }

  // Default: small shelter / small_house (3x3 perimeter, 2 high, with 1 doorway opening)
  const shelterOffsets = [];
  for (let y = 0; y < 2; y++) {
    for (let x = 1; x <= 3; x++) {
      for (let z = -1; z <= 1; z++) {
        const isPerimeter = x === 1 || x === 3 || z === -1 || z === 1;
        const isDoorway = x === 1 && z === 0; // leave doorway open
        if (isPerimeter && !isDoorway) {
          shelterOffsets.push({ dx: x, dy: y, dz: z });
        }
      }
    }
  }
  return shelterOffsets;
}

/**
 * Finds a suitable block in inventory for building.
 * @param {object} bot
 * @param {string} preferredMaterial
 * @returns {object|null}
 */
function findBuildingBlock(bot, preferredMaterial = "") {
  if (!bot || !bot.inventory) return null;

  const items = bot.inventory.items();
  const placeableKeywords = [
    "cobblestone",
    "stone",
    "dirt",
    "planks",
    "wood",
    "bricks",
    "sandstone",
    "deepslate",
  ];

  if (preferredMaterial) {
    const pref = items.find((i) =>
      i.name.toLowerCase().includes(preferredMaterial.toLowerCase())
    );
    if (pref) return pref;
  }

  return items.find((i) =>
    placeableKeywords.some((kw) => i.name.toLowerCase().includes(kw))
  );
}

/**
 * Builds a structured blueprint in the world.
 * @param {object} bot
 * @param {string} structureType
 * @param {string} material
 * @param {object} signal
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function buildStructure(bot, structureType = "shelter", material = "cobblestone", signal = { cancelled: false }) {
  if (!bot || !bot.entity) {
    return { success: false, message: "Bot is not spawned or ready." };
  }

  const blueprint = getStructureBlueprint(structureType);
  logger.action(`[Building] Blueprint generated: ${structureType} (${blueprint.length} blocks)`);

  const initialBlock = findBuildingBlock(bot, material);
  if (!initialBlock) {
    return {
      success: false,
      message: `I have no suitable building blocks in my inventory (need ${material} or stone/dirt/planks).`,
    };
  }

  const origin = bot.entity.position.floored();
  let placedCount = 0;

  for (const offset of blueprint) {
    if (signal.cancelled) {
      return {
        success: placedCount > 0,
        message: `Building cancelled. Placed ${placedCount} block(s).`,
      };
    }

    const currentBlock = findBuildingBlock(bot, material);
    if (!currentBlock) {
      return {
        success: placedCount > 0,
        message: `Ran out of building materials. Placed ${placedCount} of ${blueprint.length} blocks.`,
      };
    }

    const targetPos = origin.offset(offset.dx, offset.dy, offset.dz);
    const existing = bot.blockAt(targetPos);

    // If block is already solid, skip
    if (existing && existing.boundingBox === "block") {
      continue;
    }

    // Find reference block adjacent to targetPos
    const adjacentFaces = [
      new Vec3(0, -1, 0), // below
      new Vec3(0, 1, 0),  // above
      new Vec3(-1, 0, 0), // west
      new Vec3(1, 0, 0),  // east
      new Vec3(0, 0, -1), // north
      new Vec3(0, 0, 1),  // south
    ];

    let refBlock = null;
    let faceVector = null;

    for (const adj of adjacentFaces) {
      const neighborPos = targetPos.plus(adj);
      const neighbor = bot.blockAt(neighborPos);
      if (neighbor && neighbor.boundingBox === "block") {
        refBlock = neighbor;
        // Invert vector for placement face
        faceVector = adj.scaled(-1);
        break;
      }
    }

    if (!refBlock) {
      // Cannot place in mid-air without reference
      continue;
    }

    try {
      await bot.equip(currentBlock, "hand");
      await bot.placeBlock(refBlock, faceVector);
      placedCount++;
      await new Promise((r) => setTimeout(r, 250)); // placement delay
    } catch (err) {
      logger.debug(`[Building] Skip placement at ${targetPos}: ${err.message}`);
    }
  }

  const msg = placedCount > 0
    ? `Completed building ${structureType} (${placedCount} blocks placed), sir.`
    : `Could not place blocks for ${structureType} (no solid anchor ground).`;

  logger.action(`[Building] ${msg}`);
  return { success: placedCount > 0, message: msg };
}

module.exports = {
  getStructureBlueprint,
  findBuildingBlock,
  buildStructure,
};

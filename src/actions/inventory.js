"use strict";

const logger = require("../utils/logger");

/**
 * Summarizes the bot inventory as a compact string.
 * @param {object} bot
 * @returns {string}
 */
function getInventorySummary(bot) {
  if (!bot || !bot.inventory) return "Inventory unavailable";

  const items = bot.inventory.items();
  if (items.length === 0) return "Empty";

  // Group by name
  const counts = {};
  for (const it of items) {
    counts[it.name] = (counts[it.name] || 0) + it.count;
  }

  const parts = Object.entries(counts).map(
    ([name, count]) => `${count}x ${name}`
  );

  return parts.slice(0, 10).join(", ") + (parts.length > 10 ? "..." : "");
}

/**
 * Equips the best tool in inventory for a target block type.
 * @param {object} bot
 * @param {string} blockName
 */
async function equipToolForBlock(bot, blockName = "") {
  if (!bot || !bot.inventory) return;

  const lower = blockName.toLowerCase();
  let preferredType = "";

  if (lower.includes("log") || lower.includes("wood") || lower.includes("plank")) {
    preferredType = "axe";
  } else if (
    lower.includes("stone") ||
    lower.includes("ore") ||
    lower.includes("cobble") ||
    lower.includes("deepslate")
  ) {
    preferredType = "pickaxe";
  } else if (
    lower.includes("dirt") ||
    lower.includes("sand") ||
    lower.includes("gravel") ||
    lower.includes("clay")
  ) {
    preferredType = "shovel";
  }

  if (!preferredType) return;

  const tool = bot.inventory.items().find((it) => it.name.includes(preferredType));
  if (tool) {
    try {
      await bot.equip(tool, "hand");
      logger.action(`[Inventory] Equipped tool: ${tool.name}`);
    } catch (err) {
      logger.debug(`[Inventory] Could not equip ${tool.name}: ${err.message}`);
    }
  }
}

module.exports = {
  getInventorySummary,
  equipToolForBlock,
};

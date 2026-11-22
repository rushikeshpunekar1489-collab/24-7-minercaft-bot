"use strict";

const { navigateTo } = require("./navigation");
const logger = require("../utils/logger");

/**
 * Turns bot head to look at player.
 * @param {object} bot
 * @param {string} targetName
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function lookAtPlayer(bot, targetName) {
  if (!bot || !bot.entity) {
    return { success: false, message: "Bot not spawned." };
  }

  const player = bot.players[targetName]?.entity;
  if (!player) {
    return { success: false, message: `I cannot see ${targetName} nearby.` };
  }

  try {
    const eyePos = player.position.offset(0, player.height || 1.6, 0);
    await bot.lookAt(eyePos);
    logger.action(`[Player] Looking at ${targetName}`);
    return { success: true, message: `Looking at you, ${targetName}.` };
  } catch (err) {
    return { success: false, message: `Error looking at player: ${err.message}` };
  }
}

/**
 * Commands bot to move to player position.
 * @param {object} bot
 * @param {string} targetName
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function comeHere(bot, targetName) {
  if (!bot || !bot.entity) {
    return { success: false, message: "Bot not spawned." };
  }

  const player = bot.players[targetName]?.entity;
  if (!player) {
    return { success: false, message: `I cannot find ${targetName} nearby.` };
  }

  const pos = player.position;
  return await navigateTo(bot, pos.x, pos.y, pos.z, 2, 25000);
}

/**
 * Drops inventory items to the target player.
 * @param {object} bot
 * @param {string} itemType
 * @param {number} count
 * @param {string} targetName
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function dropItem(bot, itemType = "all", count, targetName) {
  if (!bot || !bot.inventory) {
    return { success: false, message: "Bot inventory unavailable." };
  }

  if (targetName) {
    await lookAtPlayer(bot, targetName);
  }

  const items = bot.inventory.items();
  if (items.length === 0) {
    return { success: false, message: "My inventory is empty, sir." };
  }

  let droppedCount = 0;
  for (const item of items) {
    if (
      itemType === "all" ||
      item.name.toLowerCase().includes(itemType.toLowerCase())
    ) {
      try {
        const dropAmount = count ? Math.min(count, item.count) : item.count;
        await bot.toss(item.type, null, dropAmount);
        droppedCount += dropAmount;
        if (count && droppedCount >= count) break;
      } catch (err) {
        logger.error(`[Drop] Error tossing ${item.name}: ${err.message}`);
      }
    }
  }

  if (droppedCount > 0) {
    return { success: true, message: `Dropped ${droppedCount} item(s) for you, sir.` };
  } else {
    return { success: false, message: `No matching items found to drop.` };
  }
}

module.exports = {
  lookAtPlayer,
  comeHere,
  dropItem,
};

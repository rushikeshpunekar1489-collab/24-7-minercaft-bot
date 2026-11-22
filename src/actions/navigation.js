"use strict";

const { goals } = require("mineflayer-pathfinder");
const logger = require("../utils/logger");

/**
 * Navigates to target coordinates with a timeout.
 * @param {object} bot
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number} range
 * @param {number} timeoutMs
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function navigateTo(bot, x, y, z, range = 1, timeoutMs = 25000) {
  if (!bot || !bot.entity || !bot.pathfinder) {
    return { success: false, message: "Bot pathfinder is not ready." };
  }

  logger.action(`[Navigation] Navigating to (${Math.floor(x)}, ${Math.floor(y)}, ${Math.floor(z)})`);

  return new Promise((resolve) => {
    let timer = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      bot.off("goal_reached", onReached);
    };

    const onReached = () => {
      cleanup();
      logger.action(`[Navigation] Destination reached!`);
      resolve({ success: true, message: `Reached target destination.` });
    };

    timer = setTimeout(() => {
      cleanup();
      if (bot.pathfinder) bot.pathfinder.setGoal(null);
      logger.warn(`[Navigation] Timed out reaching (${x}, ${y}, ${z})`);
      resolve({ success: false, message: `Navigation timed out before reaching destination.` });
    }, timeoutMs);

    bot.once("goal_reached", onReached);

    try {
      bot.pathfinder.setGoal(new goals.GoalNear(x, y, z, range));
    } catch (err) {
      cleanup();
      resolve({ success: false, message: `Pathfinding error: ${err.message}` });
    }
  });
}

/**
 * Explores a random nearby area within radius.
 * @param {object} bot
 * @param {number} radius
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function explore(bot, radius = 15) {
  if (!bot || !bot.entity) {
    return { success: false, message: "Bot not spawned." };
  }

  const safeRadius = Math.max(5, Math.min(30, radius));
  const angle = Math.random() * Math.PI * 2;
  const distance = 5 + Math.random() * (safeRadius - 5);

  const targetX = bot.entity.position.x + Math.cos(angle) * distance;
  const targetZ = bot.entity.position.z + Math.sin(angle) * distance;
  const targetY = bot.entity.position.y;

  logger.action(`[Explore] Exploring towards (${Math.floor(targetX)}, ${Math.floor(targetZ)})`);
  return await navigateTo(bot, targetX, targetY, targetZ, 2, 20000);
}

module.exports = {
  navigateTo,
  explore,
};

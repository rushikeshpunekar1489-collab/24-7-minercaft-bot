"use strict";

const { goals } = require("mineflayer-pathfinder");
const logger = require("../utils/logger");

/**
 * Follows a player continuously.
 * @param {object} bot
 * @param {string} targetName
 * @param {number} distance
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function followPlayer(bot, targetName, distance = 2) {
  if (!bot || !bot.entity) {
    return { success: false, message: "Bot is not ready or spawned." };
  }

  const target = bot.players[targetName]?.entity;
  if (!target) {
    return {
      success: false,
      message: `Cannot see ${targetName} nearby to follow.`,
    };
  }

  try {
    const goal = new goals.GoalFollow(target, distance);
    bot.pathfinder.setGoal(goal, true);
    logger.action(`[Movement] Following ${targetName} at distance ${distance}`);
    return { success: true, message: `Following you now, ${targetName}.` };
  } catch (err) {
    logger.error(`[Movement] Follow error: ${err.message}`);
    return { success: false, message: `Could not follow: ${err.message}` };
  }
}

/**
 * Stops all movement and clears current pathfinder goal.
 * @param {object} bot
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function stopMovement(bot) {
  if (!bot) return { success: false, message: "Bot not active." };

  try {
    if (bot.pathfinder) {
      bot.pathfinder.setGoal(null);
    }

    const controls = ["forward", "back", "left", "right", "jump", "sprint", "sneak"];
    for (const ctrl of controls) {
      if (typeof bot.setControlState === "function") {
        bot.setControlState(ctrl, false);
      }
    }

    logger.action("[Movement] Movement halted.");
    return { success: true, message: "Movement stopped, sir." };
  } catch (err) {
    return { success: false, message: `Stop error: ${err.message}` };
  }
}

module.exports = {
  followPlayer,
  stopMovement,
};

"use strict";

const { followPlayer, stopMovement } = require("./movement");
const { explore, navigateTo } = require("./navigation");
const { lookAtPlayer, comeHere, dropItem } = require("./playerInteraction");
const { getInventorySummary } = require("./inventory");
const { mineBlock } = require("./mining");
const { buildStructure } = require("./building");
const logger = require("../utils/logger");

let currentTaskSignal = null;

function cancelCurrentTask() {
  if (currentTaskSignal) {
    currentTaskSignal.cancelled = true;
    currentTaskSignal = null;
    logger.action("[ActionManager] Active task cancelled.");
  }
}

/**
 * Executes a single validated action.
 * @param {object} bot
 * @param {object} action - { type: string, params: object }
 * @param {string} sender
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function executeAction(bot, action, sender) {
  if (!bot) {
    return { success: false, message: "Bot is not connected." };
  }

  const { type, params } = action;

  // Handle stop immediately
  if (type === "stop") {
    cancelCurrentTask();
    return await stopMovement(bot);
  }

  // Cancel prior task for new physical tasks
  cancelCurrentTask();
  const signal = { cancelled: false };
  currentTaskSignal = signal;

  try {
    switch (type) {
      case "follow":
        return await followPlayer(bot, params.target || sender, params.distance);

      case "come_here":
        return await comeHere(bot, params.target || sender);

      case "look_at":
        return await lookAtPlayer(bot, params.target || sender);

      case "explore":
        return await explore(bot, params.radius);

      case "status": {
        const hp = bot.health ?? 20;
        const food = bot.food ?? 20;
        const pos = bot.entity?.position
          ? `X=${Math.floor(bot.entity.position.x)}, Y=${Math.floor(
              bot.entity.position.y
            )}, Z=${Math.floor(bot.entity.position.z)}`
          : "unknown";
        return {
          success: true,
          message: `Health: ${hp}/20 | Food: ${food}/20 | Position: ${pos}`,
        };
      }

      case "inventory": {
        const inv = getInventorySummary(bot);
        return {
          success: true,
          message: `Inventory: ${inv}`,
        };
      }

      case "mine":
        return await mineBlock(bot, params.blockType, params.count, signal);

      case "build":
        return await buildStructure(
          bot,
          params.structureType,
          params.material,
          signal
        );

      case "drop":
        return await dropItem(bot, params.itemType, params.count, sender);

      case "say":
        return { success: true, message: params.message };

      default:
        return { success: false, message: `Unsupported action: ${type}` };
    }
  } catch (err) {
    logger.error(`[ActionManager] Error executing ${type}: ${err.message}`);
    return { success: false, message: `Action failed: ${err.message}` };
  } finally {
    if (currentTaskSignal === signal) {
      currentTaskSignal = null;
    }
  }
}

module.exports = {
  executeAction,
  cancelCurrentTask,
};

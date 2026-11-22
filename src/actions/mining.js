"use strict";

const { goals } = require("mineflayer-pathfinder");
const logger = require("../utils/logger");
const { equipToolForBlock } = require("./inventory");
const { ALLOWED_MINE_BLOCKS } = require("../commands/commandRegistry");

/**
 * Mines a specified block type up to a count.
 * @param {object} bot
 * @param {string} blockType
 * @param {number} count
 * @param {object} signal - cancellation signal object { cancelled: boolean }
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function mineBlock(bot, blockType, count = 1, signal = { cancelled: false }) {
  if (!bot || !bot.entity) {
    return { success: false, message: "Bot is not spawned or ready." };
  }

  // Validate against whitelist
  const allowed = ALLOWED_MINE_BLOCKS.find((b) => b.includes(blockType.toLowerCase()));
  if (!allowed) {
    return {
      success: false,
      message: `Mining block '${blockType}' is not permitted by security policy.`,
    };
  }

  logger.action(`[Mining] Starting mining for ${count}x ${blockType}...`);
  let mined = 0;

  for (let i = 0; i < count; i++) {
    if (signal.cancelled) {
      logger.action(`[Mining] Mining operation cancelled.`);
      return { success: mined > 0, message: `Mining cancelled. Mined ${mined} block(s).` };
    }

    // Locate the block
    const block = bot.findBlock({
      matching: (blk) => {
        if (!blk || !blk.name) return false;
        return blk.name.toLowerCase().includes(blockType.toLowerCase());
      },
      maxDistance: 32,
    });

    if (!block) {
      const msg = mined > 0
        ? `Found no more ${blockType} within reach. Mined ${mined} of ${count}.`
        : `Could not locate any ${blockType} within 32 blocks.`;
      logger.action(`[Mining] ${msg}`);
      return { success: mined > 0, message: msg };
    }

    try {
      // Navigate within reach
      if (bot.pathfinder) {
        await bot.pathfinder.goto(new goals.GoalLookAtBlock(block.position, bot.world));
      }

      if (signal.cancelled) break;

      // Equip best tool
      await equipToolForBlock(bot, block.name);

      // Check if block can be harvested
      if (!bot.canDigBlock(block)) {
        logger.warn(`[Mining] Cannot dig block at ${block.position}`);
        continue;
      }

      // Dig the block
      logger.action(`[Mining] Digging ${block.name} at ${block.position}`);
      await bot.dig(block);
      mined++;

      // Wait brief moment and step towards drop to pick up
      await new Promise((r) => setTimeout(r, 600));
      if (bot.pathfinder) {
        try {
          bot.pathfinder.setGoal(
            new goals.GoalNear(block.position.x, block.position.y, block.position.z, 1)
          );
          await new Promise((r) => setTimeout(r, 800));
        } catch {}
      }
    } catch (err) {
      logger.error(`[Mining] Error while mining ${blockType}: ${err.message}`);
      return {
        success: mined > 0,
        message: `Mining interrupted: ${err.message}. Mined ${mined} block(s).`,
      };
    }
  }

  const successMsg = `Successfully mined ${mined}x ${blockType}, sir.`;
  logger.action(`[Mining] ${successMsg}`);
  return { success: true, message: successMsg };
}

module.exports = {
  mineBlock,
};

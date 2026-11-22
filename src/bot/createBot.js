"use strict";

const mineflayer = require("mineflayer");
const { pathfinder, Movements } = require("mineflayer-pathfinder");
const minecraftData = require("minecraft-data");
const { config } = require("../config/settings");
const logger = require("../utils/logger");

/**
 * Creates and initializes a Mineflayer bot instance.
 * @returns {object} Mineflayer bot instance
 */
function createBotInstance() {
  const versionParam =
    config.server.version && config.server.version.toLowerCase() !== "auto"
      ? config.server.version
      : false;

  logger.connection(
    `[Bot] Connecting to ${config.server.host}:${config.server.port} as '${config.bot.username}' (Version config: ${config.server.version})`
  );

  const bot = mineflayer.createBot({
    host: config.server.host,
    port: config.server.port,
    username: config.bot.username,
    password: config.bot.password || undefined,
    auth: config.bot.auth,
    version: versionParam,
    hideErrors: false,
    checkTimeoutInterval: 120000,
  });

  bot.loadPlugin(pathfinder);

  // Setup movements on spawn
  bot.once("spawn", () => {
    try {
      const mcData = minecraftData(bot.version);
      if (mcData) {
        const defaultMove = new Movements(bot, mcData);
        defaultMove.canDig = true;
        defaultMove.allowFreeMotion = false;
        defaultMove.liquidCost = 1000;
        defaultMove.fallDamageCost = 1000;
        bot.pathfinder.setMovements(defaultMove);
        logger.debug("[Bot] Pathfinder movements initialized with minecraft-data");
      } else {
        logger.warn(`[Bot] minecraft-data unavailable for version ${bot.version}; basic pathfinder loaded.`);
      }
    } catch (err) {
      logger.warn(`[Bot] Error initializing pathfinder movements: ${err.message}`);
    }
  });

  return bot;
}

module.exports = {
  createBotInstance,
};

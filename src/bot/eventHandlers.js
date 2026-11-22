"use strict";

const { config } = require("../config/settings");
const logger = require("../utils/logger");
const { handleChatMessage } = require("../commands/commandRouter");
const { cancelCurrentTask } = require("../actions/actionManager");

/**
 * Attaches all standard bot event handlers.
 * @param {object} bot
 * @param {object} connectionManager
 */
function attachEventHandlers(bot, connectionManager) {
  // Spawn handler
  bot.once("spawn", () => {
    connectionManager.onSpawn();

    // Creative mode attempt if enabled in settings
    if (config.server.tryCreative) {
      setTimeout(() => {
        if (bot && connectionManager.isSpawned()) {
          bot.chat("/gamemode creative");
          logger.info("[Bot] Requested creative mode (/gamemode creative)");
        }
      }, 3000);
    }
  });

  // Chat message routing
  bot.on("chat", (username, message) => {
    handleChatMessage(bot, username, message).catch((err) => {
      logger.error(`[Chat Handler] Error processing message: ${err.message}`);
    });
  });

  // Messagestr for system messages & auto-auth detection
  let authHandled = false;
  bot.on("messagestr", (message) => {
    logger.debug(`[Server Message] ${message}`);

    // Auto-auth if enabled in config
    if (config.legacy.autoAuth?.enabled && !authHandled) {
      const lower = message.toLowerCase();
      const pwd = config.legacy.autoAuth.password;
      if (lower.includes("/register") || lower.includes("register ")) {
        authHandled = true;
        bot.chat(`/register ${pwd} ${pwd}`);
        logger.info("[Auth] Sent /register command");
      } else if (lower.includes("/login") || lower.includes("login ")) {
        authHandled = true;
        bot.chat(`/login ${pwd}`);
        logger.info("[Auth] Sent /login command");
      }
    }
  });

  // Health / Food management (auto-eat if food drops)
  bot.on("health", () => {
    if (bot.food < 14) {
      const foodItem = bot.inventory
        ?.items()
        .find((i) => i.foodPoints && i.foodPoints > 0);
      if (foodItem) {
        bot
          .equip(foodItem, "hand")
          .then(() => bot.consume())
          .catch((err) => logger.debug(`[AutoEat] ${err.message}`));
      }
    }
  });

  // Death handler
  bot.on("death", () => {
    logger.warn("[Bot] Bot died in-game. Respawning and cancelling active tasks...");
    cancelCurrentTask();
    if (typeof bot.respawn === "function") {
      bot.respawn();
    }
  });

  // Kicked handler (record reason, don't double reconnect)
  bot.on("kicked", (reason) => {
    const reasonStr = typeof reason === "object" ? JSON.stringify(reason) : String(reason);
    logger.connection(`[Bot] Kicked from server: ${reasonStr}`);
    connectionManager.onKicked(reasonStr);
  });

  // End / Disconnect handler (sole source of reconnection truth)
  bot.on("end", (reason) => {
    logger.connection(`[Bot] Connection ended: ${reason || "Socket closed"}`);
    connectionManager.onEnd(reason);
  });

  // Error handler
  bot.on("error", (err) => {
    logger.error(`[Bot Error] ${err.message}`);
    connectionManager.onError(err);
  });
}

module.exports = {
  attachEventHandlers,
};

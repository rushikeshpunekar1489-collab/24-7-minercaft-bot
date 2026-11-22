"use strict";

const { config } = require("../config/settings");
const logger = require("../utils/logger");

// Map to track last command execution timestamp per player: username -> timestamp
const playerLastCommandTime = new Map();

/**
 * Checks whether a given Minecraft username is authorized to command the bot.
 * @param {string} username
 * @returns {boolean}
 */
function isAuthorized(username) {
  if (!username || typeof username !== "string") return false;
  const cleanName = username.trim().toLowerCase();
  const authorized = config.security.authorizedPlayers.includes(cleanName);
  if (!authorized) {
    logger.warn(`[Auth] Unauthorized command attempt from user: ${username}`);
  }
  return authorized;
}

/**
 * Checks whether a player is exceeding command rate limits.
 * @param {string} username
 * @returns {{ allowed: boolean, remainingMs: number }}
 */
function checkRateLimit(username) {
  const cleanName = (username || "").trim().toLowerCase();
  const now = Date.now();
  const cooldown = config.security.commandCooldownMs;

  const lastTime = playerLastCommandTime.get(cleanName) || 0;
  const elapsed = now - lastTime;

  if (elapsed < cooldown) {
    return {
      allowed: false,
      remainingMs: cooldown - elapsed,
    };
  }

  playerLastCommandTime.set(cleanName, now);
  return {
    allowed: true,
    remainingMs: 0,
  };
}

/**
 * Checks if an action is considered destructive or privileged.
 * @param {string} actionType
 * @returns {boolean}
 */
function isPrivilegedAction(actionType) {
  const privileged = ["drop_all", "server_command", "destroy_zone"];
  return privileged.includes(actionType);
}

module.exports = {
  isAuthorized,
  checkRateLimit,
  isPrivilegedAction,
};

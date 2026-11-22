"use strict";

const fs = require("fs");
const path = require("path");
require("dotenv").config();
const { registerSensitiveString } = require("../utils/logger");

// Attempt to load settings.json if it exists
let fileSettings = {};
const settingsPath = path.resolve(process.cwd(), "settings.json");
if (fs.existsSync(settingsPath)) {
  try {
    const raw = fs.readFileSync(settingsPath, "utf8");
    fileSettings = JSON.parse(raw);
  } catch (err) {
    console.error("Warning: Could not parse settings.json:", err.message);
  }
}

// Helper to parse comma-separated string to lowercase trimmed list
function parseList(str, defaults = []) {
  if (!str || typeof str !== "string") return defaults;
  return str
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

// Helper for boolean env vars
function parseBool(val, defaultVal) {
  if (val === undefined || val === null || val === "") return defaultVal;
  return String(val).toLowerCase() === "true" || val === "1" || val === true;
}

const config = {
  bot: {
    name: process.env.BOT_NAME || fileSettings.name || "Jarvis Bot",
    username:
      process.env.MINECRAFT_USERNAME ||
      fileSettings["bot-account"]?.username ||
      "JarvisBot",
    password:
      process.env.MINECRAFT_PASSWORD ||
      fileSettings["bot-account"]?.password ||
      "",
    auth:
      process.env.MINECRAFT_AUTH_TYPE ||
      fileSettings["bot-account"]?.type ||
      "offline",
    autoReconnect: parseBool(
      process.env.BOT_AUTO_RECONNECT,
      fileSettings.utils?.["auto-reconnect"] ?? true
    ),
    baseReconnectDelay: parseInt(
      process.env.BASE_RECONNECT_DELAY ||
        fileSettings.utils?.["auto-reconnect-delay"] ||
        "3000",
      10
    ),
    maxReconnectDelay: parseInt(
      process.env.MAX_RECONNECT_DELAY ||
        fileSettings.utils?.["max-reconnect-delay"] ||
        "60000",
      10
    ),
  },

  server: {
    host:
      process.env.MINECRAFT_HOST ||
      process.env.MINECRAFT_SERVER_IP ||
      fileSettings.server?.ip ||
      "Rushibadmosh.aternos.me",
    port: parseInt(
      process.env.MINECRAFT_PORT || fileSettings.server?.port || "26261",
      10
    ),
    version:
      process.env.MINECRAFT_VERSION ||
      fileSettings.server?.version ||
      "26.3",
    tryCreative: parseBool(
      process.env.TRY_CREATIVE,
      fileSettings.server?.["try-creative"] ?? false
    ),
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    requestTimeoutMs: parseInt(process.env.GEMINI_TIMEOUT_MS || "15000", 10),
    maxRetries: parseInt(process.env.GEMINI_MAX_RETRIES || "2", 10),
  },

  security: {
    authorizedPlayers: parseList(
      process.env.AUTHORIZED_PLAYERS,
      ["ugrushi", "soloplayz", "rushikesh"]
    ),
    commandCooldownMs: parseInt(process.env.COMMAND_COOLDOWN_MS || "2000", 10),
    requireAuthForDestructive: true,
  },

  web: {
    port: parseInt(process.env.PORT || "5000", 10),
  },

  // Retain legacy features for compatibility
  legacy: {
    autoAuth: fileSettings.utils?.["auto-auth"] || { enabled: false },
    antiAfk: fileSettings.utils?.["anti-afk"] || { enabled: false },
    discord: fileSettings.discord || { enabled: false },
    position: fileSettings.position || { enabled: false },
  },
};

// Register secrets for log sanitization
if (config.bot.password) {
  registerSensitiveString(config.bot.password);
}
if (config.gemini.apiKey) {
  registerSensitiveString(config.gemini.apiKey);
}
if (config.legacy.autoAuth?.password) {
  registerSensitiveString(config.legacy.autoAuth.password);
}

/**
 * Returns a sanitized copy of the config safe for logging and public dashboard display
 */
function getSanitizedConfig() {
  return {
    bot: {
      name: config.bot.name,
      username: config.bot.username,
      auth: config.bot.auth,
      hasPassword: Boolean(config.bot.password),
      autoReconnect: config.bot.autoReconnect,
    },
    server: {
      host: config.server.host,
      port: config.server.port,
      version: config.server.version,
    },
    gemini: {
      hasApiKey: Boolean(config.gemini.apiKey),
      model: config.gemini.model,
    },
    security: {
      authorizedPlayers: config.security.authorizedPlayers,
      commandCooldownMs: config.security.commandCooldownMs,
    },
    web: {
      port: config.web.port,
    },
  };
}

module.exports = {
  config,
  getSanitizedConfig,
};

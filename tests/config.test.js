"use strict";

const assert = require("assert");
const { config, getSanitizedConfig } = require("../src/config/settings");

function run() {
  console.log("Running config tests...");

  assert(config.server.host, "Server host must be defined");
  assert(config.server.port === 26261 || typeof config.server.port === "number", "Server port must be a number");
  assert(Array.isArray(config.security.authorizedPlayers), "Authorized players must be an array");
  assert(config.security.authorizedPlayers.length > 0, "Authorized players should not be empty");

  // Check sanitization
  const sanitized = getSanitizedConfig();
  assert.strictEqual(sanitized.bot.password, undefined, "Sanitized config must never expose password");
  assert.strictEqual(sanitized.gemini.apiKey, undefined, "Sanitized config must never expose API key");
  assert(typeof sanitized.gemini.hasApiKey === "boolean", "hasApiKey flag should be boolean");

  console.log("Config tests passed!");
}

module.exports = run;
if (require.main === module) run();

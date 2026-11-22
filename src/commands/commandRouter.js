"use strict";

const { isAuthorized, checkRateLimit } = require("./authorization");
const { validateAction } = require("./commandRegistry");
const { executeAction } = require("../actions/actionManager");
const { askJarvis } = require("../ai/gemini");
const { getInventorySummary } = require("../actions/inventory");
const logger = require("../utils/logger");

/**
 * Handles incoming chat messages from the Minecraft server.
 * @param {object} bot
 * @param {string} username
 * @param {string} rawMessage
 */
async function handleChatMessage(bot, username, rawMessage) {
  if (!bot || !rawMessage) return;

  // Ignore messages from the bot itself
  if (username === bot.username) return;

  const trimmed = rawMessage.trim();
  const lower = trimmed.toLowerCase();

  // Check prefix: !jarvis, jarvis, or @jarvis
  const prefixes = ["!jarvis", "jarvis,", "jarvis:", "jarvis", "@jarvis"];
  const matchedPrefix = prefixes.find((p) => lower.startsWith(p));
  if (!matchedPrefix) return;

  logger.chat(`[Chat] Command received from ${username}: "${trimmed}"`);

  // 1. Authorization check
  if (!isAuthorized(username)) {
    bot.chat(`Apologies, ${username}. You are not authorized to command me.`);
    return;
  }

  // 2. Rate limit / Cooldown check
  const rateLimit = checkRateLimit(username);
  if (!rateLimit.allowed) {
    const sec = Math.ceil(rateLimit.remainingMs / 1000);
    bot.chat(`Please wait ${sec}s before issuing another command, ${username}.`);
    return;
  }

  // Extract instruction without prefix
  const instruction = trimmed.slice(matchedPrefix.length).trim();
  const lowerInst = instruction.toLowerCase();

  // 3. Fast-path direct shortcuts (zero latency, zero AI cost)
  if (lowerInst === "" || lowerInst === "help" || lowerInst === "!help") {
    bot.chat(
      "Jarvis AI Online. Commands: follow me, stop, come here, look at me, explore, status, inventory, mine <block>, build <house>, drop, or ask anything!"
    );
    return;
  }

  if (lowerInst === "stop") {
    const res = await executeAction(bot, { type: "stop", params: {} }, username);
    bot.chat(res.message);
    return;
  }

  if (lowerInst === "status") {
    const res = await executeAction(bot, { type: "status", params: {} }, username);
    bot.chat(res.message);
    return;
  }

  if (lowerInst === "inventory" || lowerInst === "inv") {
    const res = await executeAction(bot, { type: "inventory", params: {} }, username);
    bot.chat(res.message);
    return;
  }

  if (lowerInst === "follow me" || lowerInst === "follow") {
    const res = await executeAction(
      bot,
      { type: "follow", params: { target: username, distance: 2 } },
      username
    );
    bot.chat(res.message);
    return;
  }

  if (lowerInst === "come here" || lowerInst === "come") {
    const res = await executeAction(
      bot,
      { type: "come_here", params: { target: username } },
      username
    );
    bot.chat(res.message);
    return;
  }

  if (lowerInst === "look at me" || lowerInst === "look") {
    const res = await executeAction(
      bot,
      { type: "look_at", params: { target: username } },
      username
    );
    bot.chat(res.message);
    return;
  }

  if (lowerInst === "explore") {
    const res = await executeAction(
      bot,
      { type: "explore", params: { radius: 15 } },
      username
    );
    bot.chat(res.message);
    return;
  }

  // 4. Natural language processing via Gemini AI Brain
  const botContext = {
    position: bot.entity?.position,
    health: bot.health,
    food: bot.food,
    inventorySummary: getInventorySummary(bot),
  };

  const aiResult = await askJarvis(instruction, username, botContext);

  // Send AI conversational reply in chat
  if (aiResult.reply) {
    bot.chat(aiResult.reply);
  }

  // Execute structured actions parsed from Gemini
  if (aiResult.actions && aiResult.actions.length > 0) {
    for (const act of aiResult.actions) {
      const execResult = await executeAction(bot, act, username);
      if (execResult && execResult.message) {
        bot.chat(execResult.message);
      }
    }
  }
}

module.exports = {
  handleChatMessage,
};

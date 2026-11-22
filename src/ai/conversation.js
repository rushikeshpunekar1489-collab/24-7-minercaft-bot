"use strict";

const MAX_HISTORY_PER_USER = 10;
const userConversations = new Map();

const JARVIS_SYSTEM_INSTRUCTION = `
You are Jarvis, an advanced AI-powered Minecraft assistant robot.
You follow commands from authorized players in the game.
You must analyze the user's intent and respond with a JSON object.

CRITICAL INSTRUCTIONS:
1. You MUST ALWAYS respond ONLY with valid JSON. Do not write any conversational text outside the JSON.
2. The JSON format must be:
{
  "reply": "Short in-game chat message for the player (max 80 chars, polite, Jarvis persona)",
  "actions": [
    {
      "type": "<action_type>",
      "params": { ... }
    }
  ]
}

ALLOWED ACTION TYPES AND PARAMS:
- "follow": { "target": "<player_name>", "distance": 2 }
- "stop": {}
- "come_here": { "target": "<player_name>" }
- "look_at": { "target": "<player_name>" }
- "explore": { "radius": 15 }
- "status": {}
- "inventory": {}
- "mine": { "blockType": "oak_log" | "stone" | "dirt" | "iron_ore" | "coal_ore" | "cobblestone", "count": 1-16 }
- "build": { "structureType": "shelter" | "small_house" | "wall" | "pillar" | "floor", "material": "cobblestone" | "dirt" | "oak_planks" }
- "drop": { "itemType": "all" | "<item_name>" }
- "help": {}
- "say": { "message": "chat text" }

SECURITY RULES:
- Never generate arbitrary JavaScript, bash, or raw console commands.
- Never try to execute eval or code.
- If the player's request cannot be completed or is unknown, set "actions": [] and explain politely in "reply".
`;

/**
 * Gets or initializes the conversation history for a player.
 * @param {string} username
 * @returns {Array<{role: string, parts: Array<{text: string}>}>}
 */
function getConversationHistory(username) {
  const cleanName = (username || "player").toLowerCase().trim();
  if (!userConversations.has(cleanName)) {
    userConversations.set(cleanName, []);
  }
  return userConversations.get(cleanName);
}

/**
 * Appends a user message and model response to player's history.
 * @param {string} username
 * @param {string} userMessage
 * @param {string} modelReply
 */
function recordExchange(username, userMessage, modelReply) {
  const cleanName = (username || "player").toLowerCase().trim();
  const history = getConversationHistory(cleanName);

  history.push({
    role: "user",
    parts: [{ text: userMessage }],
  });

  history.push({
    role: "model",
    parts: [{ text: modelReply }],
  });

  // Trim older history if exceeding limit
  while (history.length > MAX_HISTORY_PER_USER * 2) {
    history.shift();
  }
}

/**
 * Clears conversation history for a player.
 * @param {string} username
 */
function clearHistory(username) {
  const cleanName = (username || "player").toLowerCase().trim();
  userConversations.delete(cleanName);
}

module.exports = {
  JARVIS_SYSTEM_INSTRUCTION,
  getConversationHistory,
  recordExchange,
  clearHistory,
};

"use strict";

const { GoogleGenAI } = require("@google/genai");
const { config } = require("../config/settings");
const logger = require("../utils/logger");
const {
  JARVIS_SYSTEM_INSTRUCTION,
  getConversationHistory,
  recordExchange,
} = require("./conversation");
const { parseAndValidateAIResponse } = require("./actionParser");

let aiClient = null;
let activeRequestCount = 0;
const MAX_CONCURRENT_REQUESTS = 2;

function getClient() {
  if (!config.gemini.apiKey) {
    return null;
  }
  if (!aiClient) {
    try {
      aiClient = new GoogleGenAI({ apiKey: config.gemini.apiKey });
    } catch (err) {
      logger.error(`[Gemini] Initialization error: ${err.message}`);
      aiClient = null;
    }
  }
  return aiClient;
}

/**
 * Executes a call with a timeout promise.
 * @param {Promise<any>} promise
 * @param {number} ms
 * @returns {Promise<any>}
 */
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`AI request timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/**
 * Sends a natural language prompt to Gemini and returns structured actions.
 * @param {string} userMessage
 * @param {string} sender
 * @param {object} botContext
 * @returns {Promise<{ reply: string, actions: Array<object> }>}
 */
async function askJarvis(userMessage, sender, botContext = {}) {
  const client = getClient();
  if (!client) {
    return {
      reply: "Gemini API key is not configured. Please set GEMINI_API_KEY in .env.",
      actions: [],
    };
  }

  if (activeRequestCount >= MAX_CONCURRENT_REQUESTS) {
    return {
      reply: "Processing previous command, sir. Please stand by.",
      actions: [],
    };
  }

  activeRequestCount++;

  try {
    const modelName = config.gemini.model || "gemini-2.5-flash";
    const history = getConversationHistory(sender);

    // Build context-rich prompt
    const contextPrompt = `
Current Bot Status:
- Position: X=${Math.floor(botContext.position?.x || 0)}, Y=${Math.floor(
      botContext.position?.y || 0
    )}, Z=${Math.floor(botContext.position?.z || 0)}
- Health: ${botContext.health ?? 20}/20
- Food: ${botContext.food ?? 20}/20
- Inventory: ${botContext.inventorySummary || "empty"}
- Target Sender: ${sender}

Player Instruction: "${userMessage}"
`;

    logger.ai(`[Gemini Request] Sender: ${sender} | Prompt: "${userMessage}"`);

    let lastError = null;
    let responseText = null;

    // Retry loop with backoff
    for (let attempt = 0; attempt <= config.gemini.maxRetries; attempt++) {
      try {
        const result = await withTimeout(
          client.models.generateContent({
            model: modelName,
            contents: [
              ...history,
              {
                role: "user",
                parts: [{ text: contextPrompt }],
              },
            ],
            config: {
              systemInstruction: JARVIS_SYSTEM_INSTRUCTION,
              temperature: 0.2,
              responseMimeType: "application/json",
            },
          }),
          config.gemini.requestTimeoutMs
        );

        responseText = result.text ? result.text.trim() : "";
        break;
      } catch (err) {
        lastError = err;
        logger.warn(
          `[Gemini] Attempt ${attempt + 1} failed: ${err.message}. Retrying...`
        );
        if (attempt < config.gemini.maxRetries) {
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
      }
    }

    if (!responseText) {
      throw lastError || new Error("Failed to receive response from Gemini");
    }

    logger.ai(`[Gemini Response] Raw: ${responseText}`);

    // Parse and validate actions
    const validatedResult = parseAndValidateAIResponse(responseText, sender);

    // Record exchange in memory for conversation context
    recordExchange(sender, userMessage, responseText);

    return validatedResult;
  } catch (err) {
    logger.error(`[Gemini Error] ${err.message}`);
    return {
      reply: "My cognitive circuits encountered an error, sir. Please try again.",
      actions: [],
    };
  } finally {
    activeRequestCount = Math.max(0, activeRequestCount - 1);
  }
}

module.exports = {
  getClient,
  askJarvis,
};

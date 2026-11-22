"use strict";

const { validateAction } = require("../commands/commandRegistry");
const logger = require("../utils/logger");

/**
 * Parses raw text from Gemini into a validated action bundle.
 * @param {string} rawText
 * @param {string} sender
 * @returns {{ reply: string, actions: Array<object>, error?: string }}
 */
function parseAndValidateAIResponse(rawText, sender) {
  if (!rawText || typeof rawText !== "string") {
    return {
      reply: "I was unable to formulate a response, sir.",
      actions: [],
      error: "Empty or invalid response from AI model",
    };
  }

  let cleaned = rawText.trim();

  // Strip markdown code fences if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }

  // Attempt to locate JSON object substring if model added extra text
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  let parsed = null;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    logger.warn(`[AI Parser] Failed to parse JSON from AI: ${err.message}. Raw text: ${rawText}`);
    return {
      reply: rawText.length <= 100 ? rawText : "Understood, sir.",
      actions: [],
      error: `JSON parse error: ${err.message}`,
    };
  }

  const reply = typeof parsed.reply === "string" ? parsed.reply : "Action acknowledged, sir.";
  const rawActions = Array.isArray(parsed.actions) ? parsed.actions : [];

  const validatedActions = [];
  for (const act of rawActions) {
    if (!act || typeof act !== "object" || !act.type) {
      continue;
    }

    const validation = validateAction(act.type, act.params || {}, sender);
    if (validation.valid && validation.action) {
      validatedActions.push(validation.action);
    } else {
      logger.warn(`[AI Parser] Action rejected by registry: ${act.type} (${validation.error})`);
    }
  }

  return {
    reply,
    actions: validatedActions,
  };
}

module.exports = {
  parseAndValidateAIResponse,
};

"use strict";

const logger = require("./logger");

/**
 * Executes an async function safely, catching and logging any errors without unhandled rejections.
 * @param {Function} fn - Async function to run
 * @param {string} context - Context string for logs
 * @param {any} fallback - Optional fallback value on error
 * @returns {Promise<any>}
 */
async function safeAsync(fn, context = "AsyncOperation", fallback = null) {
  try {
    return await fn();
  } catch (err) {
    logger.error(`[${context}] Error: ${err.message || String(err)}`);
    return fallback;
  }
}

/**
 * Standardizes an error into a clean object.
 * @param {any} err
 * @returns {{message: string, stack?: string}}
 */
function formatError(err) {
  if (err instanceof Error) {
    return {
      message: err.message,
      stack: err.stack,
    };
  }
  return {
    message: String(err),
  };
}

module.exports = {
  safeAsync,
  formatError,
};

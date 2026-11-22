"use strict";

/**
 * DEPRECATED: Scheduled leave-and-rejoin logic has been removed per architectural update.
 * Jarvis maintains a stable persistent TCP connection and uses exponential reconnect backoff.
 */
function setupLeaveRejoin(bot, createBot) {
  // Intentional no-op: Bot maintains persistent connection without artificial disconnect timers
  return {
    cleanup: () => {},
  };
}

module.exports = setupLeaveRejoin;

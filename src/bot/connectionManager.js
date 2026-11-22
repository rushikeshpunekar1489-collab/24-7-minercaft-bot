"use strict";

const mcProtocol = require("minecraft-protocol");
const { config } = require("../config/settings");
const logger = require("../utils/logger");
const { createBotInstance } = require("./createBot");
const { attachEventHandlers } = require("./eventHandlers");
const { cancelCurrentTask } = require("../actions/actionManager");

const ConnectionState = {
  STOPPED: "STOPPED",
  CONNECTING: "CONNECTING",
  CONNECTED: "CONNECTED",
  SPAWNED: "SPAWNED",
  RECONNECTING: "RECONNECTING",
};

class ConnectionManager {
  constructor() {
    this.state = ConnectionState.STOPPED;
    this.bot = null;
    this.reconnectAttempts = 0;
    this.reconnectTimerId = null;
    this.spawnTimeoutId = null;
    this.wasThrottled = false;
    this.startTime = Date.now();
    this.lastSpawnTime = 0;
    this.errors = [];
    this.serverStatus = null;
  }

  getState() {
    return this.state;
  }

  isSpawned() {
    return this.state === ConnectionState.SPAWNED;
  }

  getBot() {
    return this.bot;
  }

  getUptimeSeconds() {
    if (!this.lastSpawnTime || this.state !== ConnectionState.SPAWNED) {
      return 0;
    }
    return Math.floor((Date.now() - this.lastSpawnTime) / 1000);
  }

  /**
   * Pings the server for live diagnostics.
   * @returns {Promise<object|null>}
   */
  async pingServer() {
    return new Promise((resolve) => {
      mcProtocol.ping(
        {
          host: config.server.host,
          port: config.server.port,
          timeout: 6000,
        },
        (err, res) => {
          if (err) {
            this.serverStatus = { online: false, error: err.message };
            resolve(this.serverStatus);
          } else {
            this.serverStatus = {
              online: true,
              version: res.version,
              players: res.players,
              latency: res.latency,
            };
            resolve(this.serverStatus);
          }
        }
      );
    });
  }

  /**
   * Calculates exponential backoff delay with jitter.
   * @returns {number} Delay in milliseconds
   */
  calculateReconnectDelay() {
    if (this.wasThrottled) {
      this.wasThrottled = false;
      const throttleDelay = 60000 + Math.floor(Math.random() * 30000);
      logger.connection(
        `[ConnectionManager] Rate-limited/throttled. Using extended backoff: ${throttleDelay / 1000}s`
      );
      return throttleDelay;
    }

    const base = config.bot.baseReconnectDelay;
    const max = config.bot.maxReconnectDelay;
    const exponential = base * Math.pow(2, Math.min(this.reconnectAttempts, 6));
    const jitter = Math.floor(Math.random() * 2000);
    return Math.min(exponential, max) + jitter;
  }

  clearTimers() {
    if (this.reconnectTimerId) {
      clearTimeout(this.reconnectTimerId);
      this.reconnectTimerId = null;
    }
    if (this.spawnTimeoutId) {
      clearTimeout(this.spawnTimeoutId);
      this.spawnTimeoutId = null;
    }
  }

  cleanupBotInstance() {
    cancelCurrentTask();
    this.clearTimers();

    if (this.bot) {
      try {
        this.bot.removeAllListeners();
        this.bot.end();
      } catch (err) {
        logger.debug(`[ConnectionManager] Cleanup error: ${err.message}`);
      }
      this.bot = null;
    }
  }

  start() {
    if (this.state === ConnectionState.CONNECTING || this.state === ConnectionState.SPAWNED) {
      logger.info("[ConnectionManager] Bot is already running or connecting.");
      return;
    }

    logger.connection("[ConnectionManager] Starting Jarvis bot connection lifecycle...");
    this.reconnectAttempts = 0;
    this.connect();
  }

  connect() {
    this.cleanupBotInstance();
    this.state = ConnectionState.CONNECTING;

    logger.connection(
      `[ConnectionManager] Initializing bot instance (Attempt #${this.reconnectAttempts + 1})...`
    );

    try {
      this.bot = createBotInstance();
      attachEventHandlers(this.bot, this);

      // Spawn timeout failsafe (120 seconds for slow Aternos queues)
      this.spawnTimeoutId = setTimeout(() => {
        if (this.state !== ConnectionState.SPAWNED) {
          logger.warn("[ConnectionManager] Spawn timeout reached (120s). Restarting connection...");
          this.scheduleReconnect("Spawn timeout");
        }
      }, 120000);
    } catch (err) {
      logger.error(`[ConnectionManager] Failed to create bot: ${err.message}`);
      this.recordError("create_bot_failed", err.message);
      this.scheduleReconnect("Create bot error");
    }
  }

  onSpawn() {
    this.clearTimers();
    this.state = ConnectionState.SPAWNED;
    this.reconnectAttempts = 0;
    this.wasThrottled = false;
    this.lastSpawnTime = Date.now();

    logger.connection(
      `[ConnectionManager] [+] Jarvis successfully spawned on ${config.server.host}:${config.server.port} (MC Version: ${this.bot?.version || "auto"})`
    );
  }

  onKicked(reason) {
    this.state = ConnectionState.DISCONNECTED;
    this.recordError("kicked", reason);

    const lower = reason.toLowerCase();
    if (
      lower.includes("throttl") ||
      lower.includes("wait before") ||
      lower.includes("too fast") ||
      lower.includes("rate limit")
    ) {
      this.wasThrottled = true;
    }
    // Note: Reconnect is triggered by 'end' event which follows 'kicked'
  }

  onEnd(reason) {
    if (this.state === ConnectionState.STOPPED) {
      return;
    }

    this.state = ConnectionState.DISCONNECTED;
    this.recordError("disconnect", reason || "Socket closed");
    cancelCurrentTask();

    if (config.bot.autoReconnect) {
      this.scheduleReconnect(reason || "Connection ended");
    } else {
      logger.connection("[ConnectionManager] Auto-reconnect is disabled in settings. Bot will remain idle.");
    }
  }

  onError(err) {
    this.recordError("bot_error", err.message);
  }

  scheduleReconnect(reason = "Unknown") {
    if (this.state === ConnectionState.STOPPED) return;
    if (this.reconnectTimerId) return; // Prevent duplicate timers

    this.state = ConnectionState.RECONNECTING;
    this.reconnectAttempts++;

    const delay = this.calculateReconnectDelay();
    logger.connection(
      `[ConnectionManager] Reconnecting in ${(delay / 1000).toFixed(1)}s (Reason: ${reason}, Attempt #${this.reconnectAttempts})`
    );

    this.reconnectTimerId = setTimeout(() => {
      this.reconnectTimerId = null;
      if (this.state !== ConnectionState.STOPPED) {
        this.connect();
      }
    }, delay);
  }

  stop() {
    logger.connection("[ConnectionManager] Graceful shutdown requested.");
    this.state = ConnectionState.STOPPED;
    this.cleanupBotInstance();
    logger.connection("[ConnectionManager] Bot stopped and cleaned up.");
  }

  recordError(type, message) {
    this.errors.push({ type, message, timestamp: new Date().toISOString() });
    if (this.errors.length > 50) {
      this.errors.shift();
    }
  }

  getStatus() {
    const coords = this.bot?.entity?.position;
    return {
      state: this.state,
      connected: this.state === ConnectionState.SPAWNED,
      uptimeSeconds: this.getUptimeSeconds(),
      reconnectAttempts: this.reconnectAttempts,
      coordinates: coords
        ? {
            x: Math.floor(coords.x),
            y: Math.floor(coords.y),
            z: Math.floor(coords.z),
          }
        : null,
      server: {
        host: config.server.host,
        port: config.server.port,
        version: config.server.version,
      },
      serverStatus: this.serverStatus,
      recentErrors: this.errors.slice(-5),
    };
  }
}

module.exports = {
  ConnectionManager,
  ConnectionState,
};

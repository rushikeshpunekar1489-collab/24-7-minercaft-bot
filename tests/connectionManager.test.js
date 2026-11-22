"use strict";

const assert = require("assert");
const { ConnectionManager, ConnectionState } = require("../src/bot/connectionManager");

function run() {
  console.log("Running connection manager tests...");

  const cm = new ConnectionManager();

  // Initial state
  assert.strictEqual(cm.getState(), ConnectionState.STOPPED);
  assert.strictEqual(cm.isSpawned(), false);
  assert.strictEqual(cm.getUptimeSeconds(), 0);

  // Backoff calculation test
  const { config } = require("../src/config/settings");
  cm.reconnectAttempts = 0;
  const delay0 = cm.calculateReconnectDelay();
  assert(
    delay0 >= config.bot.baseReconnectDelay && delay0 <= config.bot.baseReconnectDelay + 3000,
    `Delay 0 should be around base delay: ${delay0}`
  );

  cm.reconnectAttempts = 3;
  const delay3 = cm.calculateReconnectDelay();
  assert(delay3 >= delay0, `Delay 3 (${delay3}) should be greater than or equal to delay 0 (${delay0})`);

  cm.reconnectAttempts = 20; // very high
  const delayMax = cm.calculateReconnectDelay();
  assert(delayMax <= config.bot.maxReconnectDelay + 3000, `Delay should be capped at maxDelay + jitter: ${delayMax}`);

  // Throttled backoff
  cm.wasThrottled = true;
  const throttleDelay = cm.calculateReconnectDelay();
  assert(throttleDelay >= 60000, "Throttled delay should be at least 60s");
  assert.strictEqual(cm.wasThrottled, false, "Throttle flag should be cleared after calculation");

  // State transitions
  cm.onSpawn();
  assert.strictEqual(cm.getState(), ConnectionState.SPAWNED);
  assert.strictEqual(cm.isSpawned(), true);

  cm.onKicked("kicked by operator");
  assert.strictEqual(cm.getState(), ConnectionState.DISCONNECTED);

  cm.stop();
  assert.strictEqual(cm.getState(), ConnectionState.STOPPED);

  console.log("Connection manager tests passed!");
}

module.exports = run;
if (require.main === module) run();

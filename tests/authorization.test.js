"use strict";

const assert = require("assert");
const { isAuthorized, checkRateLimit, isPrivilegedAction } = require("../src/commands/authorization");
const { config } = require("../src/config/settings");

function run() {
  console.log("Running authorization tests...");

  // Assume ugrushi is authorized
  const testUser = config.security.authorizedPlayers[0];
  assert(testUser, "Must have at least one authorized player configured");

  assert.strictEqual(isAuthorized(testUser), true, `${testUser} should be authorized`);
  assert.strictEqual(isAuthorized(testUser.toUpperCase()), true, "Authorization should be case-insensitive");
  assert.strictEqual(isAuthorized("random_unauthorized_user_12345"), false, "Random user should NOT be authorized");
  assert.strictEqual(isAuthorized(""), false, "Empty username should NOT be authorized");
  assert.strictEqual(isAuthorized(null), false, "Null username should NOT be authorized");

  // Rate limiting test
  const rateLimitUser = "ratelimit_tester";
  const first = checkRateLimit(rateLimitUser);
  assert.strictEqual(first.allowed, true, "First command should be allowed");

  const immediate = checkRateLimit(rateLimitUser);
  assert.strictEqual(immediate.allowed, false, "Immediate subsequent command should be rate-limited");
  assert(immediate.remainingMs > 0, "Remaining ms should be positive");

  // Privileged actions test
  assert.strictEqual(isPrivilegedAction("drop_all"), true, "drop_all is privileged");
  assert.strictEqual(isPrivilegedAction("follow"), false, "follow is not privileged");

  console.log("Authorization tests passed!");
}

module.exports = run;
if (require.main === module) run();

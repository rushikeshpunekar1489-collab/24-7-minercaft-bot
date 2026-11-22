"use strict";

const tests = [
  { name: "Config Suite", fn: require("./config.test") },
  { name: "Authorization Suite", fn: require("./authorization.test") },
  { name: "Command Registry Suite", fn: require("./commandRegistry.test") },
  { name: "Action Parser Suite", fn: require("./actionParser.test") },
  { name: "Connection Manager Suite", fn: require("./connectionManager.test") },
  { name: "Logger Sanitization Suite", fn: require("./logger.test") },
];

console.log("==================================================");
console.log("  MINECRAFT JARVIS BOT - AUTOMATED TEST RUNNER   ");
console.log("==================================================");

let failed = 0;
let passed = 0;

for (const t of tests) {
  try {
    console.log(`\n[TEST] Running: ${t.name}`);
    t.fn();
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${t.name} failed:`, err);
    failed++;
  }
}

console.log("\n==================================================");
console.log(`Test Results: ${passed} passed, ${failed} failed.`);
console.log("==================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("ALL TESTS COMPLETED SUCCESSFULLY! ✓");
  process.exit(0);
}

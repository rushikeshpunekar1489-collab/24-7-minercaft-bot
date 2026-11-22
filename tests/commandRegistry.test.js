"use strict";

const assert = require("assert");
const { validateAction, ALLOWED_MINE_BLOCKS } = require("../src/commands/commandRegistry");

function run() {
  console.log("Running command registry tests...");

  // Valid actions
  const followVal = validateAction("follow", { distance: 3 }, "ugrushi");
  assert.strictEqual(followVal.valid, true);
  assert.strictEqual(followVal.action.type, "follow");
  assert.strictEqual(followVal.action.params.target, "ugrushi");
  assert.strictEqual(followVal.action.params.distance, 3);

  const stopVal = validateAction("stop");
  assert.strictEqual(stopVal.valid, true);
  assert.strictEqual(stopVal.action.type, "stop");

  const mineVal = validateAction("mine", { blockType: "oak_log", count: 5 });
  assert.strictEqual(mineVal.valid, true);
  assert.strictEqual(mineVal.action.params.blockType, "oak_log");
  assert.strictEqual(mineVal.action.params.count, 5);

  // Mining parameter normalization
  const woodVal = validateAction("mine", { blockType: "wood" });
  assert.strictEqual(woodVal.valid, true);
  assert.strictEqual(woodVal.action.params.blockType, "oak_log");

  // Rejection of invalid mining targets (e.g. bedrock, barrier)
  const illegalMine = validateAction("mine", { blockType: "bedrock" });
  assert.strictEqual(illegalMine.valid, false);

  // Rejection of unknown / arbitrary actions (NO eval, NO Function, NO arbitrary commands)
  const evalVal = validateAction("eval", { code: "process.exit(1)" });
  assert.strictEqual(evalVal.valid, false);

  const execVal = validateAction("exec", { cmd: "rm -rf" });
  assert.strictEqual(execVal.valid, false);

  console.log("Command registry tests passed!");
}

module.exports = run;
if (require.main === module) run();

"use strict";

const assert = require("assert");
const { parseAndValidateAIResponse } = require("../src/ai/actionParser");

function run() {
  console.log("Running action parser tests...");

  // 1. Clean JSON response
  const validJson = JSON.stringify({
    reply: "Right away, sir.",
    actions: [
      { type: "follow", params: { target: "ugrushi", distance: 2 } },
    ],
  });
  const res1 = parseAndValidateAIResponse(validJson, "ugrushi");
  assert.strictEqual(res1.reply, "Right away, sir.");
  assert.strictEqual(res1.actions.length, 1);
  assert.strictEqual(res1.actions[0].type, "follow");
  assert.strictEqual(res1.actions[0].params.target, "ugrushi");

  // 2. Markdown fenced response (common LLM pattern)
  const markdownFenced = `\`\`\`json
{
  "reply": "Mining stone for you.",
  "actions": [
    { "type": "mine", "params": { "blockType": "stone", "count": 4 } }
  ]
}
\`\`\``;
  const res2 = parseAndValidateAIResponse(markdownFenced, "ugrushi");
  assert.strictEqual(res2.reply, "Mining stone for you.");
  assert.strictEqual(res2.actions.length, 1);
  assert.strictEqual(res2.actions[0].type, "mine");
  assert.strictEqual(res2.actions[0].params.count, 4);

  // 3. Response with conversational preamble and epilogue
  const mixedText = `Certainly! Here is your command:
{
  "reply": "Building shelter now.",
  "actions": [
    { "type": "build", "params": { "structureType": "shelter" } }
  ]
}
Hope this helps!`;
  const res3 = parseAndValidateAIResponse(mixedText, "ugrushi");
  assert.strictEqual(res3.reply, "Building shelter now.");
  assert.strictEqual(res3.actions.length, 1);
  assert.strictEqual(res3.actions[0].type, "build");

  // 4. Malicious actions injected by model should be dropped
  const maliciousJson = JSON.stringify({
    reply: "Hacked!",
    actions: [
      { type: "eval", params: { code: "console.log('hacked')" } },
      { type: "unknown_hack", params: {} },
      { type: "status", params: {} },
    ],
  });
  const res4 = parseAndValidateAIResponse(maliciousJson, "ugrushi");
  assert.strictEqual(res4.actions.length, 1, "Only safe whitelist action should survive");
  assert.strictEqual(res4.actions[0].type, "status");

  // 5. Malformed text fallback
  const malformed = "I cannot fulfill this request at this time.";
  const res5 = parseAndValidateAIResponse(malformed, "ugrushi");
  assert.strictEqual(res5.actions.length, 0);
  assert(res5.reply.includes("I cannot fulfill"), "Should fallback gracefully to text reply");

  console.log("Action parser tests passed!");
}

module.exports = run;
if (require.main === module) run();

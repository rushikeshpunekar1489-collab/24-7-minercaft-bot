"use strict";

const assert = require("assert");
const { sanitize, registerSensitiveString } = require("../src/utils/logger");

function run() {
  console.log("Running logger sanitization tests...");

  // Register a custom sensitive string
  const secretKey = "super_secret_mc_password_987";
  registerSensitiveString(secretKey);

  const raw1 = `Connecting with password ${secretKey} to server`;
  const sanitized1 = sanitize(raw1);
  assert(!sanitized1.includes(secretKey), "Custom sensitive password must be redacted");
  assert(sanitized1.includes("[REDACTED]"), "Should contain [REDACTED]");

  // Test Google API key regex redaction
  const fakeApiKey = "AIzaSyD-fakeKey1234567890abcdefghijklm";
  const raw2 = `Using Gemini key ${fakeApiKey} for request`;
  const sanitized2 = sanitize(raw2);
  assert(!sanitized2.includes(fakeApiKey), "Google API key pattern must be redacted");
  assert(sanitized2.includes("[REDACTED]"), "Should contain [REDACTED]");

  console.log("Logger sanitization tests passed!");
}

module.exports = run;
if (require.main === module) run();

"use strict";

const logs = [];
const MAX_LOGS = 500;

// Registry of sensitive strings to redact
const sensitivePatterns = [
  /AIza[0-9A-Za-z-_]{30,40}/g, // Google API keys
  /Bearer\s+[A-Za-z0-9._~+/-]+=*/gi,
  /(?:password|secret|token|apiKey|api_key)["']?\s*[:=]\s*["']?([^"',\s]+)/gi,
];

let customRedactionStrings = [];

function registerSensitiveString(str) {
  if (typeof str === "string" && str.trim().length >= 4) {
    if (!customRedactionStrings.includes(str.trim())) {
      customRedactionStrings.push(str.trim());
    }
  }
}

function sanitize(message) {
  if (typeof message !== "string") {
    try {
      message = JSON.stringify(message);
    } catch {
      message = String(message);
    }
  }

  let sanitized = message;

  // Redact registered exact sensitive strings (passwords, api keys)
  for (const secret of customRedactionStrings) {
    if (secret) {
      sanitized = sanitized.split(secret).join("[REDACTED]");
    }
  }

  // Redact known regex patterns
  for (const pattern of sensitivePatterns) {
    sanitized = sanitized.replace(pattern, (match, ...args) => {
      const offsetIdx = args.findIndex((a) => typeof a === "number");
      const captures = args.slice(0, offsetIdx);
      if (captures.length > 0 && typeof captures[0] === "string" && captures[0].length > 0) {
        return match.replace(captures[0], "[REDACTED]");
      }
      return "[REDACTED]";
    });
  }

  return sanitized;
}

function log(level, message, ...meta) {
  const timestamp = new Date().toISOString();
  let fullMessage = message;

  if (meta.length > 0) {
    const metaStr = meta
      .map((m) => (typeof m === "object" ? JSON.stringify(m) : String(m)))
      .join(" ");
    fullMessage = `${message} ${metaStr}`;
  }

  const cleanMessage = sanitize(fullMessage);
  const formatted = `[${timestamp}] [${level.toUpperCase()}] ${cleanMessage}`;

  console.log(formatted);

  logs.push(formatted);
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }
}

function info(msg, ...meta) {
  log("info", msg, ...meta);
}

function warn(msg, ...meta) {
  log("warn", msg, ...meta);
}

function error(msg, ...meta) {
  log("error", msg, ...meta);
}

function debug(msg, ...meta) {
  log("debug", msg, ...meta);
}

function chat(msg, ...meta) {
  log("chat", msg, ...meta);
}

function ai(msg, ...meta) {
  log("ai", msg, ...meta);
}

function action(msg, ...meta) {
  log("action", msg, ...meta);
}

function connection(msg, ...meta) {
  log("connection", msg, ...meta);
}

// Backward compatibility with legacy logger
function addLog(msg) {
  info(msg);
}

function getLogs() {
  return [...logs];
}

module.exports = {
  log,
  info,
  warn,
  error,
  debug,
  chat,
  ai,
  action,
  connection,
  addLog,
  getLogs,
  sanitize,
  registerSensitiveString,
};

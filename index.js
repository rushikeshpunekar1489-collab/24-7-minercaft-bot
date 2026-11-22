"use strict";

const express = require("express");
const http = require("http");
const https = require("https");
const { config, getSanitizedConfig } = require("./src/config/settings");
const logger = require("./src/utils/logger");
const { ConnectionManager } = require("./src/bot/connectionManager");
const { handleChatMessage } = require("./src/commands/commandRouter");

// ============================================================
// INITIALIZE BOT & CONNECTION MANAGER
// ============================================================
const connectionManager = new ConnectionManager();

// ============================================================
// EXPRESS DASHBOARD & MONITORING SERVER
// ============================================================
const app = express();
app.use(express.json());
const PORT = config.web.port || 5000;

// Escape HTML helper
function escapeHTML(str) {
  if (typeof str !== "string") return "";
  return str.replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[m]
  );
}

// Format seconds helper
function formatSeconds(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

// Dashboard Page
app.get("/", (req, res) => {
  const status = connectionManager.getStatus();
  const sanitized = getSanitizedConfig();

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <title>${escapeHTML(sanitized.bot.name)} Dashboard</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" media="print" onload="this.media='all'"
              href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
        <style>
          *, *::before, *::after { box-sizing: border-box; }
          body {
            font-family: 'Inter', -apple-system, sans-serif;
            background: #0d1117;
            color: #e6edf3;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            padding: 24px;
          }
          main { width: 100%; max-width: 520px; }
          header { margin-bottom: 24px; }
          header h1 {
            font-size: 26px;
            font-weight: 700;
            color: #58a6ff;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          header p {
            font-size: 14px;
            color: #8b949e;
            margin: 6px 0 0;
          }
          .status-section {
            border-radius: 12px;
            padding: 18px 22px;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 16px;
            transition: background 0.3s, border-color 0.3s;
          }
          .status-section.online  { background: #0d2218; border: 2px solid #238636; }
          .status-section.offline { background: #200d0d; border: 2px solid #da3633; }
          .status-section.reconnecting { background: #221c09; border: 2px solid #d29922; }

          .status-icon {
            width: 44px; height: 44px;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 20px; flex-shrink: 0;
          }
          .status-icon.online  { background: #238636; color: #fff; }
          .status-icon.offline { background: #da3633; color: #fff; }
          .status-icon.reconnecting { background: #d29922; color: #fff; }

          .status-label { font-size: 18px; font-weight: 700; }
          .status-label.online  { color: #3fb950; }
          .status-label.offline { color: #f85149; }
          .status-label.reconnecting { color: #e3b341; }
          .status-detail { font-size: 13px; color: #8b949e; margin-top: 3px; }

          .stat-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 16px;
          }
          .stat-card {
            background: #161b22;
            border: 1px solid #21262d;
            border-radius: 10px;
            padding: 12px 16px;
          }
          .stat-card.full { grid-column: span 2; }
          .stat-title { font-size: 12px; color: #8b949e; font-weight: 600; margin-bottom: 4px; }
          .stat-val { font-size: 15px; font-weight: 600; color: #e6edf3; }

          .controls { margin-top: 8px; }
          .btn-grid { display: grid; gap: 10px; margin-bottom: 10px; }
          .btn-grid-2 { grid-template-columns: 1fr 1fr; }
          .btn-primary {
            min-height: 48px; border-radius: 10px;
            font-size: 14px; font-weight: 700;
            cursor: pointer;
            font-family: inherit;
            transition: opacity 0.2s, filter 0.2s;
          }
          .btn-primary:hover  { filter: brightness(1.1); }
          .btn-start { border: 2px solid #238636; background: #0d2218; color: #3fb950; }
          .btn-stop  { border: 2px solid #da3633; background: #200d0d; color: #f85149; }
          .btn-secondary {
            min-height: 40px; border-radius: 10px;
            border: 1px solid #21262d; background: #161b22; color: #8b949e;
            font-size: 13px; font-weight: 500;
            text-decoration: none;
            display: flex; align-items: center; justify-content: center;
            font-family: inherit; cursor: pointer;
          }
          .btn-secondary:hover { background: #21262d; color: #c9d1d9; }
          footer { margin-top: 24px; text-align: center; font-size: 12px; color: #484f58; }
        </style>
      </head>
      <body>
        <main>
          <header>
            <h1>⚡ ${escapeHTML(sanitized.bot.name)}</h1>
            <p>AI-Powered Minecraft Assistant &middot; Google Gemini Brain</p>
          </header>

          <section id="status-section" class="status-section offline">
            <div id="status-icon" class="status-icon offline">&#x2717;</div>
            <div>
              <div id="status-label" class="status-label offline">Initializing…</div>
              <div id="status-detail" class="status-detail">Checking server state…</div>
            </div>
          </section>

          <div class="stat-grid">
            <div class="stat-card">
              <div class="stat-title">Minecraft Server</div>
              <div class="stat-val">${escapeHTML(sanitized.server.host)}:${sanitized.server.port}</div>
            </div>
            <div class="stat-card">
              <div class="stat-title">MC Version</div>
              <div class="stat-val">${escapeHTML(sanitized.server.version)}</div>
            </div>
            <div class="stat-card">
              <div class="stat-title">AI Brain Model</div>
              <div class="stat-val">${escapeHTML(sanitized.gemini.model)} ${sanitized.gemini.hasApiKey ? "🟢" : "⚠️ Key Missing"}</div>
            </div>
            <div class="stat-card">
              <div class="stat-title">Bot Username</div>
              <div class="stat-val">${escapeHTML(sanitized.bot.username)}</div>
            </div>
            <div class="stat-card full">
              <div class="stat-title">Authorized Players</div>
              <div class="stat-val">${escapeHTML(sanitized.security.authorizedPlayers.join(", ") || "None")}</div>
            </div>
            <div class="stat-card">
              <div class="stat-title">Uptime</div>
              <div id="uptime-text" class="stat-val">—</div>
            </div>
            <div class="stat-card">
              <div class="stat-title">Coordinates</div>
              <div id="coords-text" class="stat-val">—</div>
            </div>
          </div>

          <section class="controls">
            <div class="btn-grid btn-grid-2">
              <button class="btn-primary btn-start" onclick="startBot()">Start Bot</button>
              <button class="btn-primary btn-stop" onclick="stopBot()">Stop Bot</button>
            </div>
            <div class="btn-grid btn-grid-2">
              <a href="/logs" class="btn-secondary">View Live Logs</a>
              <a href="/health" target="_blank" class="btn-secondary">JSON Health API</a>
            </div>
          </section>

          <footer>
            Jarvis 24/7 Minecraft Bot &middot; Status auto-refreshes every 4s
          </footer>
        </main>

        <script>
          function formatUptime(s) {
            const h = Math.floor(s / 3600);
            const m = Math.floor((s % 3600) / 60);
            const sec = s % 60;
            if (h > 0) return h + 'h ' + m + 'm ' + sec + 's';
            if (m > 0) return m + 'm ' + sec + 's';
            return sec + 's';
          }

          async function update() {
            try {
              const res = await fetch('/health');
              const data = await res.json();
              const state = data.state;
              const online = state === 'SPAWNED';

              const section = document.getElementById('status-section');
              const icon    = document.getElementById('status-icon');
              const label   = document.getElementById('status-label');
              const detail  = document.getElementById('status-detail');

              let cls = online ? 'online' : (state === 'RECONNECTING' || state === 'CONNECTING' ? 'reconnecting' : 'offline');
              section.className = 'status-section ' + cls;
              icon.className    = 'status-icon '    + cls;
              icon.textContent  = online ? '✓' : (cls === 'reconnecting' ? '⟳' : '✗');
              label.className   = 'status-label '   + cls;
              label.textContent = state;
              detail.textContent = online ? 'In-game & responding to commands' : (data.serverStatus && !data.serverStatus.online ? 'Server offline or unreachable' : 'Reconnection attempt #' + data.reconnectAttempts);

              document.getElementById('uptime-text').textContent = formatUptime(data.uptimeSeconds || 0);

              if (data.coordinates) {
                document.getElementById('coords-text').textContent = 'X=' + data.coordinates.x + ' Y=' + data.coordinates.y + ' Z=' + data.coordinates.z;
              } else {
                document.getElementById('coords-text').textContent = 'Not spawned';
              }
            } catch (err) {
              console.error(err);
            }
          }

          async function startBot() {
            const res = await fetch('/start', { method: 'POST' });
            const d = await res.json();
            alert(d.message);
            update();
          }

          async function stopBot() {
            const res = await fetch('/stop', { method: 'POST' });
            const d = await res.json();
            alert(d.message);
            update();
          }

          setInterval(update, 4000);
          update();
        </script>
      </body>
    </html>
  `);
});

// JSON Health API
app.get("/health", async (req, res) => {
  const status = connectionManager.getStatus();
  res.json({
    ...status,
    memoryMB: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1),
  });
});

app.get("/ping", (req, res) => res.send("pong"));

// Live Logs Viewer
app.get("/logs", (req, res) => {
  const logs = logger.getLogs();
  const logCount = logs.length;

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <title>Jarvis - Live Logs</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
        <style>
          *, *::before, *::after { box-sizing: border-box; }
          body {
            font-family: 'Inter', -apple-system, sans-serif;
            background: #0d1117;
            color: #e6edf3;
            margin: 0; padding: 32px 20px;
          }
          main { max-width: 800px; margin: 0 auto; }
          .back-btn {
            color: #8b949e; text-decoration: none; font-size: 13px;
            background: #161b22; border: 1px solid #21262d;
            border-radius: 8px; padding: 6px 12px; display: inline-block;
            margin-bottom: 24px;
          }
          .log-card {
            background: #0d1117; border: 1px solid #21262d; border-radius: 12px; overflow: hidden;
          }
          .log-header {
            background: #161b22; border-bottom: 1px solid #21262d; padding: 12px 18px;
            display: flex; justify-content: space-between; align-items: center;
          }
          .log-body {
            padding: 16px; max-height: 550px; overflow-y: auto;
            font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; line-height: 1.6;
          }
          .entry { display: block; padding: 1px 0; word-break: break-all; }
          .entry.error { color: #ff7b72; }
          .entry.warn  { color: #e3b341; }
          .entry.ai    { color: #d2a8ff; }
          .entry.chat  { color: #7ee787; }
          .entry.conn  { color: #58a6ff; }
          .console-row {
            display: flex; border-top: 1px solid #21262d; padding: 10px 16px; gap: 8px;
          }
          .console-input {
            flex: 1; background: transparent; border: none; color: #fff; font-family: monospace; font-size: 13px; outline: none;
          }
          .console-btn {
            background: #238636; border: none; color: #fff; font-weight: 600; padding: 6px 14px; border-radius: 6px; cursor: pointer;
          }
        </style>
      </head>
      <body>
        <main>
          <a href="/" class="back-btn">&#8592; Back to Dashboard</a>
          <div class="log-card">
            <div class="log-header">
              <span><b>Live Logs</b> (${logCount} entries)</span>
              <button onclick="location.reload()" style="background:#21262d;border:none;color:#c9d1d9;padding:4px 10px;border-radius:6px;cursor:pointer;">Refresh</button>
            </div>
            <div class="log-body" id="log-body">
              ${logs
                .map((l) => {
                  let cls = "";
                  if (l.includes("[ERROR]")) cls = "error";
                  else if (l.includes("[WARN]")) cls = "warn";
                  else if (l.includes("[AI]")) cls = "ai";
                  else if (l.includes("[CHAT]")) cls = "chat";
                  else if (l.includes("[CONNECTION]")) cls = "conn";
                  return `<span class="entry ${cls}">${escapeHTML(l)}</span>`;
                })
                .join("")}
            </div>
            <div class="console-row">
              <span style="color:#58a6ff;">&gt;</span>
              <input id="cmd-input" class="console-input" placeholder="Enter chat message or command (!jarvis follow me, /say hi)...">
              <button class="console-btn" onclick="sendCommand()">Send</button>
            </div>
          </div>
        </main>
        <script>
          const b = document.getElementById('log-body');
          if (b) b.scrollTop = b.scrollHeight;

          async function sendCommand() {
            const input = document.getElementById('cmd-input');
            const cmd = input.value.trim();
            if (!cmd) return;
            input.value = '';
            await fetch('/command', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ command: cmd })
            });
            setTimeout(() => location.reload(), 600);
          }
          document.getElementById('cmd-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendCommand();
          });
        </script>
      </body>
    </html>
  `);
});

// Control endpoints
app.post("/start", (req, res) => {
  connectionManager.start();
  res.json({ success: true, message: "Jarvis bot started." });
});

app.post("/stop", (req, res) => {
  connectionManager.stop();
  res.json({ success: true, message: "Jarvis bot stopped." });
});

app.post("/command", (req, res) => {
  const cmd = (req.body.command || "").trim();
  if (!cmd) return res.json({ success: false, message: "Empty command" });

  const bot = connectionManager.getBot();
  if (!bot || !connectionManager.isSpawned()) {
    return res.json({
      success: false,
      message: "Bot is not currently spawned on the server.",
    });
  }

  logger.info(`[Dashboard Console] > ${cmd}`);

  if (cmd.startsWith("!jarvis")) {
    handleChatMessage(bot, "ConsoleAdmin", cmd);
    return res.json({ success: true, message: `Dispatched: ${cmd}` });
  }

  try {
    bot.chat(cmd);
    res.json({ success: true, message: `Sent: ${cmd}` });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// ============================================================
// START HTTP SERVER
// ============================================================
const server = app.listen(PORT, "0.0.0.0", () => {
  logger.info(`[Dashboard] HTTP monitoring dashboard listening on port ${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    const fallback = PORT + 1;
    logger.warn(`[Dashboard] Port ${PORT} busy - switching to fallback ${fallback}`);
    server.listen(fallback, "0.0.0.0");
  } else {
    logger.error(`[Dashboard] HTTP server error: ${err.message}`);
  }
});

// ============================================================
// PROTOCOL COMPATIBILITY & STARTUP DIAGNOSTICS
// ============================================================
async function runStartupDiagnostics() {
  logger.info("=".repeat(60));
  logger.info("  MINECRAFT AI JARVIS BOT - VERSION 3.0.0");
  logger.info("=".repeat(60));
  logger.info(`Server Target: ${config.server.host}:${config.server.port}`);
  logger.info(`Configured Version: ${config.server.version}`);
  logger.info(`Gemini AI Model: ${config.gemini.model}`);
  logger.info(`AI Key Configured: ${Boolean(config.gemini.apiKey)}`);
  logger.info(`Authorized Users: ${config.security.authorizedPlayers.join(", ")}`);
  logger.info("=".repeat(60));

  // Ping server to inspect live status
  logger.connection("[Startup Diagnostics] Pinging Minecraft server...");
  const ping = await connectionManager.pingServer();
  if (ping.online) {
    logger.connection(
      `[Startup Diagnostics] Server is ONLINE! Server Version: "${ping.version?.name}" (Protocol ${ping.version?.protocol}), Latency: ${ping.latency}ms, Players: ${ping.players?.online}/${ping.players?.max}`
    );

    // Protocol compatibility check
    if (String(config.server.version).includes("26.3") || ping.version?.protocol === 777) {
      logger.warn(
        `[Protocol Diagnostics] Server is running Minecraft 26.3 (Protocol 777). Note: If native 26.3 schema data is missing in mineflayer/minecraft-data, ensure ViaVersion/ViaBackwards is active on the server, or use a protocol bridge.`
      );
    }
  } else {
    logger.warn(
      `[Startup Diagnostics] Server is currently OFFLINE or UNREACHABLE: ${ping.error}. Jarvis will wait and auto-reconnect when server starts.`
    );
  }

  // Start bot lifecycle
  connectionManager.start();
}

runStartupDiagnostics();

// ============================================================
// GRACEFUL SHUTDOWN & CRASH RECOVERY
// ============================================================
function gracefulShutdown(signal) {
  logger.info(`[System] Received ${signal}. Executing graceful shutdown...`);
  connectionManager.stop();
  server.close(() => {
    logger.info("[System] HTTP dashboard server closed. Process exiting.");
    process.exit(0);
  });

  setTimeout(() => {
    logger.warn("[System] Force exit after timeout.");
    process.exit(1);
  }, 5000);
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

process.on("uncaughtException", (err) => {
  logger.error(`[Process] Uncaught Exception: ${err.message}`, err.stack);
  // Do not crash process, attempt connection recovery
  if (connectionManager.getState() !== "STOPPED") {
    connectionManager.scheduleReconnect("Uncaught exception");
  }
});

process.on("unhandledRejection", (reason) => {
  logger.error(`[Process] Unhandled Rejection: ${reason}`);
});

module.exports = {
  app,
  connectionManager,
};

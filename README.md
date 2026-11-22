# Minecraft AI Jarvis Assistant Bot (v3.0.0)

An intelligent, persistent Minecraft assistant bot modeled after Jarvis, powered by **Google Gemini AI** and **Mineflayer**. Jarvis connects directly to your Minecraft server, understands natural language voice/chat commands from authorized players, executes modular in-game actions (movement, pathfinding, mining, building, inventory management), and maintains a resilient persistent connection with exponential reconnect backoff.

---

## 🚀 Key Features

- **Google Gemini AI Brain**: Integrates the official `@google/genai` SDK with multi-turn conversation memory, request timeouts, and retry policies.
- **Natural Language & Direct Chat Control**: Speak naturally in Minecraft chat (`!jarvis follow me`, `!jarvis mine some stone`, `!jarvis build a small house`, `!jarvis explore`) or use zero-latency direct command shortcuts.
- **Action Engine & Security Sandbox**:
  - Whitelisted action registry (`follow`, `stop`, `come_here`, `look_at`, `explore`, `status`, `inventory`, `mine`, `build`, `drop`, `say`).
  - **Zero eval / Function execution**: Gemini outputs structured JSON strictly parsed and validated against schema constraints.
  - **Player Authorization Whitelist**: Only configured player usernames can command Jarvis.
  - **Command Cooldowns & Rate Limits**: Prevents spam or denial-of-service from in-game chat.
- **Persistent Connection Manager**:
  - Replaces legacy artificial leave-rejoin timers with robust state tracking.
  - Exponential reconnect backoff with random jitter.
  - Detection of server throttle/rate-limit kicks with extended wait times.
  - Clean listener and timer teardown to prevent ghost bot instances and duplicate listeners.
  - Graceful shutdown on `SIGINT` / `SIGTERM`.
- **Live Web Dashboard & Monitoring**:
  - Built-in web dashboard at `http://localhost:5000` for live connection status, coordinates, uptime, and memory usage.
  - Live log streaming with secret scrubbing (API keys and passwords are redacted automatically).
  - Web console to send in-game commands or inspect bot state.

---

## 📁 Architecture Overview

```
24-7-minecraft-bot/
├── .env.example               # Environment template
├── .gitignore                 # Protects secrets & node_modules
├── package.json               # Upgraded scripts, dependencies & metadata
├── settings.json              # Legacy settings fallback
├── index.js                   # Main application entry point & Web Dashboard
├── logger.js                  # Backward-compatible logger re-export
├── leaveRejoin.js             # Deprecated legacy module (neutralized)
├── src/
│   ├── ai/
│   │   ├── gemini.js          # Google Gemini official SDK client & retry logic
│   │   ├── conversation.js    # Per-player conversation context & system prompt
│   │   └── actionParser.js    # JSON extraction, schema validation & safety filters
│   ├── actions/
│   │   ├── actionManager.js   # Central task dispatcher & cancellation coordinator
│   │   ├── movement.js        # Follow player & stop movement
│   │   ├── navigation.js      # Coordinate navigation & exploration
│   │   ├── mining.js          # Target block search, tool equipping, digging & drop pickup
│   │   ├── building.js        # Blueprint generation, inventory check & placement
│   │   ├── inventory.js       # Inventory summaries & best tool selection
│   │   └── playerInteraction.js # Look at player, come here, drop items
│   ├── bot/
│   │   ├── createBot.js       # Mineflayer bot factory & pathfinder setup
│   │   ├── connectionManager.js # State machine, backoff, keepalive & reconnects
│   │   └── eventHandlers.js   # In-game events (chat, health, death, kicked, end)
│   ├── commands/
│   │   ├── authorization.js   # Player whitelist & cooldown limiter
│   │   ├── commandRegistry.js # Whitelist of permitted actions & block targets
│   │   └── commandRouter.js   # Chat parsing, fast-path shortcuts & AI fallback
│   ├── config/
│   │   └── settings.js        # Centralized env config & secret registration
│   └── utils/
│       ├── logger.js          # Structured logger with automatic secret scrubbing
│       └── errorHandler.js    # Safe async wrappers & error formatters
└── tests/
    ├── config.test.js         # Settings & secret sanitization tests
    ├── authorization.test.js  # Whitelist & rate limit tests
    ├── commandRegistry.test.js# Action validation & block whitelist tests
    ├── actionParser.test.js   # JSON fence removal & safety filter tests
    ├── connectionManager.test.js # Exponential backoff & state transition tests
    ├── logger.test.js         # Secret redaction tests
    └── runAllTests.js         # Master test runner
```

---

## ⚙️ Configuration (`.env`)

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit your `.env` settings:

```ini
# Minecraft Server Configuration
MINECRAFT_HOST=Rushibadmosh.aternos.me
MINECRAFT_PORT=26261
MINECRAFT_VERSION=26.3
MINECRAFT_USERNAME=JarvisBot
MINECRAFT_PASSWORD=
MINECRAFT_AUTH_TYPE=offline

# Google Gemini AI Brain
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# Security & Authorization
# Comma-separated list of authorized Minecraft usernames
AUTHORIZED_PLAYERS=ugrushi,SoloPlayz
COMMAND_COOLDOWN_MS=2000

# Connection & Auto-Reconnect
BOT_AUTO_RECONNECT=true
BASE_RECONNECT_DELAY=3000
MAX_RECONNECT_DELAY=60000

# Web Dashboard Port
PORT=5000
```

---

## 🎮 In-Game Chat Commands

Authorized players can command Jarvis using the `!jarvis` prefix (or direct addressing):

| Command | Action Description |
| :--- | :--- |
| `!jarvis follow me` | Jarvis follows the calling player safely using pathfinding |
| `!jarvis stop` | Immediately halts active movement, mining, or building task |
| `!jarvis come here` | Navigates to the calling player's coordinates |
| `!jarvis look at me` | Turns bot head to look directly at the player |
| `!jarvis explore` | Explores a safe random position in the surrounding area |
| `!jarvis status` | Reports bot health, food, in-game position, and server status |
| `!jarvis inventory` | Lists current items and stacks in bot inventory |
| `!jarvis mine stone` | Locates, equips pickaxe, digs stone, and collects drops |
| `!jarvis collect wood` | Locates logs, equips axe, chops wood, and collects drops |
| `!jarvis build a small house` | Checks inventory materials and constructs shelter structure |
| `!jarvis drop` | Drops collected resources to the calling player |
| `!jarvis help` | Displays list of available commands in chat |
| `!jarvis <any question>` | Uses Gemini AI brain to reason, respond, and plan actions |

---

## 🛡️ Security & Reliability Guarantees

1. **No Arbitrary Code Execution**: Gemini outputs strictly validated JSON data. The bot does not use `eval()` or `Function()`.
2. **Action Whitelist**: Every proposed action is validated against `commandRegistry.js`. Unrecognized commands or destructive actions outside permitted boundaries are rejected.
3. **No Credential Leaks**: Passwords and `GEMINI_API_KEY` are scrubbed by `src/utils/logger.js` before appearing in console or dashboard logs.
4. **Persistent Keepalive**: Scheduled leave-and-rejoin behavior has been replaced with persistent TCP keepalives and exponential backoff retry.
5. **Aternos & Server Offline Reality**: A bot can only connect when the server is powered on and reachable. The bot reports server status truthfully and waits for the server to come online.

---

## 🧪 Testing

Run the automated test suite:

```bash
npm test
```

Run syntax checks on all source files:

```bash
npm run check
```

---

## 🌐 Deployment Evaluation (Vercel vs Persistent Host)

> [!WARNING]
> **Vercel is NOT suitable for persistent Minecraft bots.**
> Vercel is designed for serverless HTTP request-response workloads with short execution timeouts (10s to 60s max) and ephemeral stateless instances. A Minecraft bot requires a continuous, stateful TCP socket connection that runs 24/7. Attempting to host a Mineflayer bot on Vercel serverless functions will cause immediate disconnections as soon as the function times out.
>
> **Recommended Hosting Environments for 24/7 Bot Operation:**
> 1. **VPS (Virtual Private Server)**: DigitalOcean Droplet, Hetzner, Linode, AWS EC2, or Oracle Cloud Free Tier running Node.js with `pm2` or `systemd`.
> 2. **Container Platforms with Persistent Workers**: Railway, Render (Background Worker, not web sleep), Fly.io, or Docker on a dedicated VM.

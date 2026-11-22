#!/usr/bin/env bash
set -euo pipefail

echo "=================================================="
echo "  Deploying Minecraft Jarvis Bot on Oracle Cloud  "
echo "=================================================="

# 1. Update system packages
echo "[1/6] Updating system packages..."
sudo apt-get update -y
sudo apt-get install -y curl git build-essential

# 2. Install Node.js LTS (ARM64 compatible)
echo "[2/6] Verifying Node.js LTS..."
if ! command -v node &> /dev/null || [[ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 20 ]]; then
    echo "Installing Node.js 22 LTS via NodeSource..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
echo "Node version: $(node -v) ($(uname -m))"
echo "npm version: $(npm -v)"

# 3. Install project dependencies
echo "[3/6] Installing dependencies with npm ci..."
npm ci --omit=dev

# 4. Check for .env file
echo "[4/6] Checking environment configuration..."
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "IMPORTANT: Please edit .env with your actual GEMINI_API_KEY and settings."
fi
chmod 600 .env

# 5. Setup systemd service
echo "[5/6] Configuring systemd service..."
sudo cp minecraft-jarvis.service /etc/systemd/system/minecraft-jarvis.service
sudo systemctl daemon-reload
sudo systemctl enable minecraft-jarvis.service

# 6. Start service
echo "[6/6] Starting minecraft-jarvis service..."
sudo systemctl restart minecraft-jarvis.service
sleep 2

echo "=================================================="
echo "Deployment Complete!"
echo "Check status: sudo systemctl status minecraft-jarvis"
echo "View live logs: sudo journalctl -u minecraft-jarvis -f"
echo "=================================================="

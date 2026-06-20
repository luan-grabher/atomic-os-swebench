#!/usr/bin/env bash
# install-kloel.sh — One-command Kloel CLI installer
# curl -sL https://raw.githubusercontent.com/danielgonzagat/atomic-os/main/install-kloel.sh | bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║           KLOEL CLI — Atomic Envelope Installer           ║${NC}"
echo -e "${CYAN}║   \"broken states are unrepresentable\"                     ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

KLOEL_HOME="${HOME}/.kloel"
REPO_URL="https://github.com/danielgonzagat/atomic-os.git"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js required. Install from https://nodejs.org${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Node.js >= 18 required. Current: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Check DeepSeek API key
if [ -z "$DEEPSEEK_API_KEY" ]; then
    echo ""
    echo -e "${CYAN}DeepSeek API key not set.${NC}"
    echo "Get yours at: https://platform.deepseek.com/api_keys"
    echo ""
    read -p "Enter your DEEPSEEK_API_KEY: " DEEPSEEK_API_KEY
    if [ -z "$DEEPSEEK_API_KEY" ]; then
        echo -e "${RED}API key required.${NC}"
        exit 1
    fi
fi

# Clone or update atomic-os
if [ -d "$KLOEL_HOME/atomic-os" ]; then
    echo "Updating atomic-os..."
    cd "$KLOEL_HOME/atomic-os"
    git pull origin main 2>/dev/null || true
else
    echo "Cloning atomic-os..."
    mkdir -p "$KLOEL_HOME"
    git clone "$REPO_URL" "$KLOEL_HOME/atomic-os" 2>/dev/null || {
        # If clone fails, try copying from local
        if [ -d "$(pwd)/scripts/mcp/atomic-edit" ]; then
            echo "Using local atomic-edit source..."
            KLOEL_SOURCE="$(pwd)"
        else
            echo -e "${RED}Could not clone atomic-os. Install from a kloel repo directory.${NC}"
            exit 1
        fi
    }
fi

KLOEL_SOURCE="${KLOEL_SOURCE:-$KLOEL_HOME/atomic-os}"

# Build atomic-edit
echo "Building atomic-edit..."
cd "$KLOEL_SOURCE/scripts/mcp/atomic-edit"
npm install --silent 2>/dev/null || true
node build.mjs

# Install kloel command globally
KLOEL_BIN="$KLOEL_SOURCE/scripts/mcp/atomic-edit/kloel-cli.mjs"
chmod +x "$KLOEL_BIN"

# Create symlink
if [ -w "/usr/local/bin" ]; then
    ln -sf "$KLOEL_BIN" /usr/local/bin/kloel
    echo -e "${GREEN}✓ kloel installed to /usr/local/bin/kloel${NC}"
else
    mkdir -p "$HOME/.local/bin"
    ln -sf "$KLOEL_BIN" "$HOME/.local/bin/kloel"
    echo -e "${GREEN}✓ kloel installed to ~/.local/bin/kloel${NC}"
    echo "   Add ~/.local/bin to your PATH:"
    echo "   export PATH=\"\$HOME/.local/bin:\$PATH\""
fi

# Save config
mkdir -p "$KLOEL_HOME"
cat > "$KLOEL_HOME/config.json" << EOF
{
  "apiKey": "$DEEPSEEK_API_KEY",
  "model": "deepseek/deepseek-v4-pro",
  "repoRoot": "$KLOEL_SOURCE",
  "atomicEnabled": true,
  "benchResults": {}
}
EOF

# Setup shell integration for atomic enforcement
SHELL_RC=""
if [ -f "$HOME/.zshrc" ]; then SHELL_RC="$HOME/.zshrc"; fi
if [ -f "$HOME/.bashrc" ]; then SHELL_RC="$HOME/.bashrc"; fi

if [ -n "$SHELL_RC" ] && ! grep -q "kloel" "$SHELL_RC" 2>/dev/null; then
    cat >> "$SHELL_RC" << 'EOF'

# Kloel CLI — Atomic Envelope
export DEEPSEEK_API_KEY="${DEEPSEEK_API_KEY}"
export KLOEL_HOME="${HOME}/.kloel"
alias atsh="node ${KLOEL_SOURCE}/scripts/mcp/atomic-edit/atsh.mjs"
EOF
    echo -e "${GREEN}✓ Shell integration added to ${SHELL_RC}${NC}"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         KLOEL CLI INSTALLED SUCCESSFULLY                 ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  Quick start:"
echo "    kloel \"add a login endpoint\"     # Single task"
echo "    kloel --interactive               # Interactive session"
echo "    kloel bench --suite convergence   # Run benchmark"
echo ""
echo "  Atomic shell:"
echo "    atsh                              # Every command atomic-proof"
echo ""
echo "  Config: ~/.kloel/config.json"
echo "  Traces: ~/.kloel/traces/"
echo ""
echo -e "  ${CYAN}Kloel CLI is the first AI coding agent built on the Atomic Envelope.${NC}"
echo -e "  ${CYAN}Every mutation is byte-proven, traceable, and reversible.${NC}"
echo ""

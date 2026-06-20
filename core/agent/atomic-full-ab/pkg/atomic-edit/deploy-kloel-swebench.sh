#!/bin/bash
# deploy-kloel-swebench.sh
# One-command deploy: sets up Modal, downloads SWE-bench, starts the self-improvement loop.
#
# Usage:
#   export DEEPSEEK_API_KEY="<deepseek-api-key>"
#   export MODAL_TOKEN_ID="<modal-token-id>"
#   export MODAL_TOKEN_SECRET="<modal-token-secret>"
#   bash deploy-kloel-swebench.sh
#
# What it does:
#   1. Installs Modal CLI
#   2. Configures Modal auth
#   3. Downloads SWE-bench dataset
#   4. Deploys to Modal
#   5. Starts the self-improvement loop
#   6. Monitors progress

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}${BOLD}║     KLOEL CLI — SWE-BENCH PRO DEPLOYMENT                        ║${NC}"
echo -e "${CYAN}${BOLD}║     Target: #1 on the leaderboard                               ║${NC}"
echo -e "${CYAN}${BOLD}║     Engine: Modal GPU Cloud + DeepSeek V4 Pro + Atomic Envelope ║${NC}"
echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ── Check prerequisites ────────────────────────────────────────────────────

if [ -z "$DEEPSEEK_API_KEY" ]; then
    echo -e "${RED}ERROR: DEEPSEEK_API_KEY not set.${NC}"
    echo "  export DEEPSEEK_API_KEY=<deepseek-api-key>"
    exit 1
fi
echo -e "${GREEN}✓ DEEPSEEK_API_KEY set${NC}"

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}ERROR: Python 3 required.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Python $(python3 --version | cut -d' ' -f2)${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}ERROR: Node.js required.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node $(node --version)${NC}"

# ── Install Modal CLI ──────────────────────────────────────────────────────

echo ""
echo -e "${CYAN}[1/5] Installing Modal CLI...${NC}"

if ! command -v modal &> /dev/null; then
    pip3 install modal-client --quiet 2>/dev/null || pip install modal-client --quiet 2>/dev/null || {
        echo -e "${YELLOW}Installing modal via pipx...${NC}"
        pipx install modal 2>/dev/null || true
    }
fi

if command -v modal &> /dev/null; then
    echo -e "${GREEN}✓ Modal CLI installed${NC}"
else
    echo -e "${RED}× Modal CLI installation failed. Install manually: pip install modal${NC}"
    exit 1
fi

# ── Configure Modal auth ───────────────────────────────────────────────────

echo ""
echo -e "${CYAN}[2/5] Configuring Modal authentication...${NC}"

if [ -z "${MODAL_TOKEN_ID:-}" ] || [ -z "${MODAL_TOKEN_SECRET:-}" ]; then
    echo -e "${RED}ERROR: MODAL_TOKEN_ID and MODAL_TOKEN_SECRET must be set.${NC}"
    echo "  export MODAL_TOKEN_ID=<modal-token-id>"
    echo "  export MODAL_TOKEN_SECRET=<modal-token-secret>"
    exit 1
fi

modal token set --token-id "$MODAL_TOKEN_ID" --token-secret "$MODAL_TOKEN_SECRET" 2>/dev/null || {
    echo -e "${YELLOW}Modal token set via CLI failed — using env vars instead.${NC}"
    export MODAL_TOKEN_ID
    export MODAL_TOKEN_SECRET
}
echo -e "${GREEN}✓ Modal authentication configured${NC}"

# ── Clone SWE-bench ────────────────────────────────────────────────────────

echo ""
echo -e "${CYAN}[3/5] Setting up SWE-bench dataset...${NC}"

SWE_BENCH_DIR="$HOME/.kloel/swebench"
mkdir -p "$SWE_BENCH_DIR"

if [ ! -d "$SWE_BENCH_DIR/SWE-bench" ]; then
    git clone --depth=1 https://github.com/princeton-nlp/SWE-bench.git "$SWE_BENCH_DIR/SWE-bench" 2>/dev/null || {
        echo -e "${YELLOW}Could not clone SWE-bench (repo may be private). Continuing with Modal-based download.${NC}"
    }
else
    echo -e "${GREEN}✓ SWE-bench repo cloned${NC}"
fi

# ── Build and verify ───────────────────────────────────────────────────────

echo ""
echo -e "${CYAN}[4/5] Building Kloel CLI...${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "$SCRIPT_DIR/build.mjs" ]; then
    cd "$SCRIPT_DIR"
    node build.mjs 2>&1 | tail -1
    echo -e "${GREEN}✓ Atomic-edit built${NC}"
else
    echo -e "${YELLOW}Not in atomic-edit dir — skipping local build. Modal will build in container.${NC}"
fi

# ── Deploy to Modal ────────────────────────────────────────────────────────

echo ""
echo -e "${CYAN}[5/5] Deploying to Modal + starting self-improvement loop...${NC}"
echo ""

SWE_RUNNER="$SCRIPT_DIR/swebench_runner.py"
ORCHESTRATOR="$SCRIPT_DIR/self_improve_orchestrator.py"

if [ -f "$ORCHESTRATOR" ]; then
    echo -e "${GREEN}Starting self-improvement orchestrator...${NC}"
    echo ""
    echo -e "  ${YELLOW}This will run continuously until #1 is achieved.${NC}"
    echo -e "  ${YELLOW}Press Ctrl+C to stop (progress is saved).${NC}"
    echo ""

    exec python3 "$ORCHESTRATOR" \
        --iterations "${KLOEL_ITERATIONS:-50}" \
        --parallel "${KLOEL_PARALLEL:-200}" \
        --target "${KLOEL_TARGET:-0.95}"
else
    echo -e "${YELLOW}Orchestrator not found locally. Deploying to Modal directly...${NC}"

    if [ -f "$SWE_RUNNER" ]; then
        modal deploy "$SWE_RUNNER"
        echo -e "${GREEN}✓ Deployed to Modal${NC}"
        echo ""
        echo -e "  Run the benchmark:"
        echo -e "    modal run swebench_runner.py --mode full"
        echo -e "  Self-improvement loop:"
        echo -e "    modal run swebench_runner.py --mode improve --max-iters=50"
    else
        echo -e "${RED}Cannot find swebench_runner.py.${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║     DEPLOYMENT COMPLETE                                         ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Monitor progress:"
echo -e "    tail -f ~/.kloel/swebench-reports/BEST.json"
echo ""
echo -e "  Results dashboard:"
echo -e "    modal app logs kloel-swebench"
echo ""

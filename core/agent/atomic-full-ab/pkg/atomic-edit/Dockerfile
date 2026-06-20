# Kloel CLI + Atomic Envelope + DeepSeek V4 Pro
# Modal Container Image for SWE-Bench Pro
#
# This image is used by Modal to run hundreds of parallel
# containers, each processing one SWE-bench task instance.

FROM debian:bookworm-slim

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates git build-essential \
    python3 python3-pip python3-venv python3-dev \
    nodejs npm \
    jq vim \
    && rm -rf /var/lib/apt/lists/*

# Node.js 22
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && node --version && npm --version

# Python deps
RUN pip3 install --break-system-packages --no-cache-dir \
    swebench>=3.1.0 \
    datasets>=2.14.0 \
    openai>=1.0.0 \
    requests \
    docker \
    tqdm \
    pytest \
    pytest-timeout

# Kloel CLI + Atomic Envelope
WORKDIR /kloel
COPY scripts/mcp/atomic-edit/ ./atomic-edit/

# Build atomic-edit
WORKDIR /kloel/atomic-edit
RUN npm install --silent 2>/dev/null || true
RUN node build.mjs

# Entry point
WORKDIR /workspace
ENV DEEPSEEK_API_KEY=""
ENV DEEPSEEK_MODEL="deepseek/deepseek-v4-pro"
ENV ATOMIC_EDIT_REPO_ROOT="/workspace"

# The agent script
COPY scripts/mcp/atomic-edit/kloel-cli.mjs /kloel/kloel-cli.mjs
COPY scripts/mcp/atomic-edit/self-improve-loop.mjs /kloel/self-improve-loop.mjs

CMD ["node", "/kloel/kloel-cli.mjs"]

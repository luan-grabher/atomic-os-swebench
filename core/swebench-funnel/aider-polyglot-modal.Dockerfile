FROM buildpack-deps:jammy

ENV DEBIAN_FRONTEND=noninteractive
ENV PATH="/usr/local/go/bin:/root/.cargo/bin:/npm-install/node_modules/.bin:${PATH}"
ENV NODE_PATH="/npm-install/node_modules"
ENV AIDER_DOCKER=1
ENV AIDER_BENCHMARK_DIR=/benchmarks

RUN apt-get update \
  && apt-get install -y software-properties-common cmake libboost-all-dev ca-certificates-java libtbb-dev git curl \
  && add-apt-repository ppa:deadsnakes/ppa -y \
  && apt-get update \
  && apt-get install -y python3.11 python3.11-venv python3.11-dev python3-pip openjdk-17-jdk \
  && rm -rf /var/lib/apt/lists/*

RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1

RUN ARCH=$(uname -m) \
  && if [ "$ARCH" = "x86_64" ]; then GOARCH="amd64"; elif [ "$ARCH" = "aarch64" ]; then GOARCH="arm64"; else false; fi \
  && curl -L "https://golang.org/dl/go1.21.5.linux-${GOARCH}.tar.gz" -o /tmp/go.tar.gz \
  && tar -C /usr/local -xzf /tmp/go.tar.gz \
  && rm /tmp/go.tar.gz

RUN curl https://sh.rustup.rs -sSf -o /tmp/rustup.sh \
  && chmod +x /tmp/rustup.sh \
  && /tmp/rustup.sh -y \
  && rm /tmp/rustup.sh

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get update \
  && apt-get install -y nodejs \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /npm-install \
  && cd /npm-install \
  && npm init -y \
  && npm install jest @babel/core@7.25.2 @exercism/babel-preset-javascript@0.2.1 @exercism/eslint-config-javascript@0.6.0 @types/jest@29.5.12 @types/node@20.12.12 babel-jest@29.6.4 core-js@3.37.1 eslint@8.49.0

RUN git clone --depth 1 https://github.com/Aider-AI/aider.git /aider \
  && mkdir -p /benchmarks \
  && git clone --depth 1 https://github.com/Aider-AI/polyglot-benchmark /benchmarks/polyglot-benchmark \
  && python3 -m pip install --no-cache-dir --upgrade pip uv \
  && python3 -m uv pip install --system --no-cache-dir -e /aider[dev] \
  && git config --global --add safe.directory /aider

WORKDIR /aider

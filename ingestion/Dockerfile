# Multi-stage Dockerfile for Data Ingestion Scrapers
# Supports both Node.js (Playwright) and Python (Scrapy)
# Designed for Cloudflare Containers deployment

# ============================================================================
# Stage 1: Base with system dependencies
# ============================================================================
FROM mcr.microsoft.com/playwright:v1.40.0-jammy as base

# Install Python and common dependencies
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3-pip \
    python3-dev \
    build-essential \
    curl \
    wget \
    git \
    ca-certificates \
    gnupg \
    lsb-release \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js LTS (if not already in playwright image)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm@latest

WORKDIR /app

# ============================================================================
# Stage 2: Node.js dependencies
# ============================================================================
FROM base as node-deps

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install Node.js dependencies
RUN pnpm install --frozen-lockfile

# ============================================================================
# Stage 3: Python dependencies
# ============================================================================
FROM base as python-deps

# Copy Python requirements
COPY requirements.txt ./

# Install Python dependencies
RUN pip3 install --no-cache-dir -r requirements.txt

# ============================================================================
# Stage 4: Final production image
# ============================================================================
FROM base as production

# Copy Node.js dependencies from stage 2
COPY --from=node-deps /app/node_modules ./node_modules

# Copy Python packages from stage 3
COPY --from=python-deps /usr/local/lib/python3.11 /usr/local/lib/python3.11

# Copy application code
COPY . .

# Environment variables
ENV NODE_ENV=production
ENV PYTHONUNBUFFERED=1
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Expose ports
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Default command (can be overridden)
CMD ["node", "dist/server.js"]

# ============================================================================
# Stage 5: Development image
# ============================================================================
FROM production as development

ENV NODE_ENV=development

# Install development tools
RUN apt-get update && apt-get install -y \
    vim \
    htop \
    iputils-ping \
    net-tools \
    && rm -rf /var/lib/apt/lists/*

# Install nodemon for hot reload
RUN pnpm add -g nodemon tsx

CMD ["nodemon", "--watch", "src", "--ext", "ts", "--exec", "tsx", "src/server.ts"]

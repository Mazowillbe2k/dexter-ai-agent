# Use Ubuntu with Node.js 20
FROM ubuntu:22.04

# Update package list and install Node.js, npm, and essential dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    python3 \
    python3-pip \
    # Essential utilities only
    unzip \
    tar \
    gzip \
    # Network tools
    netcat \
    # Process management
    procps \
    # File system tools
    tree \
    # Text processing
    vim \
    # Development tools
    make \
    gcc \
    g++ \
    pkg-config \
    # SSL certificates
    ca-certificates \
    # Install Chromium for puppeteer
    chromium-browser \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && npm cache clean --force

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with puppeteer optimizations
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV NODE_ENV=production
RUN npm install --only=production --no-audit --no-fund

# Copy source code
COPY . .

# Create workspace directory
RUN mkdir -p /workspace

# Create non-root user for security
RUN groupadd -g 1001 nodejs
RUN useradd -r -u 1001 -g nodejs nodejs

# Add nodejs user to docker group (if docker group exists)
RUN groupadd -g 999 docker || true
RUN usermod -a -G docker nodejs

# Change ownership of the app and workspace directories
RUN chown -R nodejs:nodejs /app /workspace
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["npm", "start"] 
# Installation & Setup Guide v2.0.0

## Overview

This guide provides comprehensive instructions for installing and setting up Qwen Swarm v2.0.0, including system requirements, installation methods, configuration, and verification steps.

## 📋 System Requirements

### Minimum Requirements
- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher
- **Memory**: 4GB RAM
- **Storage**: 10GB available disk space
- **Network**: Stable internet connection

### Recommended Requirements
- **Node.js**: 20.0.0 or higher
- **npm**: 10.0.0 or higher
- **Memory**: 8GB RAM
- **Storage**: 20GB available disk space (SSD recommended)
- **Network**: High-speed internet connection
- **OS**: Linux (Ubuntu 20.04+), macOS (12+), Windows 10+

### Production Requirements
- **Node.js**: 20.0.0 LTS
- **Memory**: 16GB+ RAM
- **Storage**: 50GB+ SSD
- **Network**: Load-balanced infrastructure
- **Database**: PostgreSQL 14+ or MySQL 8.0+
- **Cache**: Redis 6.0+

## 🚀 Installation Methods

### Method 1: NPM Installation (Recommended)

#### Global Installation
```bash
# Install globally
npm install -g qwen-swarm@2.0.0

# Verify installation
qwen-swarm --version
```

#### Project Installation
```bash
# Create new project
mkdir my-swarm-project
cd my-swarm-project

# Initialize project
npm init -y

# Install Qwen Swarm
npm install qwen-swarm@2.0.0

# Install development dependencies
npm install --save-dev @types/node typescript tsx
```

### Method 2: Git Installation

#### Clone Repository
```bash
# Clone the repository
git clone https://github.com/qwen-swarm/qwen-swarm.git
cd qwen-swarm

# Checkout v2.0.0 tag
git checkout v2.0.0

# Install dependencies
npm install

# Build the project
npm run build

# Install CLI globally
npm run build:cli
npm link
```

### Method 3: Docker Installation

#### Using Docker Hub
```bash
# Pull the latest image
docker pull qwen-swarm/qwen-swarm:2.0.0

# Run the container
docker run -d \
  --name qwen-swarm \
  -p 3000:3000 \
  -p 3001:3001 \
  -e QWEN_API_KEY=your_api_key \
  qwen-swarm/qwen-swarm:2.0.0
```

#### Using Docker Compose
```bash
# Clone repository
git clone https://github.com/qwen-swarm/qwen-swarm.git
cd qwen-swarm

# Start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f
```

### Method 4: Binary Installation

#### Download Binary
```bash
# Download for your platform
# Linux
wget https://releases.qwen-swarm.com/v2.0.0/qwen-swarm-linux-x64

# macOS
wget https://releases.qwen-swarm.com/v2.0.0/qwen-swarm-darwin-x64

# Windows
wget https://releases.qwen-swarm.com/v2.0.0/qwen-swarm-win-x64.exe

# Make executable (Linux/macOS)
chmod +x qwen-swarm-*

# Move to PATH
sudo mv qwen-swarm-* /usr/local/bin/qwen-swarm
```

## ⚙️ Configuration Setup

### Step 1: Environment Configuration

#### Create Environment File
```bash
# Copy environment template
cp .env.example .env

# Edit the configuration
nano .env
```

#### Basic Environment Configuration
```env
# System Configuration
NODE_ENV=development
API_PORT=3000
WS_PORT=3001
LOG_LEVEL=info

# Provider API Keys
QWEN_API_KEY=your_qwen_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
CLAUDE_API_KEY=your_claude_api_key_here

# Security
JWT_SECRET=your_super_secret_jwt_key_here
ENCRYPTION_KEY=your_encryption_key_here

# Database (Production)
DATABASE_URL=postgresql://user:password@localhost:5432/qwen_swarm

# Cache (Production)
REDIS_URL=redis://localhost:6379

# Enhanced Features
QWEN_TERMINAL_THEME=dark
QWEN_OPTIMIZATION_ENABLED=true
QWEN_ANALYTICS_ENABLED=true
```

#### Advanced Environment Configuration
```env
# Performance Settings
QWEN_MAX_AGENTS=50
QWEN_AUTO_SCALING=true
QWEN_CACHE_TTL=3600

# Security Settings
QWEN_SECURITY_AUDIT_ENABLED=true
QWEN_RATE_LIMITING_ENABLED=true
QWEN_CORS_ENABLED=true

# Analytics Settings
QWEN_ANALYTICS_EXPORT_INTERVAL=3600
QWEN_ANALYTICS_RETENTION_DAYS=90

# Terminal Settings
QWEN_TERMINAL_COLORS=true
QWEN_TERMINAL_UNICODE=true
QWEN_TERMINAL_AUTO_REFRESH=true
```

### Step 2: Configuration File Setup

#### Create Configuration Directory
```bash
mkdir -p config
```

#### Basic Configuration (config/config.json)
```json
{
  "system": {
    "name": "Qwen Swarm",
    "version": "2.0.0",
    "environment": "development",
    "logLevel": "info",
    "timezone": "UTC"
  },
  "api": {
    "port": 3000,
    "host": "0.0.0.0",
    "cors": {
      "enabled": true,
      "origins": ["http://localhost:3000", "http://localhost:5173"]
    }
  },
  "websocket": {
    "port": 3001,
    "host": "0.0.0.0"
  },
  "agents": {
    "maxInstances": 50,
    "autoScaling": {
      "enabled": true,
      "metrics": ["cpu", "memory", "queue_length"],
      "thresholds": {
        "scaleUp": 0.8,
        "scaleDown": 0.3
      }
    }
  },
  "providers": {
    "routing": {
      "strategy": "intelligent",
      "fallbackEnabled": true
    }
  }
}
```

#### Provider Configuration (config/providers.json)
```json
{
  "providers": {
    "qwen": {
      "type": "qwen",
      "apiKey": "${QWEN_API_KEY}",
      "endpoint": "https://dashscope.aliyuncs.com/api/v1",
      "models": {
        "qwen-turbo": {
          "maxTokens": 4000,
          "temperature": 0.7,
          "costPerToken": 0.0001
        },
        "qwen-max": {
          "maxTokens": 8000,
          "temperature": 0.5,
          "costPerToken": 0.0002
        }
      },
      "priority": 1,
      "enabled": true
    },
    "openai": {
      "type": "openai",
      "apiKey": "${OPENAI_API_KEY}",
      "endpoint": "https://api.openai.com/v1",
      "models": {
        "gpt-3.5-turbo": {
          "maxTokens": 4000,
          "temperature": 0.7,
          "costPerToken": 0.0005
        },
        "gpt-4": {
          "maxTokens": 8000,
          "temperature": 0.5,
          "costPerToken": 0.01
        }
      },
      "priority": 2,
      "enabled": true
    }
  }
}
```

### Step 3: Database Setup

#### SQLite (Development)
```bash
# SQLite is configured by default
# Database will be created automatically at ./data/qwen-swarm.db
mkdir -p data
```

#### PostgreSQL (Production)
```bash
# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE qwen_swarm;
CREATE USER qwen_swarm_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE qwen_swarm TO qwen_swarm_user;
\q

# Update environment variable
export DATABASE_URL="postgresql://qwen_swarm_user:your_password@localhost:5432/qwen_swarm"
```

#### MySQL (Production)
```bash
# Install MySQL
sudo apt-get install mysql-server

# Create database and user
sudo mysql -u root -p
CREATE DATABASE qwen_swarm;
CREATE USER 'qwen_swarm_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON qwen_swarm.* TO 'qwen_swarm_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Update environment variable
export DATABASE_URL="mysql://qwen_swarm_user:your_password@localhost:3306/qwen_swarm"
```

## 🚦 Running the System

### Development Mode

#### Basic Development
```bash
# Start development server
npm run dev

# Or use enhanced CLI
npm run cli:enhanced dev

# Start with dashboard
npm run cli:enhanced launch --dashboard
```

#### Enhanced Development Experience
```bash
# Start with hot-reload and monitoring
npm run cli:enhanced launch \
  --mode development \
  --dashboard \
  --monitoring \
  --theme dark

# Interactive terminal mode
npm run cli:enhanced interactive

# Debug mode
DEBUG=qwen-swarm:* npm run cli:enhanced dev --verbose
```

### Production Mode

#### Basic Production
```bash
# Build the project
npm run build

# Start production server
npm start

# Or use CLI
npm run cli:enhanced start --mode production
```

#### Production with Process Manager
```bash
# Using PM2
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# View logs
pm2 logs qwen-swarm
```

#### PM2 Configuration (ecosystem.config.js)
```javascript
module.exports = {
  apps: [{
    name: 'qwen-swarm',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      API_PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max_old_space_size=1024'
  }]
};
```

### Docker Production

#### Dockerfile
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["node", "dist/index.js"]
```

#### Docker Compose Production
```yaml
version: '3.8'

services:
  qwen-swarm:
    build: .
    ports:
      - "3000:3000"
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/qwen_swarm
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs
      - ./data:/app/data

  db:
    image: postgres:14-alpine
    environment:
      - POSTGRES_DB=qwen_swarm
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:6-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - qwen-swarm
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

## 🔄 Initialization

### System Initialization

#### Initialize System
```bash
# Run system initialization
npm run system:init

# Initialize database
npm run db:init

# Initialize agent registry
npm run agents:init

# Create default admin user
npm run auth:create-admin --email admin@example.com --password secure_password
```

#### Specialty Agent Initialization
```bash
# Initialize agent registry with default sources
npm run agents:init

# Download and catalog specialty agents
npm run agents:registry:update

# Verify installation
npm run agents:list

# Show registry statistics
npm run agents:stats
```

### Configuration Validation

#### Validate Configuration
```bash
# Validate all configuration
npm run config:validate

# Validate specific files
qwen-swarm-enhanced config validate --file providers.json
qwen-swarm-enhanced config validate --file config.json

# Check system health
npm run health:check

# Full system diagnostics
npm run diagnostics:full
```

## ✅ Verification

### Basic Verification

#### Check Installation
```bash
# Check version
qwen-swarm --version

# Check CLI functionality
qwen-swarm-enhanced --help

# Test API connectivity
curl http://localhost:3000/api/v2/system/status

# Test WebSocket connection
curl -i -N -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Key: test" \
     -H "Sec-WebSocket-Version: 13" \
     http://localhost:3001/ws
```

#### Test Core Features
```bash
# Test agent creation
qwen-swarm-enhanced agents create \
  --name "Test Agent" \
  --type "worker" \
  --provider "qwen"

# Test agent execution
qwen-swarm-enhanced agents execute test-agent \
  --task "test" \
  --input '{"message": "hello"}'

# Test specialty agent
npm run agents:execute code-reviewer \
  --code "console.log('hello')" \
  --language "javascript"
```

### Performance Verification

#### Benchmark System
```bash
# Run performance benchmarks
npm run perf:benchmark

# Test API performance
npm run test:performance:api

# Test agent performance
npm run test:performance:agents

# Load testing
npm run test:load --concurrency 10 --duration 60
```

### Integration Testing

#### API Tests
```bash
# Run API integration tests
npm run test:integration:api

# Test authentication
npm run test:integration:auth

# Test provider connectivity
npm run test:integration:providers

# Test agent lifecycle
npm run test:integration:agents
```

## 🔧 Advanced Setup

### Kubernetes Deployment

#### Kubernetes Manifest
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: qwen-swarm
spec:
  replicas: 3
  selector:
    matchLabels:
      app: qwen-swarm
  template:
    metadata:
      labels:
        app: qwen-swarm
    spec:
      containers:
      - name: qwen-swarm
        image: qwen-swarm/qwen-swarm:2.0.0
        ports:
        - containerPort: 3000
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: qwen-swarm-secrets
              key: database-url
        - name: QWEN_API_KEY
          valueFrom:
            secretKeyRef:
              name: qwen-swarm-secrets
              key: qwen-api-key
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: qwen-swarm-service
spec:
  selector:
    app: qwen-swarm
  ports:
  - name: api
    port: 3000
    targetPort: 3000
  - name: websocket
    port: 3001
    targetPort: 3001
  type: LoadBalancer
```

### Load Balancer Setup

#### NGINX Configuration
```nginx
upstream qwen_swarm_api {
    server 127.0.0.1:3000;
    keepalive 32;
}

upstream qwen_swarm_ws {
    server 127.0.0.1:3001;
    keepalive 32;
}

server {
    listen 80;
    server_name your-domain.com;

    # API endpoints
    location /api/ {
        proxy_pass http://qwen_swarm_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket endpoints
    location /ws {
        proxy_pass http://qwen_swarm_ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files
    location /static/ {
        alias /var/www/qwen-swarm/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 🔒 Security Setup

### SSL/TLS Configuration

#### Let's Encrypt Setup
```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Firewall Configuration

#### UFW Setup
```bash
# Enable UFW
sudo ufw enable

# Allow necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3000/tcp  # API (if needed)
sudo ufw allow 3001/tcp  # WebSocket (if needed)

# Check status
sudo ufw status
```

## 📊 Monitoring Setup

### System Monitoring

#### Prometheus Configuration
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'qwen-swarm'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 5s
```

#### Grafana Dashboard
```bash
# Import Qwen Swarm dashboard
curl -X POST \
  http://admin:admin@localhost:3000/api/dashboards/db \
  -H 'Content-Type: application/json' \
  -d @grafana-dashboard.json
```

### Log Management

#### Log Rotation Configuration
```bash
# Create logrotate config
sudo nano /etc/logrotate.d/qwen-swarm

# Content:
/var/log/qwen-swarm/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 qwen-swarm qwen-swarm
    postrotate
        systemctl reload qwen-swarm
    endscript
}
```

## 🚨 Troubleshooting

### Common Installation Issues

#### Permission Errors
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules

# Use nvm for Node.js management
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

#### Port Conflicts
```bash
# Check port usage
sudo netstat -tlnp | grep :3000
sudo lsof -i :3000

# Kill processes on port
sudo fuser -k 3000/tcp
sudo fuser -k 3001/tcp

# Change ports in configuration
export API_PORT=3002
export WS_PORT=3003
```

#### Database Connection Issues
```bash
# Test database connection
npm run db:test-connection

# Check database status
sudo systemctl status postgresql

# Reset database
npm run db:reset
```

### Performance Issues

#### High Memory Usage
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head

# Optimize Node.js memory
export NODE_OPTIONS="--max_old_space_size=4096"

# Enable swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### Slow Response Times
```bash
# Check system load
top
htop

# Profile Node.js application
npm run profile:cpu
npm run profile:memory

# Optimize configuration
qwen-swarm-enhanced optimize enable --type performance
```

## 📚 Next Steps

### After Installation

1. **Read the Documentation**
   - [Enhanced Terminal Guide](./ENHANCED_TERMINAL_GUIDE.md)
   - [API Documentation](./docs/API_DOCUMENTATION_v2.md)
   - [Specialty Agent System](./docs/SPECIALTY_AGENT_SYSTEM.md)

2. **Explore Features**
   - Initialize specialty agents: `npm run agents:init`
   - Try enhanced terminal: `qwen-swarm-enhanced launch --dashboard`
   - Enable optimization: `qwen-swarm-enhanced optimize enable`

3. **Configure Production**
   - Set up SSL/TLS
   - Configure monitoring
   - Set up backup systems

4. **Join the Community**
   - GitHub Discussions
   - Documentation
   - Support channels

---

**Installation Complete! 🎉**

Your Qwen Swarm v2.0.0 system is now ready to use. Start exploring the enhanced features and capabilities of the next-generation swarm intelligence platform.

*For additional help, see our [troubleshooting guide](./docs/TROUBLESHOOTING_v2.md) or contact support.*
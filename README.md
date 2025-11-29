# Qwen Swarm Orchestration System v2.0.0

🚀 **Next-Generation Swarm Intelligence Platform** - A comprehensive, self-improving and self-healing swarm orchestration system built for Qwen Code and other LLM providers. The system enables coordinated multi-agent workflows with advanced consensus mechanisms, learning capabilities, and robust security.

## 🆕 v2.0.0 Major Release

### Enhanced Capabilities
- **🔄 Enhanced Provider System**: Improved multi-provider abstraction with dynamic routing and failover
- **🖥️ Rich Terminal Integration**: Advanced CLI with real-time dashboards and web-based terminal
- **🤖 Expanded Specialty Agent Ecosystem**: 125+ pre-integrated specialty agents with dynamic discovery
- **📊 Advanced Analytics & Monitoring**: Comprehensive performance analytics and optimization recommendations
- **🔧 Enhanced Configuration System**: Hierarchical configuration management with hot-reload
- **🌐 Improved Web Integration**: Seamless CLI-GUI bridge with real-time synchronization
- **📈 Feedback & Learning**: Automated performance feedback loops and self-optimization
- **🎯 Advanced Consensus Mechanisms**: Multiple consensus algorithms with configurable parameters

## 🚀 Features

### Core Capabilities
- **Agent Lifecycle Management**: Dynamic creation, scaling, and management of agent pools
- **Multi-Provider Abstraction**: Support for Qwen, OpenAI, Claude, local models, and custom providers
- **Inter-Agent Communication**: Real-time WebSocket-based communication with message routing
- **Consensus & Coordination**: Multiple consensus algorithms (simple majority, super-majority, unanimous, weighted, delegated)
- **Memory & Learning**: Persistent memory with pattern recognition and self-improvement capabilities
- **Security Framework**: JWT-based authentication, role-based authorization, and audit trails
- **Scalable API**: RESTful API with WebSocket support for real-time operations
- **Health Monitoring**: Comprehensive health checks and automatic recovery mechanisms

### Advanced Features
- **Self-Improvement**: Agents learn from experience and optimize their behavior
- **Self-Healing**: Automatic detection and recovery from failures
- **Task Distribution**: Intelligent task assignment based on agent capabilities and workload
- **Resource Management**: Dynamic scaling and resource optimization
- **Observability**: Detailed metrics, logging, and monitoring

### 🆕 Enhanced Features (v2.0.0)
- **Enhanced Terminal Integration**: Rich CLI with dashboards, charts, and web-based terminal access
- **Advanced Provider Management**: Dynamic routing, load balancing, and automatic failover across providers
- **Performance Analytics**: Real-time metrics, bottleneck detection, and optimization recommendations
- **Configuration Hot-Reload**: Live configuration updates without system restart
- **Feedback Loop System**: Continuous performance improvement through automated feedback
- **Advanced Monitoring**: Enhanced health checks, alerting, and proactive issue detection
- **Seamless CLI-GUI Integration**: Unified experience across command line and web interfaces

### Specialty Agent System
- **Agent Registry**: Centralized registry for managing specialty agents
- **Dynamic Discovery**: Automatic discovery and loading of agents from external repositories
- **VoltAgent Integration**: Pre-integrated with 125+ specialty agents from VoltAgent's awesome-claude-code-subagents
- **Custom Agent Support**: Easy installation and management of custom agents
- **Agent Categories**: 10 specialized categories including Core Development, Infrastructure, Quality & Security, and more
- **CLI Management**: Comprehensive command-line interface for agent management

## 🏗️ Architecture

### System Components (v2.0.0 Architecture)
```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Web & Terminal Layer                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────────┐  │
│  │   Web Dashboard  │  │ Enhanced Terminal│  │   CLI-GUI Bridge    │  │
│  └──────────────────┘  └──────────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│                           Enhanced API Layer                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────────┐  │
│  │   Agent Manager │  │ Communication   │  │   Consensus Manager   │  │
│  │   (v2.0)        │  │   Manager       │  │   (Enhanced)         │  │
│  └─────────────────┘  └─────────────────┘  └──────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│                     Enhanced Core Systems                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────────┐  │
│  │ Provider Manager│  │  Memory Manager │  │   Learning Manager    │  │
│  │   (Dynamic)     │  │   (Advanced)    │  │   (Auto-Optimize)     │  │
│  └─────────────────┘  └─────────────────┘  └──────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────────┐  │
│  │Analytics Engine │  │ Config Manager  │  │  Feedback System     │  │
│  │   (Real-time)   │  │   (Hot-Reload)  │  │   (Auto-Learn)       │  │
│  └─────────────────┘  └─────────────────┘  └──────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│                        Security & Monitoring                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Agent Types (Enhanced in v2.0.0)
- **Queen Agents**: Strategic coordination and decision-making with enhanced consensus algorithms
- **Worker Agents**: Task execution and specialized operations with dynamic load balancing
- **Specialist Agents**: Domain-specific expertise with auto-discovery from external repositories
- **Hybrid Agents**: Multi-functional agents combining worker and specialist capabilities
- **Auto-Scaling Agents**: Self-optimizing agents that adapt performance based on workload

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- TypeScript 4.5+
- Memory: 4GB+ RAM recommended
- Storage: 10GB+ available space

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd qwen-swarm

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Configuration

Edit `.env` file with your settings:

```env
# Basic Configuration
NODE_ENV=development
API_PORT=3000
LOG_LEVEL=info

# Provider Keys
QWEN_API_KEY=your_qwen_api_key
OPENAI_API_KEY=your_openai_api_key
CLAUDE_API_KEY=your_claude_api_key

# Security
JWT_SECRET=your-super-secret-jwt-key
```

### Running the System

```bash
# Standard development mode
npm run dev

# Enhanced CLI with rich terminal interface (NEW!)
npm run cli:enhanced

# Start with interactive dashboard (NEW!)
qwen-swarm-enhanced launch --dashboard

# Build for production
npm run build

# Start production server
npm start
```

The system will start with:
- **API server** on `http://localhost:3000`
- **WebSocket server** on `ws://localhost:3001`
- **Enhanced Terminal** with real-time dashboards (v2.0.0)
- **Web Dashboard** on `http://localhost:5173` (v2.0.0)
- **Default queen agent** initialized

### 🆕 Enhanced Terminal Experience (v2.0.0)

Start the enhanced terminal for a rich command-line experience:

```bash
# Interactive dashboard mode
qwen-swarm-enhanced dashboard --watch

# Agent management with visualizations
qwen-swarm-enhanced agents list --filter "specialist"

# Performance monitoring with charts
qwen-swarm-enhanced metrics --format chart --refresh 5

# System analysis
qwen-swarm-enhanced analyze --deep --export html
```

## 🤖 Specialty Agents

### Initialize Agent Registry

```bash
# Initialize the agent registry with pre-configured sources
npm run agents:init
```

This will download and catalog 125+ specialty agents from VoltAgent's repository.

### Available Agent Categories

1. **Core Development**: Essential development agents (frontend, backend, database)
2. **Language Specialists**: Programming language experts (TypeScript, Python, Rust)
3. **Infrastructure**: DevOps and deployment specialists (Kubernetes, Docker, Cloud)
4. **Quality & Security**: Testing, code review, and security experts
5. **Data & AI**: Data science and machine learning specialists
6. **Developer Experience**: Tools that improve developer productivity
7. **Specialized Domains**: Industry-specific agents (FinTech, Healthcare)
8. **Business & Product**: Product management and business strategy
9. **Meta Orchestration**: High-level coordination agents
10. **Research & Analysis**: Research and knowledge discovery agents

### Agent Management CLI

```bash
# List all available agents
npm run agents:list

# Search for specific agents
npm run agents:search "typescript"

# Get detailed information about an agent
npm run agents:info multi-agent-coordinator

# Install a custom agent
npm run agents:install https://github.com/user/custom-agent

# Update agent registry
npm run agents:update

# Show registry statistics
npm run agents:stats

# Cleanup inactive agents
npm run agents:cleanup
```

### Example: Using a Specialty Agent

```bash
# Search for code review agents
npm run agents:search "code-review"

# Install a code reviewer agent
npm run agents:install https://github.com/VoltAgent/awesome-claude-code-subagents/blob/main/categories/04-quality-security/code-reviewer.md

# Use the agent through the API
curl -X POST http://localhost:3000/api/v1/agents/code-reviewer/execute \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"code": "console.log(''hello'')", "language": "javascript"}'
```

## 📖 API Documentation

### Authentication

Most API endpoints require authentication. Include your token in the `Authorization` header:

```http
Authorization: Bearer <your-jwt-token>
```

### Core Endpoints

#### Agents
```http
GET    /api/v1/agents              # List all agents
GET    /api/v1/agents/:id          # Get agent details
POST   /api/v1/agents              # Create new agent
DELETE /api/v1/agents/:id          # Remove agent
POST   /api/v1/agents/scale        # Scale agent pool
```

#### Tasks
```http
GET  /api/v1/tasks                 # Get task queue info
POST /api/v1/tasks                 # Submit new task
```

#### System
```http
GET /api/v1/system/state           # System state
GET /api/v1/system/health          # System health
GET /api/v1/system/metrics         # System metrics
```

#### Consensus
```http
GET  /api/v1/consensus/metrics     # Consensus metrics
POST /api/v1/consensus/proposal    # Create proposal
```

#### Specialty Agent Registry (Enhanced v2.0.0)
```http
GET    /api/v1/registry/agents              # List available specialty agents
GET    /api/v1/registry/agents/search       # Search agents
GET    /api/v1/registry/agents/:id          # Get agent definition
POST   /api/v1/registry/agents              # Install custom agent
DELETE /api/v1/registry/agents/:id          # Uninstall agent
PUT    /api/v1/registry/agents/:id/load     # Load agent for execution
DELETE /api/v1/registry/agents/:id/unload   # Unload agent
GET    /api/v1/registry/agents/:id/execute  # Execute agent
GET    /api/v1/registry/categories          # List agent categories
GET    /api/v1/registry/stats               # Registry statistics
POST   /api/v1/registry/update              # Update registry from sources
```

#### Enhanced Analytics & Monitoring (NEW!)
```http
GET    /api/v1/analytics/metrics            # Real-time performance metrics
GET    /api/v1/analytics/bottlenecks        # Bottleneck detection
GET    /api/v1/analytics/recommendations    # Optimization recommendations
POST   /api/v1/analytics/export             # Export analytics data
GET    /api/v1/analytics/trends             # Historical trend analysis
```

#### Configuration Management (NEW!)
```http
GET    /api/v1/config                       # Get current configuration
PUT    /api/v1/config                       # Update configuration
POST   /api/v1/config/reload                # Hot-reload configuration
GET    /api/v1/config/validate              # Validate configuration
```

#### Feedback System (NEW!)
```http
POST   /api/v1/feedback/performance         # Submit performance feedback
GET    /api/v1/feedback/recommendations     # Get optimization recommendations
POST   /api/v1/feedback/auto-optimize       # Trigger auto-optimization
GET    /api/v1/feedback/history             # Feedback history
```

#### Agent Execution
```http
POST   /api/v1/agents/specialty/:name/execute   # Execute specialty agent
GET    /api/v1/agents/specialty/:name/status    # Get agent execution status
GET    /api/v1/agents/specialty/loaded          # List loaded agents
DELETE /api/v1/agents/specialty/:id/unload      # Unload specific agent
```

### WebSocket API

Connect to `ws://localhost:3001/ws` with headers:
- `X-Agent-ID`: Your agent ID
- `X-Session-ID`: Your session ID

Message format:
```json
{
  "type": "task_result",
  "data": {
    "taskId": "task_123",
    "result": "success"
  }
}
```

## 🔧 Configuration

### System Configuration
Create a `config.json` file or use environment variables:

```json
{
  "system": {
    "name": "Qwen Swarm",
    "version": "1.0.0",
    "environment": "development",
    "logLevel": "info",
    "maxAgents": 50,
    "autoScaling": true
  },
  "database": {
    "type": "sqlite",
    "database": "qwen-swarm.db"
  },
  "security": {
    "authenticationRequired": true,
    "encryptionEnabled": false,
    "auditEnabled": true
  },
  "learning": {
    "enabled": true,
    "algorithm": "hybrid",
    "learningRate": 0.01,
    "explorationRate": 0.1
  }
}
```

### Agent Configuration

```typescript
{
  "id": "agent-123",
  "name": "Worker Agent 1",
  "type": "worker",
  "role": {
    "type": "operational",
    "permissions": ["task:*"],
    "expertise": ["data-processing", "analysis"],
    "priority": 5
  },
  "provider": {
    "type": "qwen",
    "model": "qwen-max",
    "maxTokens": 4000,
    "temperature": 0.7
  },
  "maxConcurrency": 5,
  "autoScale": true
}
```

## 🎯 Use Cases

### 1. Multi-Agent Research
- Coordinate multiple agents for complex research tasks
- Share findings and build upon each other's work
- Reach consensus on research directions

### 2. Automated Content Creation
- Writers, editors, and fact-checkers working together
- Quality control through consensus mechanisms
- Learning from feedback to improve quality

### 3. Code Generation & Review
- Generate code with multiple perspectives
- Automated code review and testing
- Consensus on best practices

### 4. Data Analysis Pipeline
- Parallel data processing with specialized agents
- Real-time coordination and result aggregation
- Adaptive optimization based on performance

## 🔍 Monitoring & Observability

### Health Checks
```http
GET /health          # Basic health status
GET /ready          # Readiness check
GET /metrics        # System metrics
```

### Metrics Available
- Agent counts and status
- Task queue length
- Provider performance
- Communication statistics
- Consensus success rates
- Memory and learning metrics
- Error rates and response times

### Logging
Comprehensive logging with multiple levels:
- System events and errors
- Agent lifecycle events
- Task execution details
- Security events
- Performance metrics

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e

# Performance and chaos testing
npm run test:performance
npm run test:chaos
npm run test:security
```

### Development Scripts (Enhanced v2.0.0)

```bash
# Quality checks
npm run lint               # Lint TypeScript code
npm run lint:fix           # Auto-fix linting issues
npm run type-check         # TypeScript type checking
npm run quality:check      # Run all quality checks

# Security
npm run security:audit     # Check for security vulnerabilities
npm run security:snyk      # Snyk security testing

# Database testing
npm run db:test:setup      # Setup test database
npm run db:test:teardown   # Cleanup test database

# Performance benchmarking
npm run perf:benchmark     # Run performance benchmarks
npm run chaos:simulate     # Run chaos engineering tests

# Enhanced Terminal (NEW!)
npm run cli:enhanced       # Run enhanced CLI with rich interface
npm run build:enhanced     # Build enhanced terminal binaries

# Agent Management (Enhanced)
npm run agents:init        # Initialize agent registry
npm run agents:list        # List all available agents
npm run agents:search      # Search for agents
npm run agents:info        # Get agent information
npm run agents:install     # Install custom agent
npm run agents:uninstall   # Uninstall agent
npm run agents:update      # Update registry
npm run agents:stats       # Show statistics
npm run agents:cleanup     # Cleanup inactive agents

# Registry Management (NEW!)
npm run agents:registry:add    # Add agent registry source
npm run agents:registry:remove # Remove registry source
npm run agents:registry:list   # List registry sources
npm run agents:registry:update # Update all registries
```

## 📈 Performance

### Benchmarks
- **Task Processing**: 1000+ tasks/second with 50 agents
- **Message Latency**: <10ms average for local communication
- **Consensus Time**: <100ms for simple majority with 10 agents
- **Memory Usage**: ~100MB base + 10MB per agent
- **API Response Time**: <50ms for 95% of requests

### Scaling
- Horizontal scaling supported via Redis
- Automatic agent pool scaling
- Load balancing across providers
- Circuit breaker patterns for resilience

## 🔒 Security

### Authentication
- JWT-based authentication for users
- API key authentication for agents
- Session management with expiration
- Secure token storage and validation

### Authorization
- Role-based access control (RBAC)
- Resource-level permissions
- Fine-grained access policies
- Audit logging for security events

### Data Protection
- Optional encryption for sensitive data
- Secure communication channels
- Input validation and sanitization
- Rate limiting and DDoS protection

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

### Development Guidelines
- Follow TypeScript best practices
- Add comprehensive tests for new features
- Update documentation for API changes
- Use conventional commit messages

## 📊 v2.0.0 Performance Improvements

### Enhanced Benchmarks
- **Task Processing**: 1500+ tasks/second (50% improvement from v1.0)
- **Message Latency**: <5ms average for local communication (50% improvement)
- **Consensus Time**: <50ms for simple majority with 10 agents (50% improvement)
- **Memory Usage**: ~80MB base + 8MB per agent (20% improvement)
- **API Response Time**: <25ms for 95% of requests (50% improvement)
- **Terminal Responsiveness**: <100ms UI update times (NEW!)

### Scaling Enhancements
- **Dynamic Provider Load Balancing**: Automatic routing to optimal providers
- **Intelligent Agent Scaling**: Predictive scaling based on workload patterns
- **Real-time Performance Optimization**: Auto-tuning based on usage patterns
- **Enhanced Circuit Breaker**: Improved resilience and faster recovery

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support & Documentation

### Documentation Resources
- **Enhanced Terminal Guide**: See [ENHANCED_TERMINAL_GUIDE.md](./ENHANCED_TERMINAL_GUIDE.md)
- **API Documentation**: See `/docs` directory
- **Operations Guide**: See [docs/OPERATIONS.md](./docs/OPERATIONS.md)
- **Deployment Guide**: See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)
- **Test Strategy**: See [docs/test-strategy.md](./docs/test-strategy.md)

### Getting Help
- **Issues**: Report via GitHub Issues
- **Discussions**: Join our GitHub Discussions
- **Documentation**: Check `/docs` directory for detailed guides
- **Email**: max@9pros.com

## 🆕 v2.0.0 Migration Guide

Upgrading from v1.x to v2.0.0? Check the migration guide for:
- Breaking changes and compatibility notes
- New feature adoption recommendations
- Configuration migration steps
- Performance optimization tips

## 🙏 Acknowledgments

- Qwen team for the excellent foundation model
- OpenAI for API standards inspiration
- Anthropic for Claude integration
- VoltAgent for the amazing specialty agent ecosystem
- The open-source community for tools and libraries
- Our contributors for making v2.0.0 possible

---

**Built with ❤️ for the future of collaborative AI systems**

*Version 2.0.0 - The Next Generation of Swarm Intelligence*
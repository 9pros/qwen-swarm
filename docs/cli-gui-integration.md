# Qwen Swarm CLI-GUI Integration

This document describes the comprehensive CLI-GUI integration system for Qwen Swarm, providing seamless bidirectional communication between the command-line interface and the web GUI.

## Overview

The CLI-GUI integration system consists of multiple components that work together to provide a unified experience:

1. **CLI Commands** - Comprehensive command-line interface with GUI integration
2. **Process Management** - Unified launcher for backend and GUI services
3. **Real-time Communication** - WebSocket bridge for instant updates
4. **Configuration Sync** - Shared configuration system
5. **IPC Bridge** - Inter-process communication for local operations
6. **Log Streaming** - Centralized log management and streaming
7. **Status Monitoring** - System health and component monitoring
8. **Hot Reload** - Development tools with automatic reloading

## Quick Start

### Installation

```bash
# Build the project
npm run build

# Install CLI globally (optional)
npm run build:cli
npm link
```

### Basic Usage

```bash
# Launch the complete system (backend + GUI)
qwen-swarm launch --auto-open

# Start in development mode with hot-reload
qwen-swarm dev

# Start only backend
qwen-swarm start

# Start backend and GUI
qwen-swarm start --gui

# Open GUI in browser
qwen-swarm gui open

# Check system status
qwen-swarm status

# View logs
qwen-swarm logs --follow

# Stop all services
qwen-swarm stop
```

## CLI Commands Reference

### System Management

#### `qwen-swarm launch`
Launch the complete Qwen Swarm system with optional GUI.

```bash
qwen-swarm launch [options]

Options:
  --backend-port <number>  Backend API port (default: 3000)
  --gui-port <number>      GUI port (default: 5173)
  --no-gui                 Disable GUI
  --auto-open              Automatically open GUI in browser
  --env <environment>      Environment (development|production|staging)
  --no-auto-restart        Disable auto-restart on failure
```

#### `qwen-swarm dev`
Start in development mode with hot-reload and debug features.

```bash
qwen-swarm dev [options]

Options:
  --backend-port <number>  Backend API port (default: 3000)
  --gui-port <number>      GUI port (default: 5173)
  --debug                  Enable debug mode
  --no-hot-reload          Disable hot reload
```

#### `qwen-swarm stop`
Stop Qwen Swarm components.

```bash
qwen-swarm stop [component] [options]

Arguments:
  component    Component to stop (all|backend|gui) (default: all)

Options:
  --force      Force shutdown
```

#### `qwen-swarm restart`
Restart Qwen Swarm components.

```bash
qwen-swarm restart [component]

Arguments:
  component    Component to restart (all|backend|gui) (default: all)
```

### GUI Management

#### `qwen-swarm gui`
Manage the GUI interface.

```bash
qwen-swarm gui [action] [options]

Actions:
  open         Open GUI in browser (default)
  close        Close GUI
  status       Show GUI status

Options:
  --port <number>    GUI port (default: 5173)
```

### Agent Management

#### `qwen-swarm agent`
Manage swarm agents.

```bash
qwen-swarm agent [action] [id] [options]

Actions:
  create       Create a new agent
  list         List all agents
  delete       Delete an agent
  start        Start an agent
  stop         Stop an agent
  restart      Restart an agent

Options:
  --name <name>        Agent name
  --type <type>        Agent type
  --config <path>      Configuration file path
  --gui                Use GUI for agent creation
```

### Task Management

#### `qwen-swarm task`
Manage swarm tasks.

```bash
qwen-swarm task [action] [id] [options]

Actions:
  create       Create a new task
  list         List all tasks
  cancel       Cancel a task
  retry        Retry a failed task

Options:
  --agent-id <id>      Assign to specific agent
  --priority <level>   Task priority
  --description <text> Task description
  --live               Show live task updates
  --gui                Use GUI for task creation
```

### Configuration

#### `qwen-swarm config`
Manage system configuration.

```bash
qwen-swarm config [action] [key] [value] [options]

Actions:
  show         Show all configuration
  get <key>    Get configuration value
  set <key> <value>  Set configuration value
  sync         Sync CLI and GUI configuration

Options:
  --file <path>        Configuration file path
  --sync               Sync CLI and GUI config
```

### Logs and Monitoring

#### `qwen-swarm logs`
View system logs.

```bash
qwen-swarm logs [process] [options]

Arguments:
  process      Process to view logs for (all|backend|gui) (default: all)

Options:
  --follow             Follow log output
  --tail <number>      Number of lines to show (default: 50)
  --level <level>      Log level filter (info|warn|error)
  --gui                Stream logs to GUI
```

#### `qwen-swarm status`
Show system status.

```bash
qwen-swarm status [options]

Options:
  --watch              Watch status updates
  --json               Output as JSON
```

## Integration Architecture

### Component Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CLI Interface │◄──►│  WebSocket Bridge│◄──►│   GUI Interface │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Process Manager│    │   IPC Bridge     │    │  Config Sync    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Log Streamer   │    │ Status Monitor   │    │  Hot Reloader   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Communication Flow

1. **CLI Commands** → **Process Manager**: Execute system operations
2. **Process Manager** → **WebSocket Bridge**: Broadcast status changes
3. **WebSocket Bridge** → **GUI**: Real-time updates
4. **GUI** → **WebSocket Bridge**: User actions and commands
5. **WebSocket Bridge** → **IPC Bridge**: Local process communication
6. **All Components** → **Log Streamer**: Centralized logging
7. **Status Monitor** → **All Components**: Health monitoring

## Configuration

### Default Configuration

The system uses a hierarchical configuration system:

```json
{
  "system": {
    "name": "Qwen Swarm",
    "environment": "development",
    "version": "1.0.0"
  },
  "api": {
    "port": 3000,
    "host": "localhost"
  },
  "websocket": {
    "port": 3001,
    "path": "/ws"
  },
  "gui": {
    "enabled": true,
    "port": 5173,
    "auto_open": false
  },
  "agents": {
    "max_count": 100,
    "auto_restart": true
  },
  "logging": {
    "level": "info",
    "file": {
      "enabled": true,
      "path": "./logs"
    }
  },
  "development": {
    "hot_reload": true,
    "debug": false
  }
}
```

### Configuration Files

Configuration is loaded from multiple sources in priority order:

1. Environment variables (`QWEN_SWARM_*`)
2. Command-line arguments
3. `config/local.json`
4. `config/production.json` or `config/development.json`
5. `config/default.json`

### Environment Variables

```bash
# System Configuration
QWEN_SWARM_ENV=development
QWEN_SWARM_API_PORT=3000
QWEN_SWARM_GUI_PORT=5173

# Logging
QWEN_SWARM_LOG_LEVEL=info
QWEN_SWARM_LOG_PATH=./logs

# Development
QWEN_SWARM_DEBUG=false
QWEN_SWARM_HOT_RELOAD=true
```

## Real-time Communication

### WebSocket Events

The system uses WebSocket for real-time communication:

#### System Events
```javascript
// Process status updates
{
  type: "process:started",
  payload: { id: "backend", name: "Qwen Swarm Backend", status: "running" }
}

// Configuration changes
{
  type: "config:changed",
  payload: { items: [{ key: "api.port", value: 3000 }] }
}

// System health updates
{
  type: "system:health",
  payload: { overall: "healthy", components: [...] }
}
```

#### Log Events
```javascript
// Log entries
{
  type: "log_entry",
  payload: {
    id: "log_123",
    timestamp: "2023-12-01T10:30:00.000Z",
    level: "info",
    message: "Agent started",
    source: "backend"
  }
}
```

#### Control Events
```javascript
// Remote commands
{
  type: "restart",
  payload: { component: "backend", reason: "Manual restart" }
}

// Hot reload events
{
  type: "style_update",
  payload: { files: ["styles/main.css"] }
}
```

## Development Tools

### Hot Reload

The system includes intelligent hot-reload capabilities:

- **Backend Changes**: Automatic restart for core files
- **Frontend Changes**: Live reload for UI components
- **Style Changes**: Instant CSS updates without page refresh
- **Configuration Changes**: Dynamic config reloading

### Debug Mode

Enable debug mode for detailed logging:

```bash
qwen-swarm dev --debug
```

### Log Streaming

View logs from all components in real-time:

```bash
# Follow all logs
qwen-swarm logs --follow

# Stream logs to GUI
qwen-swarm logs --gui

# Filter by level
qwen-swarm logs --level error
```

## API Integration

### REST API Endpoints

The integration system provides additional API endpoints:

```javascript
// Process management
GET    /api/v1/processes
POST   /api/v1/processes/:id/start
POST   /api/v1/processes/:id/stop
POST   /api/v1/processes/:id/restart

// Configuration
GET    /api/v1/config
PUT    /api/v1/config
POST   /api/v1/config/sync

// System status
GET    /api/v1/system/status
GET    /api/v1/system/health
GET    /api/v1/system/metrics

// Logs
GET    /api/v1/logs
GET    /api/v1/logs/search
GET    /api/v1/logs/stats
```

### WebSocket API

Connect to the WebSocket bridge for real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:3004');

// Authentication
ws.send(JSON.stringify({
  type: 'auth',
  payload: {
    token: 'your-token',
    clientType: 'gui'
  }
}));

// Subscribe to topics
ws.send(JSON.stringify({
  type: 'subscribe',
  payload: { topic: 'logs' }
}));
```

## Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Check which ports are in use
lsof -i :3000
lsof -i :5173

# Use different ports
qwen-swarm launch --backend-port 3001 --gui-port 5174
```

#### GUI Not Opening
```bash
# Check if GUI is running
qwen-swarm gui status

# Manually open GUI
qwen-swarm gui open --port 5173
```

#### Configuration Issues
```bash
# Show current configuration
qwen-swarm config show

# Reset to defaults
qwen-swarm config set system.environment development
```

#### Health Check Failures
```bash
# Check system health
qwen-swarm status --watch

# View detailed component status
curl http://localhost:3000/api/v1/system/health
```

### Debug Information

Enable debug logging for troubleshooting:

```bash
# Set debug log level
qwen-swarm config set logging.level debug

# Run with debug mode
qwen-swarm dev --debug

# View debug logs
qwen-swarm logs --follow --level debug
```

### Performance Monitoring

Monitor system performance:

```bash
# View system metrics
curl http://localhost:3000/api/v1/system/metrics

# Monitor WebSocket connections
curl http://localhost:3002/api/status
```

## Advanced Usage

### Custom Integration

Create custom integrations using the provided APIs:

```javascript
import { CLIGUIBridge, WebSocketBridge, ConfigSync } from 'qwen-swarm';

// Initialize components
const bridge = new CLIGUIBridge();
const wsBridge = new WebSocketBridge();
const configSync = new ConfigSync();

// Setup custom event handlers
bridge.on('process:started', (status) => {
  console.log(`Process started: ${status.name}`);
});

wsBridge.on('message:received', (message) => {
  // Handle custom messages
});
```

### Environment-Specific Configurations

Create different configurations for various environments:

```json
// config/development.json
{
  "system": { "environment": "development" },
  "development": { "hot_reload": true, "debug": true },
  "logging": { "level": "debug" }
}

// config/production.json
{
  "system": { "environment": "production" },
  "development": { "hot_reload": false, "debug": false },
  "logging": { "level": "info" }
}
```

### Automated Deployment

Use the CLI for automated deployments:

```bash
#!/bin/bash
# deploy.sh

# Stop existing services
qwen-swarm stop

# Update configuration
qwen-swarm config set system.environment production
qwen-swarm config set api.port 80

# Start services
qwen-swarm launch --env production

# Wait for health check
sleep 30

# Verify deployment
qwen-swarm status
```

## Contributing

### Development Setup

```bash
# Clone repository
git clone https://github.com/your-org/qwen-swarm.git
cd qwen-swarm

# Install dependencies
npm install
cd frontend && npm install && cd ..

# Build project
npm run build

# Start development
npm run dev
```

### Adding New CLI Commands

1. Create command handler in `src/integration/cli-commands.ts`
2. Add command to program in `src/cli/main.ts`
3. Update documentation
4. Add tests

### Extending Integration

1. Add new component to status monitor
2. Implement WebSocket events
3. Update configuration schema
4. Add health checks

## License

This integration system is part of the Qwen Swarm project. See the main project license for details.
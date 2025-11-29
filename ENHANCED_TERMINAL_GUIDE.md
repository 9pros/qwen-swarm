# Enhanced Terminal Integration Guide

## Overview

The Qwen Swarm Enhanced Terminal Integration provides a comprehensive terminal wrapper and visualization system that enhances the CLI experience with advanced visualizations, interactive elements, and seamless web integration.

## Features

### 🎨 **Enhanced Visualizations**
- **Rich Terminal UI**: Interactive dashboards with colored output
- **Progress Indicators**: Animated progress bars and spinners
- **ASCII Art**: Beautiful system headers and status displays
- **Charts & Graphs**: Terminal-based data visualization
- **Status Grids**: Visual agent and system status displays

### 🌐 **Web Terminal Integration**
- **Browser-based Terminal**: Full xterm.js integration
- **Real-time Communication**: WebSocket-based terminal forwarding
- **Session Management**: Multiple terminal sessions support
- **Theme Support**: Light and dark themes
- **Responsive Design**: Works on all devices

### 🤖 **Swarm Orchestration**
- **Agent Management**: Visual agent lifecycle management
- **Task Monitoring**: Real-time task queue visualization
- **Performance Metrics**: System resource monitoring
- **Topology Visualization**: Swarm network topology display

### ⚡ **Interactive Features**
- **Command History**: Interactive command browsing
- **Auto-completion**: Tab completion support
- **Interactive Prompts**: User-friendly input dialogs
- **Search & Filter**: Find and filter data quickly

## Installation

### Build the Enhanced Terminal

```bash
# Build the project
npm run build

# Build enhanced terminal specifically
npm run build:enhanced

# Install CLI globally (optional)
npm run build:enhanced
npm link
```

### Development Mode

```bash
# Run enhanced CLI in development
npm run cli:enhanced

# Or use tsx directly
tsx src/cli/enhanced-main.ts
```

## Usage

### Basic Commands

#### 1. Dashboard
```bash
# Show real-time swarm dashboard
qwen-swarm-enhanced dashboard

# Auto-refresh dashboard
qwen-swarm-enhanced dashboard --watch

# Disable colors
qwen-swarm-enhanced dashboard --no-colors
```

#### 2. Agent Management
```bash
# List all agents
qwen-swarm-enhanced agents list

# Filter agents
qwen-swarm-enhanced agents list --filter "worker"
qwen-swarm-enhanced agents list --status "running"

# Interactive agent creation
qwen-swarm-enhanced agents create --interactive

# Manage specific agent
qwen-swarm-enhanced agents manage agent-123

# Show swarm topology
qwen-swarm-enhanced agents topology
```

#### 3. Task Management
```bash
# List tasks
qwen-swarm-enhanced tasks list

# Filter by status
qwen-swarm-enhanced tasks list --status "failed"

# Interactive task creation
qwen-swarm-enhanced tasks create --interactive
```

#### 4. System Monitoring
```bash
# Show system metrics
qwen-swarm-enhanced metrics

# Chart format
qwen-swarm-enhanced metrics --format chart

# Auto-refresh metrics
qwen-swarm-enhanced metrics --refresh 5
```

#### 5. Enhanced Launch
```bash
# Launch with dashboard
qwen-swarm-enhanced launch --dashboard

# Production mode
qwen-swarm-enhanced launch --mode production --theme dark

# Start interactive terminal mode
qwen-swarm-enhanced interactive
```

### Interactive Mode

Launch the interactive terminal for a rich command-line experience:

```bash
qwen-swarm-enhanced interactive --theme dark
```

Built-in interactive commands:
- `help` - Show available commands
- `dashboard` - Show swarm dashboard
- `agents` - Manage agents
- `tasks` - Manage tasks
- `clear` - Clear terminal
- `history` - Show command history
- `export` - Export session data
- `exit` - Exit terminal

### Web Terminal

The enhanced terminal includes a web-based terminal interface accessible through the GUI:

1. **Launch the System**:
```bash
qwen-swarm-enhanced launch --dashboard --gui
```

2. **Access Web Terminal**:
- Open your browser to `http://localhost:5173`
- Navigate to the "Terminal Dashboard" page
- Use the embedded terminal interface

3. **Web Terminal Features**:
- **Full terminal emulation** with xterm.js
- **Multiple sessions** support
- **Theme switching** (light/dark)
- **Search functionality**
- **Command history**
- **Real-time output** streaming

### Advanced Usage

#### 1. Performance Analysis
```bash
# Analyze system performance
qwen-swarm-enhanced analyze

# Deep analysis with export
qwen-swarm-enhanced analyze --deep --export html
```

#### 2. Configuration Management
```bash
# Show configuration
qwen-swarm-enhanced config show

# Get specific setting
qwen-swarm-enhanced config get system.name

# Set configuration with validation
qwen-swarm-enhanced config set system.name "My Swarm" --validate
```

#### 3. Debugging and Diagnostics
```bash
# Health check
qwen-swarm-enhanced debug health

# System tests
qwen-swarm-enhanced debug test --verbose

# Performance profiling
qwen-swarm-enhanced debug profile --component agents
```

#### 4. Logs with Enhanced Formatting
```bash
# Follow logs
qwen-swarm-enhanced logs --follow --level info

# Highlight specific text
qwen-swarm-enhanced logs --highlight "error"

# Component-specific logs
qwen-swarm-enhanced logs agents --tail 100
```

## API Integration

### Terminal Programmatic Usage

```typescript
import { EnhancedTerminal } from './src/terminal/EnhancedTerminal';
import { SwarmTerminalIntegration } from './src/terminal/SwarmTerminalIntegration';

// Create enhanced terminal
const terminal = new EnhancedTerminal({
  theme: 'dark',
  interactive: true,
  colorSupport: true
});

// Create swarm integration
const swarmIntegration = new SwarmTerminalIntegration(orchestrator, apiServer);

// Connect to swarm
await swarmIntegration.connect();

// Show dashboard
await swarmIntegration.showDashboard();

// Show agent status
await swarmIntegration.showAgentStatus();

// Interactive agent creation
await swarmIntegration.createAgentInteractive();
```

### WebSocket Events

The enhanced terminal emits various events for real-time updates:

```typescript
// System events
swarmIntegration.on('connected', () => {
  console.log('Connected to swarm');
});

swarmIntegration.on('disconnected', () => {
  console.log('Disconnected from swarm');
});

swarmIntegration.on('data:updated', ({ agents, tasks, metrics }) => {
  // Handle real-time data updates
});

// Terminal events
terminal.on('terminal:resize', ({ width, height }) => {
  // Handle terminal resize
});
```

## Configuration

### Terminal Configuration

Create a `.terminalrc.json` file for custom terminal settings:

```json
{
  "theme": "dark",
  "fontSize": 14,
  "fontFamily": "Cascadia Code, monospace",
  "enableWebGL": true,
  "colorSupport": true,
  "unicodeSupport": true,
  "autoRefresh": {
    "enabled": true,
    "interval": 5000
  },
  "features": {
    "notifications": true,
    "progressBars": true,
    "asciiArt": true,
    "soundEffects": false
  }
}
```

### Environment Variables

```bash
# Terminal configuration
export QWEN_TERMINAL_THEME=dark
export QWEN_TERMINAL_COLORS=true
export QWEN_TERMINAL_UNICODE=true

# Auto-refresh settings
export QWEN_TERMINAL_AUTO_REFRESH=true
export QWEN_TERMINAL_REFRESH_INTERVAL=5000

# Web terminal
export QWEN_TERMINAL_WEB_PORT=3002
export QWEN_TERMINAL_WEB_SSL=false
```

## Examples

### Example 1: Quick System Overview

```bash
# Launch with dashboard for immediate overview
qwen-swarm-enhanced launch --dashboard --auto-open
```

### Example 2: Agent Management Session

```bash
# Start interactive terminal
qwen-swarm-enhanced interactive

# Inside the terminal:
# qwen-swarm> agents list
# qwen-swarm> agents create --interactive
# qwen-swarm> agents manage agent-123
# qwen-swarm> topology
```

### Example 3: Performance Monitoring

```bash
# Continuous monitoring with auto-refresh
qwen-swarm-enhanced metrics --refresh 2 --format chart

# In another terminal, analyze performance
qwen-swarm-enhanced analyze --deep --export performance-report.html
```

### Example 4: Development Workflow

```bash
# Development mode with hot-reload
qwen-swarm-enhanced launch --mode development --dashboard

# View logs with highlighting
qwen-swarm-enhanced logs --follow --level debug --highlight "error"

# Run diagnostics
qwen-swarm-enhanced debug health --verbose
```

## Troubleshooting

### Common Issues

#### Terminal Colors Not Working
```bash
# Check color support
echo $TERM

# Force color support
export FORCE_COLOR=1
qwen-swarm-enhanced dashboard
```

#### WebSocket Connection Issues
```bash
# Check if WebSocket server is running
qwen-swarm-enhanced debug health

# Verify ports
netstat -an | grep :3002
```

#### Performance Issues
```bash
# Disable animations for better performance
export QWEN_TERMINAL_ANIMATIONS=false

# Reduce refresh interval
export QWEN_TERMINAL_REFRESH_INTERVAL=10000
```

### Debug Mode

Enable debug mode for detailed logging:

```bash
export DEBUG=qwen-terminal:*
qwen-swarm-enhanced dashboard --verbose
```

## Contributing

### Adding New Commands

1. Create command handler in `src/terminal/commands/`
2. Register command in `EnhancedCLI`
3. Add visualization in `src/terminal/components/`
4. Update documentation

### Adding New Visualizations

1. Create visualization component in `src/terminal/components/visualizations.ts`
2. Add color themes to `src/terminal/utils/colors.ts`
3. Update formatters in `src/terminal/utils/formatters.ts`
4. Test with different terminals

## Performance Considerations

- **Memory Usage**: Terminal maintains history and state - monitor with large outputs
- **CPU Usage**: Animations and real-time updates - disable on low-power systems
- **Network**: WebSocket connections for real-time updates - consider bandwidth
- **Rendering**: Complex ASCII art and charts - may be slow on slow terminals

## Future Enhancements

- **Plugin System**: Extensible command and visualization plugins
- **Themes**: Additional color themes and custom themes
- **Collaboration**: Multi-user terminal sessions
- **AI Assistant**: Integrated AI help and suggestions
- **Mobile**: Enhanced mobile web terminal experience
- **Shortcuts**: Keyboard shortcuts and macros
- **Recording**: Terminal session recording and playback

## Support

- **Documentation**: See `/docs` directory for detailed API docs
- **Issues**: Report via GitHub Issues
- **Discussions**: Join GitHub Discussions
- **Examples**: Check `/examples` directory for more use cases

---

**Built with ❤️ for the future of terminal interfaces and swarm orchestration**
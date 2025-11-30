# 🚀 Qwen Swarm Activity Display

An incredible real-time visualization system for monitoring 10 parallel agents working in perfect harmony within the Qwen Code CLI ecosystem.

## ✨ Features

### 🎨 Visual Enhancement System

- **Real-time Agent Status** - Live indicators for 10 agents working in parallel
- **Parallel Execution Visualization** - Show all 10 agents working simultaneously
- **Inter-Agent Communication** - Display agent messages and coordination
- **Performance Metrics** - Real-time performance indicators with graphs
- **Consensus Indicators** - Show agreement levels between agents
- **Progress Visualization** - Animated progress for complex tasks

### 🤖 10 Parallel Agent Types

| Agent | Emoji | Specialty | Role |
|-------|-------|-----------|------|
| **Queen Agent** | 🧠 | Coordination | Master coordinator and decision maker |
| **Code Agent** | 💻 | Development | Primary code writer and refiner |
| **Analysis Agent** | 📊 | Analysis | Requirements analysis and insights |
| **Architecture Agent** | 🏗️ | Design | System design and patterns |
| **Testing Agent** | 🧪 | Quality | Quality assurance and validation |
| **Documentation Agent** | 📝 | Documentation | Docs and comments generation |
| **Security Agent** | 🔒 | Security | Security analysis and vulnerability detection |
| **Performance Agent** | ⚡ | Optimization | Optimization and performance analysis |
| **UI/UX Agent** | 🎨 | Design | User interface and experience design |
| **Integration Agent** | 🔧 | Integration | API integration and system connectivity |

### 🎯 Visual Elements

- **Agent Status Icons**: All 10 agents with unique emojis and indicators
- **Activity Indicators**: Animated dots, progress bars, status colors for each agent
- **Communication Flow**: Visual representation of inter-agent coordination
- **Performance Graphs**: Mini charts showing swarm efficiency across 10 agents
- **Consensus Meter**: Visual agreement indicator for 10-agent consensus

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/qwen-code/qwen-swarm.git
cd qwen-swarm

# Install dependencies
npm install

# Run the swarm demo
npm run swarm:demo
```

### Demo Controls

| Key | Action |
|-----|--------|
| **Space** | Toggle visibility |
| **C** | Collapse/expand display |
| **M** | Cycle display modes (Full → Compact → Minimal) |
| **S** | Trigger random scenario |
| **V** | Start voting round |
| **E** | Trigger emergency scenario |
| **R** | Reset all agents |
| **Q** | Quit demo |

### Display Modes

#### Full Mode
- Complete agent grid with all details
- Performance metrics and graphs
- Communication flow visualization
- Consensus meter with voting

#### Compact Mode
- Agent grid only
- Essential metrics
- Optimized for smaller terminals

#### Minimal Mode
- Single-line status display
- Basic agent indicators
- Perfect for monitoring

## 📊 System Architecture

### Core Components

```
SwarmActivityDisplay
├── AgentStatusManager
├── VisualRenderer
├── CommunicationFlowVisualizer
├── PerformanceMetrics
└── ConsensusMeter
```

### Agent Status Management

```typescript
interface Agent {
  id: string;
  name: string;
  emoji: string;
  status: AgentStatus;
  currentTask: string;
  progress: number;
  messages: number;
  lastActivity: Date;
  performance: number;
}
```

### Communication System

- **Real-time messaging** between agents
- **Broadcast capability** for system-wide announcements
- **Priority-based message handling**
- **Network visualization** of communication patterns

### Performance Monitoring

- **CPU/Memory usage** tracking per agent
- **Response time** monitoring
- **Throughput analysis** with graphs
- **Error rate** tracking with alerts
- **Optimization suggestions** based on metrics

### Consensus System

- **Voting mechanism** for decisions
- **Agreement tracking** with visualization
- **Participation rate** monitoring
- **Decision history** and trends

## 🎨 Visual Features

### ANSI Color Schemes

```typescript
colorSchemes = {
  default: {  /* Standard colors */ },
  dark: {     /* Dark theme */ },
  light: {    /* Light theme */ },
  matrix: {   /* Matrix-style green */ }
}
```

### Animations

- **Loading indicators** with rotating characters
- **Pulse effects** for active agents
- **Wave animations** for activity levels
- **Communication flow** animations

### Progress Bars

```typescript
// Multi-style progress indicators
[████████░░] 80%  // Full color
[████░░░░░░] 40%  // Warning level
[██░░░░░░░░] 20%  // Critical level
```

## 🛠️ Advanced Features

### Scenario System

The demo includes automatic scenario triggering:

- **High Load Scenario** - Multiple simultaneous tasks
- **Communication Burst** - Heavy messaging load
- **Consensus Challenge** - Complex voting situations
- **Performance Test** - Stress testing agents
- **Error Recovery** - Simulated failure and recovery

### Terminal Responsiveness

- **Dynamic resizing** - Adapts to terminal size changes
- **Smart positioning** - Optimized layout for different screen sizes
- **Collapsible sections** - Show/hide different components
- **Keyboard controls** - Full interactive control

### Performance Optimization

- **Efficient rendering** - 10 FPS update rate
- **Memory management** - Automatic cleanup of old data
- **Lazy loading** - Only render visible components
- **Resource monitoring** - Track system impact

## 📈 Metrics Dashboard

### Real-time Metrics

- **Swarm Efficiency** - Overall system performance
- **Consensus Level** - Agreement percentage
- **Active Tasks** - Currently running operations
- **Message Count** - Communication activity
- **Error Rate** - System health indicator

### Performance Graphs

- **CPU Usage** per agent
- **Memory Consumption** tracking
- **Response Time** trends
- **Throughput** measurements
- **Success/Error** rates

### Network Visualization

```
🧠─────💻─────📊
│ \     │     / │
│  \    │    /  │
│   \   │   /   │
│    \  │  /    │
│     \ │ /     │
🏗️─────🧪─────📝
```

## 🎯 Use Cases

### Development Teams

- **Monitor parallel development** across team members
- **Track code review** progress
- **Visualize build pipeline** status
- **Coordinate releases** with consensus

### DevOps & SRE

- **System health monitoring** with real-time alerts
- **Performance optimization** tracking
- **Incident response** coordination
- **Load balancing** visualization

### Project Management

- **Task progress** tracking across teams
- **Resource allocation** monitoring
- **Team collaboration** patterns
- **Decision making** with consensus

### AI/ML Systems

- **Multi-agent coordination** visualization
- **Model training** progress tracking
- **Distributed computing** monitoring
- **Consensus algorithms** demonstration

## 🔧 Configuration

### Display Settings

```typescript
interface RenderConfig {
  terminalWidth: number;
  terminalHeight: number;
  colorScheme: 'default' | 'dark' | 'light' | 'matrix';
  animationSpeed: 'slow' | 'normal' | 'fast';
  compactMode: boolean;
  showPerformance: boolean;
  showCommunication: boolean;
  showProgressBars: boolean;
  showIcons: boolean;
}
```

### Performance Thresholds

```typescript
// Customize alert thresholds
performanceMetrics.setThreshold('cpuUsage', 70, 90);  // Warning at 70%, Error at 90%
performanceMetrics.setThreshold('memoryUsage', 70, 85);
performanceMetrics.setThreshold('responseTime', 200, 400);
```

### Consensus Settings

```typescript
// Adjust decision making parameters
consensusMeter.setConsensusThreshold(75);  // 75% agreement required
consensusMeter.setMinParticipants(6);      // At least 6 of 10 agents
```

## 🐛 Troubleshooting

### Common Issues

**Terminal display issues:**
- Ensure terminal supports ANSI colors
- Check terminal size (minimum 80x24 recommended)
- Try different color schemes with `M` key

**Performance problems:**
- Switch to compact mode with `M` key
- Disable animations in configuration
- Check system resource usage

**Agent not responding:**
- Press `R` to reset all agents
- Check for error messages in console
- Restart the demo if needed

### Debug Mode

```bash
# Run with debug output
DEBUG=swarm:* npm run swarm:demo

# Enable verbose logging
VERBOSE=true npm run swarm:demo
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone repository
git clone https://github.com/qwen-code/qwen-swarm.git
cd qwen-swarm

# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Code Style

- Use TypeScript for all new code
- Follow the existing code structure
- Add comprehensive comments
- Include tests for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Qwen Code CLI** - Base system integration
- **Node.js** - Runtime environment
- **TypeScript** - Type-safe development
- **ANSI Colors** - Terminal visualization
- **Terminal Developers** - Inspiration for TUI patterns

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/qwen-code/qwen-swarm/issues)
- **Discussions**: [GitHub Discussions](https://github.com/qwen-code/qwen-swarm/discussions)
- **Documentation**: [Wiki](https://github.com/qwen-code/qwen-swarm/wiki)

---

**🚀 Experience the power of 10 parallel agents working in perfect harmony!**
# Qwen Swarm Frontend

A modern, responsive web interface for the Qwen Swarm orchestration system. Built with React, TypeScript, and Tailwind CSS.

## Features

### 🎯 Core Functionality
- **Real-time Dashboard**: Live monitoring of agents, tasks, and system health
- **Agent Management**: Create, configure, and monitor AI agents
- **Task Orchestration**: Visual task creation, assignment, and tracking
- **Provider Configuration**: Multi-provider setup and management
- **Performance Analytics**: Comprehensive charts and metrics visualization
- **System Settings**: Configuration management and security settings

### 🛠 Technical Features
- **Modern Stack**: React 18, TypeScript, Vite, Tailwind CSS
- **Real-time Updates**: WebSocket integration for live data
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Dark Mode**: Full dark/light theme support
- **State Management**: Zustand for efficient state handling
- **Data Fetching**: React Query with caching and background updates
- **Component Library**: Reusable UI components with consistent design

### 📊 Dashboard Features
- **Live Metrics**: Real-time agent status, task queue, system performance
- **Interactive Charts**: Performance trends, agent distribution, task analytics
- **Quick Actions**: Rapid access to common operations
- **Recent Activity**: Timeline of system events and changes
- **System Health**: Component status and alerts monitoring

## Prerequisites

- Node.js 18+
- npm or yarn
- Qwen Swarm backend server running on port 3000

## Installation

1. **Clone and navigate to the frontend directory**:
   ```bash
   cd qwen-swarm/frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your configuration:
   ```env
   VITE_API_BASE_URL=http://localhost:3000
   VITE_WS_URL=ws://localhost:3001
   VITE_APP_NAME=Qwen Swarm
   VITE_APP_VERSION=1.0.0
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**:
   Navigate to `http://localhost:5173`

## Usage

### First-time Setup

1. **Login**: Use demo credentials:
   - Email: `admin@qwen-swarm.com`
   - Password: `password`

2. **Dashboard Overview**:
   - View system metrics and health
   - Monitor agent activity
   - Check task queue status
   - Review recent activity

3. **Configure Providers**:
   - Navigate to Providers → Add new provider
   - Configure Qwen, OpenAI, Claude, or custom providers
   - Set API keys and model preferences

4. **Create Agents**:
   - Go to Agents → Create Agent
   - Define agent type, role, and capabilities
   - Configure provider and resources
   - Set scaling and retry policies

5. **Manage Tasks**:
   - Create tasks with specific requirements
   - Assign to agents or let system auto-assign
   - Monitor execution and results
   - Handle failures and retries

### Key Sections

#### Dashboard
- **Metric Cards**: Overview of key system indicators
- **Performance Charts**: Historical data and trends
- **Agent Status**: Distribution and health monitoring
- **Task Analytics**: Queue status and completion rates
- **Quick Actions**: Common operations and controls

#### Agents
- **Agent List**: View all agents with status and performance
- **Agent Builder**: Visual configuration interface (coming soon)
- **Agent Details**: Individual agent metrics and logs
- **Bulk Operations**: Start/stop multiple agents

#### Tasks
- **Task Queue**: Monitor pending and running tasks
- **Task Builder**: Create complex task workflows (coming soon)
- **Task History**: View completed and failed tasks
- **Performance Metrics**: Execution times and success rates

#### Providers
- **Provider Management**: Configure AI model providers
- **Health Checks**: Test provider connections
- **Usage Analytics**: Monitor API usage and costs
- **Rate Limiting**: Configure throttling and limits

#### Analytics
- **Performance Trends**: Historical system performance
- **Resource Usage**: CPU, memory, and network metrics
- **Agent Analytics**: Individual and team performance
- **Custom Reports**: Generate and export reports

## Development

### Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Dashboard/      # Dashboard-specific components
│   ├── Layout/         # Layout and navigation
│   └── Common/         # General components
├── pages/             # Page components
├── hooks/             # Custom React hooks
├── services/          # API and WebSocket services
├── store/             # State management
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
└── assets/            # Static assets
```

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run type-check   # TypeScript type checking
```

### Key Technologies

- **React 18**: Modern React with hooks and concurrent features
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **Zustand**: Lightweight state management
- **React Query**: Server state management and caching
- **Recharts**: Chart and visualization library
- **Framer Motion**: Animation library
- **React Hook Form**: Form handling with validation

## API Integration

The frontend connects to the Qwen Swarm backend API:

### REST API Endpoints
- `/api/v1/agents` - Agent management
- `/api/v1/tasks` - Task orchestration
- `/api/v1/providers` - Provider configuration
- `/api/v1/system` - System monitoring
- `/api/v1/consensus` - Consensus management

### WebSocket Events
- `agent_status_update` - Real-time agent status changes
- `task_update` - Task execution updates
- `system_metrics` - Live system metrics
- `consensus_update` - Consensus proposal updates

## Configuration

### Environment Variables

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3001

# App Configuration
VITE_APP_NAME=Qwen Swarm
VITE_APP_VERSION=1.0.0
VITE_APP_DESCRIPTION=Advanced Agent Orchestration

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_DARK_MODE=true
VITE_ENABLE_NOTIFICATIONS=true
```

### Theme Configuration

The app supports light/dark themes with system detection. Themes are customizable via the CSS variables in `tailwind.config.js`.

## Production Deployment

### Build for Production

```bash
npm run build
```

### Environment Setup

1. Set production environment variables
2. Configure reverse proxy (nginx/Apache)
3. Set up SSL certificates
4. Configure static file serving

### Docker Deployment

```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow ESLint configuration
- Write meaningful commit messages
- Add tests for new features
- Update documentation

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## Support

For support and questions:

- 📧 Email: support@qwen-swarm.com
- 💬 Discord: [Join our community](https://discord.gg/qwen-swarm)
- 📖 Documentation: [docs.qwen-swarm.com](https://docs.qwen-swarm.com)
- 🐛 Issues: [GitHub Issues](https://github.com/qwen-swarm/qwen-swarm/issues)

## Roadmap

### Upcoming Features

- [ ] **Visual Agent Builder**: Drag-and-drop workflow creation
- [ ] **Task Builder**: Visual task configuration
- [ ] **Advanced Analytics**: Custom dashboards and reports
- [ ] **Team Collaboration**: Multi-user workspaces
- [ ] **Mobile App**: Native iOS and Android apps
- [ ] **API Playground**: Interactive API testing
- [ ] **Export/Import**: Agent and task configuration sharing
- [ ] **Integrations**: Third-party service connections
- [ ] **Advanced Security**: RBAC and audit logging
- [ ] **Custom Themes**: Personalizable interface themes

### Next Release (v1.1)

- Enhanced agent builder with visual workflow editor
- Advanced task scheduling and dependencies
- Real-time collaboration features
- Performance optimization and caching improvements
- Enhanced mobile experience
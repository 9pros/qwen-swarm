import React, { useState, useEffect, useRef } from 'react';
import { WebTerminal } from '../components/WebTerminal';
import { socketService } from '../services/websocket';
import { apiService } from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Switch } from '../components/ui/Switch';

interface SystemStatus {
  agents: {
    total: number;
    running: number;
    stopped: number;
    error: number;
  };
  tasks: {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
  };
  metrics: {
    cpu: number;
    memory: number;
    disk: number;
    uptime: number;
  };
}

interface TerminalSession {
  id: string;
  startTime: Date;
  commands: number;
  lastActivity: Date;
}

export const TerminalDashboard: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [activeSessions, setActiveSessions] = useState<TerminalSession[]>([]);
  const [isTerminalVisible, setIsTerminalVisible] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark'>('dark');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const terminalRef = useRef<any>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout>();

  // Load system status
  const loadSystemStatus = async () => {
    try {
      const [agentsResponse, tasksResponse, metricsResponse] = await Promise.all([
        apiService.get('/agents'),
        apiService.get('/tasks'),
        apiService.get('/system/metrics')
      ]);

      const agents = agentsResponse.data || [];
      const tasks = tasksResponse.data || [];
      const metrics = metricsResponse.data || {};

      const agentStats = agents.reduce((acc: any, agent: any) => {
        acc.total++;
        acc[agent.status]++;
        return acc;
      }, { total: 0, running: 0, stopped: 0, error: 0, pending: 0 });

      const taskStats = tasks.reduce((acc: any, task: any) => {
        acc.total++;
        acc[task.status]++;
        return acc;
      }, { total: 0, pending: 0, running: 0, completed: 0, failed: 0 });

      setSystemStatus({
        agents: agentStats,
        tasks: taskStats,
        metrics: {
          cpu: metrics.cpu || 0,
          memory: metrics.memory || 0,
          disk: metrics.disk || 0,
          uptime: metrics.uptime || 0
        }
      });

    } catch (error) {
      console.error('Failed to load system status:', error);
    }
  };

  // Load active terminal sessions
  const loadActiveSessions = async () => {
    try {
      const response = await apiService.get('/terminal/sessions');
      const sessions = response.data || [];
      setActiveSessions(sessions);
    } catch (error) {
      console.error('Failed to load terminal sessions:', error);
    }
  };

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh) {
      loadSystemStatus();
      loadActiveSessions();

      refreshTimerRef.current = setInterval(() => {
        loadSystemStatus();
        loadActiveSessions();
      }, refreshInterval);

      return () => {
        if (refreshTimerRef.current) {
          clearInterval(refreshTimerRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval]);

  // WebSocket setup for real-time updates
  useEffect(() => {
    const setupWebSocket = async () => {
      try {
        await socketService.connect();

        // Listen for system updates
        socketService.on('system:status', (status: SystemStatus) => {
          setSystemStatus(status);
        });

        // Listen for terminal sessions
        socketService.on('terminal:session:created', (session: TerminalSession) => {
          setActiveSessions(prev => [...prev, session]);
        });

        socketService.on('terminal:session:closed', (sessionId: string) => {
          setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
        });

        // Listen for terminal output
        socketService.on('terminal:output', (data: { sessionId: string, output: string }) => {
          // Update terminal if it's the active session
          if (terminalRef.current) {
            // Handle terminal output
          }
        });

      } catch (error) {
        console.error('Failed to setup WebSocket:', error);
      }
    };

    setupWebSocket();

    return () => {
      socketService.disconnect();
    };
  }, []);

  // Handle terminal commands
  const handleTerminalCommand = async (command: string, args: string[]) => {
    try {
      // Send command to backend
      await apiService.post('/terminal/command', { command, args });
    } catch (error) {
      console.error('Failed to execute terminal command:', error);
    }
  };

  // Handle terminal output
  const handleTerminalOutput = (data: string) => {
    // Broadcast output via WebSocket
    socketService.emit('terminal:output', { output: data });
  };

  // Create new terminal session
  const createTerminalSession = async () => {
    try {
      const response = await apiService.post('/terminal/sessions', {
        theme: selectedTheme,
        autoRefresh
      });

      const newSession = response.data;
      setActiveSessions(prev => [...prev, newSession]);

      // Show success notification
      console.log('New terminal session created:', newSession.id);
    } catch (error) {
      console.error('Failed to create terminal session:', error);
    }
  };

  // Format duration
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <div className="terminal-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1 className="dashboard-title">
            🐝 Qwen Swarm Terminal Dashboard
          </h1>
          <div className="header-controls">
            <div className="theme-selector">
              <label htmlFor="theme-select">Theme:</label>
              <select
                id="theme-select"
                value={selectedTheme}
                onChange={(e) => setSelectedTheme(e.target.value as 'light' | 'dark')}
                className="theme-select"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>

            <div className="auto-refresh-control">
              <Switch
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
                label="Auto Refresh"
              />
            </div>

            <Button
              onClick={() => loadSystemStatus()}
              variant="outline"
              size="sm"
            >
              Refresh Now
            </Button>

            <Button
              onClick={() => setIsTerminalVisible(!isTerminalVisible)}
              variant={isTerminalVisible ? "solid" : "outline"}
              size="sm"
            >
              {isTerminalVisible ? 'Hide' : 'Show'} Terminal
            </Button>

            <Button
              onClick={createTerminalSession}
              variant="solid"
              size="sm"
            >
              New Session
            </Button>
          </div>
        </div>
      </div>

      {/* System Status Cards */}
      <div className="status-cards">
        <Card className="status-card">
          <div className="card-header">
            <h3>🤖 Agents</h3>
            <Badge variant="primary">{systemStatus?.agents.total || 0}</Badge>
          </div>
          <div className="card-content">
            <div className="status-item">
              <span className="status-label">Running:</span>
              <span className="status-value success">{systemStatus?.agents.running || 0}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Stopped:</span>
              <span className="status-value muted">{systemStatus?.agents.stopped || 0}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Error:</span>
              <span className="status-value error">{systemStatus?.agents.error || 0}</span>
            </div>
          </div>
        </Card>

        <Card className="status-card">
          <div className="card-header">
            <h3>📋 Tasks</h3>
            <Badge variant="info">{systemStatus?.tasks.total || 0}</Badge>
          </div>
          <div className="card-content">
            <div className="status-item">
              <span className="status-label">Pending:</span>
              <span className="status-value warning">{systemStatus?.tasks.pending || 0}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Running:</span>
              <span className="status-value info">{systemStatus?.tasks.running || 0}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Completed:</span>
              <span className="status-value success">{systemStatus?.tasks.completed || 0}</span>
            </div>
          </div>
        </Card>

        <Card className="status-card">
          <div className="card-header">
            <h3>📊 System Resources</h3>
          </div>
          <div className="card-content">
            <div className="metric-item">
              <span className="metric-label">CPU:</span>
              <div className="metric-bar">
                <div
                  className="metric-fill"
                  style={{
                    width: `${systemStatus?.metrics.cpu || 0}%`,
                    backgroundColor: (systemStatus?.metrics.cpu || 0) > 80 ? '#dc3545' :
                                   (systemStatus?.metrics.cpu || 0) > 60 ? '#ffc107' : '#28a745'
                  }}
                />
                <span className="metric-value">{systemStatus?.metrics.cpu || 0}%</span>
              </div>
            </div>
            <div className="metric-item">
              <span className="metric-label">Memory:</span>
              <div className="metric-bar">
                <div
                  className="metric-fill"
                  style={{
                    width: `${systemStatus?.metrics.memory || 0}%`,
                    backgroundColor: (systemStatus?.metrics.memory || 0) > 80 ? '#dc3545' :
                                   (systemStatus?.metrics.memory || 0) > 60 ? '#ffc107' : '#28a745'
                  }}
                />
                <span className="metric-value">{systemStatus?.metrics.memory || 0}%</span>
              </div>
            </div>
            <div className="metric-item">
              <span className="metric-label">Uptime:</span>
              <span className="metric-value">
                {formatDuration((systemStatus?.metrics.uptime || 0) * 1000)}
              </span>
            </div>
          </div>
        </Card>

        <Card className="status-card">
          <div className="card-header">
            <h3>💻 Active Sessions</h3>
            <Badge variant="secondary">{activeSessions.length}</Badge>
          </div>
          <div className="card-content">
            <div className="sessions-list">
              {activeSessions.length === 0 ? (
                <div className="no-sessions">
                  <span className="muted">No active terminal sessions</span>
                </div>
              ) : (
                activeSessions.map((session) => (
                  <div key={session.id} className="session-item">
                    <div className="session-info">
                      <span className="session-id">{session.id.substring(0, 8)}...</span>
                      <span className="session-commands">
                        {session.commands} commands
                      </span>
                    </div>
                    <div className="session-time">
                      {formatDuration(Date.now() - session.lastActivity.getTime())}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Terminal */}
      {isTerminalVisible && (
        <Card className="terminal-card">
          <div className="terminal-header">
            <h3>🖥️ Terminal Interface</h3>
            <div className="terminal-actions">
              <Button
                onClick={() => terminalRef.current?.clear()}
                variant="outline"
                size="sm"
              >
                Clear
              </Button>
              <Button
                onClick={() => terminalRef.current?.focus()}
                variant="outline"
                size="sm"
              >
                Focus
              </Button>
            </div>
          </div>
          <div className="terminal-wrapper">
            <WebTerminal
              ref={terminalRef}
              theme={selectedTheme}
              fontSize={14}
              fontFamily="'Cascadia Code', 'Fira Code', monospace"
              enableWebGL={true}
              cols={100}
              rows={30}
              onCommand={handleTerminalCommand}
              onOutput={handleTerminalOutput}
              className="web-terminal"
            />
          </div>
        </Card>
      )}

      <style jsx>{`
        .terminal-dashboard {
          padding: 20px;
          background: #f8f9fa;
          min-height: 100vh;
        }

        .dashboard-header {
          margin-bottom: 24px;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .dashboard-title {
          font-size: 28px;
          font-weight: bold;
          margin: 0;
          color: #333;
        }

        .header-controls {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .theme-selector {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .theme-selector label {
          font-size: 14px;
          font-weight: 500;
          color: #666;
        }

        .theme-select {
          padding: 6px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          background: white;
          font-size: 14px;
        }

        .status-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }

        .status-card .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .status-card h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #333;
        }

        .card-content {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .status-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 0;
        }

        .status-label {
          font-size: 14px;
          color: #666;
        }

        .status-value {
          font-size: 14px;
          font-weight: 500;
        }

        .status-value.success {
          color: #28a745;
        }

        .status-value.warning {
          color: #ffc107;
        }

        .status-value.error {
          color: #dc3545;
        }

        .status-value.info {
          color: #17a2b8;
        }

        .status-value.muted {
          color: #6c757d;
        }

        .metric-item {
          margin-bottom: 8px;
        }

        .metric-label {
          display: block;
          font-size: 14px;
          color: #666;
          margin-bottom: 4px;
        }

        .metric-bar {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .metric-fill {
          height: 8px;
          border-radius: 4px;
          min-width: 20px;
          transition: width 0.3s ease;
        }

        .metric-value {
          font-size: 12px;
          font-weight: 500;
          color: #333;
          min-width: 40px;
        }

        .sessions-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 200px;
          overflow-y: auto;
        }

        .session-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px;
          background: #f8f9fa;
          border-radius: 6px;
        }

        .session-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .session-id {
          font-size: 12px;
          font-family: monospace;
          font-weight: 500;
          color: #495057;
        }

        .session-commands {
          font-size: 11px;
          color: #6c757d;
        }

        .session-time {
          font-size: 12px;
          color: #6c757d;
        }

        .no-sessions {
          text-align: center;
          padding: 20px;
          color: #6c757d;
        }

        .terminal-card {
          margin-top: 20px;
        }

        .terminal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .terminal-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #333;
        }

        .terminal-actions {
          display: flex;
          gap: 8px;
        }

        .terminal-wrapper {
          height: 500px;
          border-radius: 8px;
          overflow: hidden;
        }

        .web-terminal {
          height: 100%;
          width: 100%;
        }

        @media (max-width: 768px) {
          .terminal-dashboard {
            padding: 12px;
          }

          .header-content {
            flex-direction: column;
            align-items: stretch;
          }

          .header-controls {
            justify-content: center;
          }

          .status-cards {
            grid-template-columns: 1fr;
          }

          .terminal-wrapper {
            height: 400px;
          }
        }
      `}</style>
    </div>
  );
};
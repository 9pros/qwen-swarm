/**
 * Core types for Enhanced Terminal System
 */

export interface TerminalConfig {
  theme: TerminalTheme;
  width: number;
  height: number;
  colorSupport: boolean;
  unicodeSupport: boolean;
  interactive: boolean;
}

export interface TerminalTheme {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  muted: string;
  background: string;
  text: string;
  accent: string;
}

export interface ProgressBarOptions {
  width: number;
  char: string;
  emptyChar: string;
  showPercent: boolean;
  showTime: boolean;
  animated: boolean;
}

export interface SpinnerOptions {
  frames: string[];
  interval: number;
  color?: string;
}

export interface TableColumn {
  header: string;
  key: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: (value: any) => string;
  color?: (value: any) => string;
}

export interface TableOptions {
  headers: boolean;
  borders: boolean;
  padding: number;
  maxWidth?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface BoxOptions {
  title?: string;
  titleAlign?: 'left' | 'center' | 'right';
  padding: number;
  margin: number;
  borderStyle: BorderStyle;
  borderColor?: string;
}

export type BorderStyle = 'single' | 'double' | 'rounded' | 'bold' | 'dashed' | 'dotted';

export interface ChartOptions {
  width: number;
  height: number;
  title?: string;
  showLabels: boolean;
  showLegend: boolean;
  colors: string[];
  maxValue?: number;
}

export interface StatusIndicator {
  status: 'running' | 'stopped' | 'error' | 'warning' | 'pending' | 'unknown';
  label?: string;
  details?: string;
  animated?: boolean;
}

export interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: {
    inbound: number;
    outbound: number;
  };
  uptime: number;
  processes: number;
}

export interface AgentStatus {
  id: string;
  name: string;
  type: string;
  status: StatusIndicator['status'];
  lastActivity: Date;
  tasksCompleted: number;
  tasksInProgress: number;
  errors: number;
  resources: {
    cpu: number;
    memory: number;
  };
}

export interface TaskInfo {
  id: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedAgent?: string;
  progress: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration?: number;
}

export interface SwarmTopology {
  agents: AgentNode[];
  connections: AgentConnection[];
  consensus?: {
    algorithm: string;
    status: string;
    participants: string[];
  };
}

export interface AgentNode {
  id: string;
  name: string;
  type: 'queen' | 'worker' | 'specialist';
  role: string;
  status: StatusIndicator['status'];
  capabilities: string[];
  load: number;
  position?: {
    x: number;
    y: number;
  };
}

export interface AgentConnection {
  from: string;
  to: string;
  type: 'communication' | 'dependency' | 'coordination';
  strength: number;
  status: 'active' | 'inactive';
}

export interface CommandOutput {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  timestamp: Date;
}

export interface TerminalEvent {
  type: 'command' | 'output' | 'status' | 'error' | 'progress';
  timestamp: Date;
  data: any;
}

export interface InteractivePrompt {
  message: string;
  type: 'input' | 'confirm' | 'select' | 'multiselect';
  options?: string[];
  default?: any;
  validate?: (value: any) => boolean | string;
}

export interface TerminalView {
  id: string;
  title: string;
  type: 'dashboard' | 'logs' | 'agents' | 'tasks' | 'metrics' | 'topology';
  config: any;
  autoRefresh: boolean;
  refreshInterval?: number;
}

export interface DashboardLayout {
  views: TerminalView[];
  layout: 'grid' | 'tabs' | 'split';
  activeView: string;
}

export interface NotificationOptions {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void | Promise<void>;
}

export interface FilterOptions {
  search?: string;
  status?: string[];
  type?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  customFilters?: Record<string, any>;
}

export interface TerminalSession {
  id: string;
  startTime: Date;
  commands: CommandOutput[];
  currentDirectory: string;
  environment: Record<string, string>;
  history: string[];
  bookmarks: string[];
}
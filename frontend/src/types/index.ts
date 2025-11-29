// Re-export backend types and add frontend-specific types
export * from '../../types';

// Frontend-specific types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  requestId?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: string;
  id?: string;
}

export interface DashboardMetrics {
  agents: {
    total: number;
    active: number;
    idle: number;
    failed: number;
  };
  tasks: {
    pending: number;
    running: number;
    completed: number;
    failed: number;
    totalPerSecond: number;
  };
  system: {
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    errorRate: number;
  };
  performance: {
    averageResponseTime: number;
    successRate: number;
    throughput: number;
  };
}

export interface AgentFormData {
  name: string;
  type: 'queen' | 'worker' | 'specialist';
  role: {
    type: 'strategic' | 'tactical' | 'operational' | 'analytical' | 'creative';
    permissions: string[];
    expertise: string[];
    priority: number;
  };
  provider: {
    type: 'qwen' | 'openai' | 'claude' | 'local' | 'custom';
    model: string;
    maxTokens: number;
    temperature: number;
    timeout: number;
    endpoint?: string;
    apiKey?: string;
  };
  capabilities: AgentCapability[];
  maxConcurrency: number;
  memorySize: number;
  autoScale: boolean;
}

export interface TaskFormData {
  type: string;
  priority: TaskPriority;
  payload: any;
  dependencies: string[];
  assignedAgent?: string;
  metadata: Record<string, unknown>;
}

export interface WorkflowNode {
  id: string;
  type: 'agent' | 'task' | 'condition' | 'trigger' | 'action';
  position: { x: number; y: number };
  data: any;
  connections: Connection[];
}

export interface Connection {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type: 'default' | 'success' | 'failure' | 'conditional';
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  connections: Connection[];
  variables: Record<string, any>;
  settings: {
    autoStart: boolean;
    retryPolicy: RetryPolicy;
    timeout: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ChartDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface TimeSeriesData {
  metric: string;
  dataPoints: ChartDataPoint[];
  unit: string;
  color: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'operator' | 'viewer';
  permissions: string[];
  lastLogin: Date;
  isActive: boolean;
}

export interface Theme {
  mode: 'light' | 'dark' | 'system';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
  };
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  slack: boolean;
  webhook: boolean;
  thresholds: {
    errorRate: number;
    responseTime: number;
    queueSize: number;
  };
}

export interface SystemSettings {
  general: {
    name: string;
    description: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
  };
  api: {
    port: number;
    host: string;
    cors: boolean;
    rateLimit: boolean;
  };
  websocket: {
    port: number;
    path: string;
    enabled: boolean;
  };
  security: {
    authEnabled: boolean;
    allowedOrigins: string[];
    sessionTimeout: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
    rotation: boolean;
  };
}

// UI Component Props
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export interface InputProps extends BaseComponentProps {
  type?: string;
  placeholder?: string;
  value?: string | number;
  onChange?: (value: string | number) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  description?: string;
}

// React Query and State Management
export interface QueryOptions {
  enabled?: boolean;
  retry?: number;
  retryDelay?: number;
  staleTime?: number;
  cacheTime?: number;
  refetchInterval?: number;
}

export interface StoreState {
  user: User | null;
  theme: Theme;
  notifications: NotificationSettings;
  sidebarOpen: boolean;
  loading: boolean;
  error: string | null;
}
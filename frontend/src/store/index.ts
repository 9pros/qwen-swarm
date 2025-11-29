import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { AgentState, Task, SystemMetrics, DashboardMetrics, User, Theme, WebSocketMessage } from '@/types';

interface AppState {
  // User and authentication
  user: User | null;
  isAuthenticated: boolean;

  // UI state
  theme: Theme;
  sidebarOpen: boolean;
  loading: boolean;
  error: string | null;

  // Data state
  agents: AgentState[];
  tasks: Task[];
  systemMetrics: SystemMetrics | null;
  dashboardMetrics: DashboardMetrics | null;

  // WebSocket connection state
  isWebSocketConnected: boolean;
  lastWebSocketUpdate: string | null;

  // Pagination and filtering
  agentsPage: number;
  agentsPageSize: number;
  agentsTotal: number;
  tasksPage: number;
  tasksPageSize: number;
  tasksTotal: number;

  // Selected items
  selectedAgent: AgentState | null;
  selectedTask: Task | null;

  // Search and filters
  agentsSearch: string;
  tasksSearch: string;
  agentStatusFilter: string[];
  taskStatusFilter: string[];
  taskPriorityFilter: string[];
}

interface AppActions {
  // Authentication actions
  login: (user: User) => void;
  logout: () => void;

  // UI actions
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Data actions
  setAgents: (agents: AgentState[]) => void;
  addAgent: (agent: AgentState) => void;
  updateAgent: (id: string, updates: Partial<AgentState>) => void;
  removeAgent: (id: string) => void;

  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;

  setSystemMetrics: (metrics: SystemMetrics) => void;
  setDashboardMetrics: (metrics: DashboardMetrics) => void;

  // WebSocket actions
  setWebSocketConnected: (connected: boolean) => void;
  handleWebSocketMessage: (message: WebSocketMessage) => void;

  // Pagination actions
  setAgentsPagination: (page: number, pageSize: number, total: number) => void;
  setTasksPagination: (page: number, pageSize: number, total: number) => void;

  // Selection actions
  selectAgent: (agent: AgentState | null) => void;
  selectTask: (task: Task | null) => void;

  // Search and filter actions
  setAgentsSearch: (search: string) => void;
  setTasksSearch: (search: string) => void;
  setAgentStatusFilter: (filter: string[]) => void;
  setTaskStatusFilter: (filter: string[]) => void;
  setTaskPriorityFilter: (filter: string[]) => void;

  // Reset actions
  resetState: () => void;
}

const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  theme: {
    mode: 'system',
    colors: {
      primary: '#3b82f6',
      secondary: '#6b7280',
      accent: '#10b981',
      background: '#ffffff',
      surface: '#f9fafb',
      text: '#111827',
    },
  },
  sidebarOpen: true,
  loading: false,
  error: null,
  agents: [],
  tasks: [],
  systemMetrics: null,
  dashboardMetrics: null,
  isWebSocketConnected: false,
  lastWebSocketUpdate: null,
  agentsPage: 1,
  agentsPageSize: 20,
  agentsTotal: 0,
  tasksPage: 1,
  tasksPageSize: 20,
  tasksTotal: 0,
  selectedAgent: null,
  selectedTask: null,
  agentsSearch: '',
  tasksSearch: '',
  agentStatusFilter: [],
  taskStatusFilter: [],
  taskPriorityFilter: [],
};

export const useAppStore = create<AppState & AppActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Authentication actions
        login: (user) => set({ user, isAuthenticated: true }),
        logout: () => set({ user: null, isAuthenticated: false }),

        // UI actions
        setTheme: (theme) => set({ theme }),
        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
        setLoading: (loading) => set({ loading }),
        setError: (error) => set({ error }),

        // Data actions
        setAgents: (agents) => set({ agents }),
        addAgent: (agent) => set((state) => ({
          agents: [...state.agents, agent],
          agentsTotal: state.agentsTotal + 1
        })),
        updateAgent: (id, updates) => set((state) => ({
          agents: state.agents.map(agent =>
            agent.id === id ? { ...agent, ...updates } : agent
          ),
          selectedAgent: state.selectedAgent?.id === id
            ? { ...state.selectedAgent, ...updates }
            : state.selectedAgent
        })),
        removeAgent: (id) => set((state) => ({
          agents: state.agents.filter(agent => agent.id !== id),
          selectedAgent: state.selectedAgent?.id === id ? null : state.selectedAgent,
          agentsTotal: Math.max(0, state.agentsTotal - 1)
        })),

        setTasks: (tasks) => set({ tasks }),
        addTask: (task) => set((state) => ({
          tasks: [...state.tasks, task],
          tasksTotal: state.tasksTotal + 1
        })),
        updateTask: (id, updates) => set((state) => ({
          tasks: state.tasks.map(task =>
            task.id === id ? { ...task, ...updates } : task
          ),
          selectedTask: state.selectedTask?.id === id
            ? { ...state.selectedTask, ...updates }
            : state.selectedTask
        })),
        removeTask: (id) => set((state) => ({
          tasks: state.tasks.filter(task => task.id !== id),
          selectedTask: state.selectedTask?.id === id ? null : state.selectedTask,
          tasksTotal: Math.max(0, state.tasksTotal - 1)
        })),

        setSystemMetrics: (metrics) => set({ systemMetrics: metrics }),
        setDashboardMetrics: (metrics) => set({ dashboardMetrics: metrics }),

        // WebSocket actions
        setWebSocketConnected: (connected) => set({ isWebSocketConnected: connected }),
        handleWebSocketMessage: (message) => {
          const state = get();
          switch (message.type) {
            case 'agent_status_update':
              const agentUpdate = message.payload;
              if (state.agents.some(agent => agent.id === agentUpdate.id)) {
                state.updateAgent(agentUpdate.id, agentUpdate);
              }
              break;

            case 'task_update':
              const taskUpdate = message.payload;
              if (state.tasks.some(task => task.id === taskUpdate.id)) {
                state.updateTask(taskUpdate.id, taskUpdate);
              } else {
                state.addTask(taskUpdate);
              }
              break;

            case 'system_metrics':
              state.setSystemMetrics(message.payload);
              state.setDashboardMetrics(message.payload.dashboardMetrics);
              break;

            default:
              console.log('Unhandled WebSocket message:', message);
          }

          set({ lastWebSocketUpdate: new Date().toISOString() });
        },

        // Pagination actions
        setAgentsPagination: (page, pageSize, total) => set({
          agentsPage: page,
          agentsPageSize: pageSize,
          agentsTotal: total,
        }),
        setTasksPagination: (page, pageSize, total) => set({
          tasksPage: page,
          tasksPageSize: pageSize,
          tasksTotal: total,
        }),

        // Selection actions
        selectAgent: (agent) => set({ selectedAgent: agent }),
        selectTask: (task) => set({ selectedTask: task }),

        // Search and filter actions
        setAgentsSearch: (search) => set({ agentsSearch: search }),
        setTasksSearch: (search) => set({ tasksSearch: search }),
        setAgentStatusFilter: (filter) => set({ agentStatusFilter: filter }),
        setTaskStatusFilter: (filter) => set({ taskStatusFilter: filter }),
        setTaskPriorityFilter: (filter) => set({ taskPriorityFilter: filter }),

        // Reset actions
        resetState: () => set(initialState),
      }),
      {
        name: 'qwen-swarm-store',
        partialize: (state) => ({
          theme: state.theme,
          sidebarOpen: state.sidebarOpen,
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    {
      name: 'Qwen Swarm Store',
    }
  )
);

// Selectors for optimized performance
export const useAgents = () => useAppStore((state) => state.agents);
export const useTasks = () => useAppStore((state) => state.tasks);
export const useSelectedAgent = () => useAppStore((state) => state.selectedAgent);
export const useSelectedTask = () => useAppStore((state) => state.selectedTask);
export const useSystemMetrics = () => useAppStore((state) => state.systemMetrics);
export const useDashboardMetrics = () => useAppStore((state) => state.dashboardMetrics);
export const useWebSocketConnected = () => useAppStore((state) => state.isWebSocketConnected);
export const useLoading = () => useAppStore((state) => state.loading);
export const useError = () => useAppStore((state) => state.error);
export const useTheme = () => useAppStore((state) => state.theme);

// Computed selectors
export const useFilteredAgents = () => {
  const agents = useAgents();
  const search = useAppStore((state) => state.agentsSearch);
  const statusFilter = useAppStore((state) => state.agentStatusFilter);

  return agents.filter((agent) => {
    const matchesSearch = agent.id.toLowerCase().includes(search.toLowerCase()) ||
                         agent.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(agent.status);
    return matchesSearch && matchesStatus;
  });
};

export const useFilteredTasks = () => {
  const tasks = useTasks();
  const search = useAppStore((state) => state.tasksSearch);
  const statusFilter = useAppStore((state) => state.taskStatusFilter);
  const priorityFilter = useAppStore((state) => state.taskPriorityFilter);

  return tasks.filter((task) => {
    const matchesSearch = task.id.toLowerCase().includes(search.toLowerCase()) ||
                         task.type.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(task.status);
    const matchesPriority = priorityFilter.length === 0 || priorityFilter.includes(task.priority.toString());
    return matchesSearch && matchesStatus && matchesPriority;
  });
};

export default useAppStore;
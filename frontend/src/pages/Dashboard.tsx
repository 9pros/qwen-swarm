import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  CpuChipIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  FireIcon,
  ChartBarIcon,
  ServerIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import { apiService } from '@/services/api';
import { useDashboardMetrics, useAgents, useTasks } from '@/store';
import MetricCard from '@/components/Dashboard/MetricCard';
import SystemHealthChart from '@/components/Dashboard/SystemHealthChart';
import AgentActivityChart from '@/components/Dashboard/AgentActivityChart';
import TaskQueueChart from '@/components/Dashboard/TaskQueueChart';
import RecentActivity from '@/components/Dashboard/RecentActivity';
import QuickActions from '@/components/Dashboard/QuickActions';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Dashboard: React.FC = () => {
  const dashboardMetrics = useDashboardMetrics();
  const agents = useAgents();
  const tasks = useTasks();

  // Fetch latest data
  const { data: systemHealth, isLoading: healthLoading } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => apiService.getSystemHealth(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { data: systemMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['system-metrics'],
    queryFn: () => apiService.getSystemMetrics(),
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // Calculate metrics if not in store
  const calculateMetrics = () => {
    if (dashboardMetrics) return dashboardMetrics;

    const activeAgents = agents.filter(agent => agent.status === 'busy').length;
    const idleAgents = agents.filter(agent => agent.status === 'idle').length;
    const failedAgents = agents.filter(agent => agent.status === 'failed').length;

    const pendingTasks = tasks.filter(task => task.status === 'pending').length;
    const runningTasks = tasks.filter(task => task.status === 'running').length;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    const failedTasks = tasks.filter(task => task.status === 'failed').length;

    return {
      agents: {
        total: agents.length,
        active: activeAgents,
        idle: idleAgents,
        failed: failedAgents,
      },
      tasks: {
        pending: pendingTasks,
        running: runningTasks,
        completed: completedTasks,
        failed: failedTasks,
        totalPerSecond: systemMetrics?.data?.system?.tasksPerSecond || 0,
      },
      system: {
        uptime: systemMetrics?.data?.process?.uptime || 0,
        memoryUsage: systemMetrics?.data?.process?.memoryUsage?.heapUsed || 0,
        cpuUsage: 0, // Would need more complex calculation
        errorRate: 0, // Would need error tracking
      },
      performance: {
        averageResponseTime: systemMetrics?.data?.system?.averageResponseTime || 0,
        successRate: tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 100,
        throughput: systemMetrics?.data?.system?.tasksPerSecond || 0,
      },
    };
  };

  const metrics = calculateMetrics();

  // Sample chart data (would be replaced with real data)
  const performanceData = [
    { name: '00:00', value: 45 },
    { name: '04:00', value: 52 },
    { name: '08:00', value: 78 },
    { name: '12:00', value: 85 },
    { name: '16:00', value: 72 },
    { name: '20:00', value: 65 },
    { name: 'Now', value: metrics.performance.throughput },
  ];

  const agentStatusData = [
    { name: 'Active', value: metrics.agents.active, color: '#10b981' },
    { name: 'Idle', value: metrics.agents.idle, color: '#6b7280' },
    { name: 'Failed', value: metrics.agents.failed, color: '#ef4444' },
  ];

  const taskStatusData = [
    { name: 'Pending', value: metrics.tasks.pending, color: '#f59e0b' },
    { name: 'Running', value: metrics.tasks.running, color: '#3b82f6' },
    { name: 'Completed', value: metrics.tasks.completed, color: '#10b981' },
    { name: 'Failed', value: metrics.tasks.failed, color: '#ef4444' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Real-time overview of your swarm system
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Metric Cards */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <MetricCard
          title="Total Agents"
          value={metrics.agents.total}
          icon={CpuChipIcon}
          change={{
            value: metrics.agents.active,
            type: 'increase',
            label: 'Active agents'
          }}
          link="/agents"
          color="primary"
        />

        <MetricCard
          title="Tasks Queue"
          value={metrics.tasks.pending + metrics.tasks.running}
          icon={ClipboardDocumentListIcon}
          change={{
            value: metrics.tasks.totalPerSecond,
            type: metrics.tasks.totalPerSecond > 0 ? 'increase' : 'neutral',
            label: 'Tasks/sec'
          }}
          link="/tasks"
          color="warning"
        />

        <MetricCard
          title="Success Rate"
          value={`${metrics.performance.successRate.toFixed(1)}%`}
          icon={CheckCircleIcon}
          change={{
            value: metrics.tasks.completed,
            type: 'increase',
            label: 'Completed tasks'
          }}
          color="success"
        />

        <MetricCard
          title="System Uptime"
          value={`${Math.floor(metrics.system.uptime / 3600)}h`}
          icon={ClockIcon}
          change={{
            value: 'Healthy',
            type: 'increase',
            label: 'System status'
          }}
          color="primary"
        />
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Chart */}
        <motion.div variants={itemVariants} className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Performance Overview
            </h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  dark
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Agent Status Distribution */}
        <motion.div variants={itemVariants} className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Agent Status Distribution
            </h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={agentStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {agentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 flex justify-center space-x-6">
              {agentStatusData.map((entry) => (
                <div key={entry.name} className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  ></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {entry.name}: {entry.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Status Chart */}
        <motion.div variants={itemVariants} className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Task Status
            </h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={taskStatusData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  stroke="#9ca3af"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="#9ca3af"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {taskStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* System Health */}
        <motion.div variants={itemVariants} className="card">
          <SystemHealthChart data={systemHealth?.data} loading={healthLoading} />
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={itemVariants} className="card lg:col-span-1">
          <RecentActivity />
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
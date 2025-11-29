import React, { useState, useEffect } from 'react';
import { useAgents, useTasks } from '@/store';
import { AgentStatus, TaskStatus } from '@/types';
import {
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  PlayIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface ActivityItem {
  id: string;
  type: 'agent' | 'task' | 'system';
  title: string;
  description: string;
  timestamp: Date;
  status: 'success' | 'warning' | 'error' | 'info';
  icon: React.ComponentType<any>;
}

const RecentActivity: React.FC = () => {
  const agents = useAgents();
  const tasks = useTasks();
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    // Generate recent activities from agent and task data
    const generateActivities = (): ActivityItem[] => {
      const activities: ActivityItem[] = [];

      // Agent activities
      agents.forEach((agent) => {
        if (agent.lastActivity) {
          let status: 'success' | 'warning' | 'error' | 'info' = 'info';
          let icon = PlayIcon;
          let title = '';
          let description = '';

          switch (agent.status) {
            case AgentStatus.BUSY:
              status = 'info';
              icon = PlayIcon;
              title = `Agent ${agent.name} is active`;
              description = `Processing ${agent.currentTasks.length} tasks`;
              break;
            case AgentStatus.FAILED:
              status = 'error';
              icon = XCircleIcon;
              title = `Agent ${agent.name} failed`;
              description = `Failed ${agent.failedTasks} tasks`;
              break;
            case AgentStatus.IDLE:
              status = 'success';
              icon = CheckCircleIcon;
              title = `Agent ${agent.name} is idle`;
              description = `Completed ${agent.completedTasks} tasks`;
              break;
            case AgentStatus.SUSPENDED:
              status = 'warning';
              icon = ExclamationTriangleIcon;
              title = `Agent ${agent.name} suspended`;
              description = 'Agent temporarily suspended';
              break;
          }

          activities.push({
            id: `agent-${agent.id}`,
            type: 'agent',
            title,
            description,
            timestamp: agent.lastActivity,
            status,
            icon,
          });
        }
      });

      // Task activities
      tasks.forEach((task) => {
        let status: 'success' | 'warning' | 'error' | 'info' = 'info';
        let icon = ClockIcon;
        let title = '';
        let description = '';

        switch (task.status) {
          case TaskStatus.RUNNING:
            status = 'info';
            icon = PlayIcon;
            title = `Task ${task.type} started`;
            description = `Assigned to agent ${task.assignedAgent || 'unknown'}`;
            break;
          case TaskStatus.COMPLETED:
            status = 'success';
            icon = CheckCircleIcon;
            title = `Task ${task.type} completed`;
            description = `Successfully executed by agent ${task.assignedAgent || 'unknown'}`;
            break;
          case TaskStatus.FAILED:
            status = 'error';
            icon = XCircleIcon;
            title = `Task ${task.type} failed`;
            description = task.error?.message || 'Task execution failed';
            break;
          case TaskStatus.RETRYING:
            status = 'warning';
            icon = ClockIcon;
            title = `Task ${task.type} retrying`;
            description = `Retry attempt ${task.retryCount + 1}`;
            break;
        }

        activities.push({
          id: `task-${task.id}`,
          type: 'task',
          title,
          description,
          timestamp: task.updatedAt || task.createdAt,
          status,
          icon,
        });
      });

      // Sort by timestamp (most recent first) and limit to 10
      return activities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10);
    };

    setActivities(generateActivities());
  }, [agents, tasks]);

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return 'just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return `${Math.floor(diffSeconds / 86400)}d ago`;
  };

  const getStatusColor = (status: 'success' | 'warning' | 'error' | 'info') => {
    switch (status) {
      case 'success':
        return 'text-success-600 bg-success-100 dark:text-success-400 dark:bg-success-900';
      case 'warning':
        return 'text-warning-600 bg-warning-100 dark:text-warning-400 dark:bg-warning-900';
      case 'error':
        return 'text-error-600 bg-error-100 dark:text-error-400 dark:bg-error-900';
      case 'info':
        return 'text-primary-600 bg-primary-100 dark:text-primary-400 dark:bg-primary-900';
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700';
    }
  };

  return (
    <>
      <div className="card-header">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Recent Activity
        </h3>
      </div>
      <div className="card-body">
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {activities.length > 0 ? (
            activities.map((activity) => {
              const Icon = activity.icon;
              return (
                <div
                  key={activity.id}
                  className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className={`p-2 rounded-lg ${getStatusColor(activity.status)}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {activity.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {formatTimeAgo(activity.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No recent activity
              </p>
            </div>
          )}
        </div>

        {activities.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
            <button className="w-full text-center text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
              View all activity
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default RecentActivity;
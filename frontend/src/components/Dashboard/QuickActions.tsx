import React from 'react';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  PlayIcon,
  PauseIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';

const QuickActions: React.FC = () => {
  const actions = [
    {
      title: 'Create Agent',
      description: 'Add a new AI agent to your swarm',
      icon: PlusIcon,
      link: '/agents/new',
      color: 'primary',
    },
    {
      title: 'Create Task',
      description: 'Create and assign a new task',
      icon: PlusIcon,
      link: '/tasks/new',
      color: 'success',
    },
    {
      title: 'Start All Agents',
      description: 'Activate all idle agents',
      icon: PlayIcon,
      action: 'start-agents',
      color: 'success',
    },
    {
      title: 'Pause All Agents',
      description: 'Pause all running agents',
      icon: PauseIcon,
      action: 'pause-agents',
      color: 'warning',
    },
    {
      title: 'Restart System',
      description: 'Restart the swarm system',
      icon: ArrowPathIcon,
      action: 'restart-system',
      color: 'error',
    },
    {
      title: 'Export Report',
      description: 'Download system performance report',
      icon: DocumentArrowDownIcon,
      action: 'export-report',
      color: 'gray',
    },
  ];

  const handleAction = (action: string) => {
    switch (action) {
      case 'start-agents':
        // Implement start all agents
        console.log('Starting all agents...');
        break;
      case 'pause-agents':
        // Implement pause all agents
        console.log('Pausing all agents...');
        break;
      case 'restart-system':
        // Implement system restart
        console.log('Restarting system...');
        break;
      case 'export-report':
        // Implement report export
        console.log('Exporting report...');
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'primary':
        return 'bg-primary-100 text-primary-700 hover:bg-primary-200 dark:bg-primary-900 dark:text-primary-300 dark:hover:bg-primary-800';
      case 'success':
        return 'bg-success-100 text-success-700 hover:bg-success-200 dark:bg-success-900 dark:text-success-300 dark:hover:bg-success-800';
      case 'warning':
        return 'bg-warning-100 text-warning-700 hover:bg-warning-200 dark:bg-warning-900 dark:text-warning-300 dark:hover:bg-warning-800';
      case 'error':
        return 'bg-error-100 text-error-700 hover:bg-error-200 dark:bg-error-900 dark:text-error-300 dark:hover:bg-error-800';
      case 'gray':
        return 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600';
      default:
        return 'bg-primary-100 text-primary-700 hover:bg-primary-200 dark:bg-primary-900 dark:text-primary-300 dark:hover:bg-primary-800';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Quick Actions
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {actions.map((action) => {
          const Icon = action.icon;
          const content = (
            <div className={`p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all duration-200 ${getColorClasses(action.color)}`}>
              <Icon className="w-6 h-6 mb-2" />
              <h3 className="font-medium text-sm mb-1">
                {action.title}
              </h3>
              <p className="text-xs opacity-90">
                {action.description}
              </p>
            </div>
          );

          if (action.link) {
            return (
              <Link key={action.title} to={action.link} className="block">
                {content}
              </Link>
            );
          }

          return (
            <button
              key={action.title}
              onClick={() => handleAction(action.action!)}
              className="block w-full text-left"
            >
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActions;
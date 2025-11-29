import React from 'react';
import { useWebSocketConnected, useAppStore } from '@/store';
import {
  SignalIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const WebSocketStatus: React.FC = () => {
  const isConnected = useWebSocketConnected();
  const { lastWebSocketUpdate } = useAppStore();

  const getStatusColor = () => {
    if (isConnected) return 'text-success-600 dark:text-success-400';
    return 'text-error-600 dark:text-error-400';
  };

  const getStatusBgColor = () => {
    if (isConnected) return 'bg-success-100 dark:bg-success-900';
    return 'bg-error-100 dark:bg-error-900';
  };

  const getStatusText = () => {
    if (isConnected) return 'Connected';
    return 'Disconnected';
  };

  const getStatusIcon = () => {
    if (isConnected) return <CheckCircleIcon className="w-4 h-4" />;
    return <ExclamationTriangleIcon className="w-4 h-4" />;
  };

  const formatLastUpdate = (timestamp: string | null) => {
    if (!timestamp) return 'Never';

    const date = new Date(timestamp);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  // Only show on dashboard or if disconnected
  const shouldShow = !isConnected || window.location.pathname === '/';

  if (!shouldShow) return null;

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center space-x-2">
            <SignalIcon className={`w-4 h-4 ${getStatusColor()}`} />
            <span className={`text-sm font-medium ${getStatusColor()}`}>
              Real-time Connection: {getStatusText()}
            </span>
            {lastWebSocketUpdate && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Last update: {formatLastUpdate(lastWebSocketUpdate)}
              </span>
            )}
          </div>

          {!isConnected && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Attempting to reconnect...
              </span>
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebSocketStatus;
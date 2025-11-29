import React from 'react';
import { SystemHealth } from '@/types';
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface SystemHealthChartProps {
  data?: SystemHealth;
  loading?: boolean;
}

const SystemHealthChart: React.FC<SystemHealthChartProps> = ({
  data,
  loading = false,
}) => {
  const getHealthStatus = () => {
    if (loading) return { status: 'loading', color: 'gray', icon: null, text: 'Loading...' };
    if (!data) return { status: 'unknown', color: 'gray', icon: ExclamationTriangleIcon, text: 'Unknown' };

    switch (data.overall) {
      case 'healthy':
        return { status: 'healthy', color: 'success', icon: CheckCircleIcon, text: 'Healthy' };
      case 'degraded':
        return { status: 'degraded', color: 'warning', icon: ExclamationTriangleIcon, text: 'Degraded' };
      case 'unhealthy':
      case 'critical':
        return { status: 'unhealthy', color: 'error', icon: XCircleIcon, text: 'Unhealthy' };
      default:
        return { status: 'unknown', color: 'gray', icon: ExclamationTriangleIcon, text: 'Unknown' };
    }
  };

  const healthStatus = getHealthStatus();
  const Icon = healthStatus.icon;

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'success':
        return 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300';
      case 'warning':
        return 'bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-300';
      case 'error':
        return 'bg-error-100 text-error-700 dark:bg-error-900 dark:text-error-300';
      case 'gray':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="card-body">
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card-header">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          System Health
        </h3>
      </div>
      <div className="card-body">
        <div className="flex items-center justify-between mb-4">
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${getColorClasses(healthStatus.color)}`}>
            {Icon && <Icon className="w-4 h-4" />}
            <span className="text-sm font-medium">
              {healthStatus.text}
            </span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Last check: {data?.lastAssessment ? new Date(data.lastAssessment).toLocaleTimeString() : 'Never'}
          </span>
        </div>

        {data?.components && data.components.length > 0 && (
          <div className="space-y-3">
            {data.components.slice(0, 4).map((component) => {
              const componentStatus = component.status === 'healthy' ? 'success' :
                                     component.status === 'degraded' ? 'warning' :
                                     component.status === 'unhealthy' || component.status === 'critical' ? 'error' : 'gray';

              return (
                <div key={component.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full bg-${componentStatus}-500`}></div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {component.name}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {component.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {data?.alerts && data.alerts.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Active Alerts
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                data.alerts.some(alert => alert.severity === 'critical' || alert.severity === 'error')
                  ? 'bg-error-100 text-error-700 dark:bg-error-900 dark:text-error-300'
                  : 'bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-300'
              }`}>
                {data.alerts.length}
              </span>
            </div>
            <div className="space-y-1">
              {data.alerts.slice(0, 2).map((alert) => (
                <div key={alert.id} className="text-xs text-gray-600 dark:text-gray-400">
                  <span className="font-medium">{alert.component}:</span> {alert.message}
                </div>
              ))}
              {data.alerts.length > 2 && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  +{data.alerts.length - 2} more alerts
                </div>
              )}
            </div>
          </div>
        )}

        {!data && (
          <div className="text-center py-8">
            <ExclamationTriangleIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No health data available
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default SystemHealthChart;
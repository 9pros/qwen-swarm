import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  change?: {
    value: number | string;
    type: 'increase' | 'decrease' | 'neutral';
    label: string;
  };
  link?: string;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'gray';
  className?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon: Icon,
  change,
  link,
  color = 'primary',
  className = '',
}) => {
  const getColorClasses = () => {
    switch (color) {
      case 'primary':
        return 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400';
      case 'success':
        return 'bg-success-100 text-success-600 dark:bg-success-900 dark:text-success-400';
      case 'warning':
        return 'bg-warning-100 text-warning-600 dark:bg-warning-900 dark:text-warning-400';
      case 'error':
        return 'bg-error-100 text-error-600 dark:bg-error-900 dark:text-error-400';
      case 'gray':
        return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
      default:
        return 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400';
    }
  };

  const getChangeIcon = () => {
    if (change?.type === 'increase') {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      );
    } else if (change?.type === 'decrease') {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      );
    }
    return null;
  };

  const getChangeColorClasses = () => {
    if (change?.type === 'increase') {
      return 'text-success-600 dark:text-success-400';
    } else if (change?.type === 'decrease') {
      return 'text-error-600 dark:text-error-400';
    }
    return 'text-gray-600 dark:text-gray-400';
  };

  const cardContent = (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`metric-card cursor-pointer ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`p-3 rounded-lg ${getColorClasses()}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {title}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {value}
            </p>
          </div>
        </div>

        {change && (
          <div className="flex flex-col items-end">
            <div className={`flex items-center space-x-1 ${getChangeColorClasses()}`}>
              {getChangeIcon()}
              <span className="text-sm font-medium">
                {change.value}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {change.label}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );

  if (link) {
    return (
      <Link to={link} className="block">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
};

export default MetricCard;
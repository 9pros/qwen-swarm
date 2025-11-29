import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  CpuChipIcon,
  ClipboardDocumentListIcon,
  ServerIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  UserGroupIcon,
  PlusIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useAppStore } from '@/store';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  current?: boolean;
  badge?: string | number;
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  {
    name: 'Agents',
    href: '/agents',
    icon: CpuChipIcon,
  },
  {
    name: 'Tasks',
    href: '/tasks',
    icon: ClipboardDocumentListIcon,
  },
  {
    name: 'Providers',
    href: '/providers',
    icon: ServerIcon,
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: ChartBarIcon,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Cog6ToothIcon,
  },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { sidebarOpen, toggleSidebar } = useAppStore();

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="sidebar flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <CpuChipIcon className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="ml-3">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Qwen Swarm
            </h1>
          </div>
        </div>
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 dark:hover:bg-gray-700"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `sidebar-item ${
                isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'
              }`
            }
            end={item.href === '/'}
          >
            <item.icon className="mr-3 h-5 w-5" />
            {item.name}
            {item.badge && (
              <span className="ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}

        {/* Quick Actions */}
        <div className="pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="px-3 mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
              Quick Actions
            </p>
          </div>

          <NavLink
            to="/agents/new"
            className="sidebar-item sidebar-item-inactive"
          >
            <PlusIcon className="mr-3 h-5 w-5" />
            New Agent
          </NavLink>

          <NavLink
            to="/tasks/new"
            className="sidebar-item sidebar-item-inactive"
          >
            <PlusIcon className="mr-3 h-5 w-5" />
            New Task
          </NavLink>

          <button
            onClick={() => window.location.reload()}
            className="w-full sidebar-item sidebar-item-inactive text-left"
          >
            <ArrowPathIcon className="mr-3 h-5 w-5" />
            Refresh
          </button>
        </div>
      </nav>

      {/* System Status */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
              System Online
            </span>
          </div>
          <button
            onClick={() => window.open('/system/health', '_blank')}
            className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            View Status
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
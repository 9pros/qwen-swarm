import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAppStore } from '@/store';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import WebSocketStatus from '@/components/WebSocketStatus';

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar />
      </div>

      {/* Main content */}
      <div className={`flex flex-col flex-1 lg:pl-0 ${sidebarOpen ? 'lg:ml-64' : ''}`}>
        {/* Header */}
        <Header />

        {/* WebSocket status indicator */}
        <WebSocketStatus />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children || <Outlet />}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
              <div>
                © 2024 Qwen Swarm. All rights reserved.
              </div>
              <div className="flex space-x-4">
                <a href="#" className="hover:text-gray-700 dark:hover:text-gray-300">
                  Documentation
                </a>
                <a href="#" className="hover:text-gray-700 dark:hover:text-gray-300">
                  Support
                </a>
                <a href="#" className="hover:text-gray-700 dark:hover:text-gray-300">
                  GitHub
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Layout;
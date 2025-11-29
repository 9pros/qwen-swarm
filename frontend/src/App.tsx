import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import { webSocketService } from '@/services/websocket';

// Layout components
import Layout from '@/components/Layout';

// Page components
import Dashboard from '@/pages/Dashboard';
import Agents from '@/pages/Agents';
import AgentDetail from '@/pages/AgentDetail';
import AgentBuilder from '@/pages/AgentBuilder';
import Tasks from '@/pages/Tasks';
import TaskDetail from '@/pages/TaskDetail';
import TaskBuilder from '@/pages/TaskBuilder';
import Providers from '@/pages/Providers';
import ProviderDetail from '@/pages/ProviderDetail';
import Analytics from '@/pages/Analytics';
import Settings from '@/pages/Settings';
import Login from '@/pages/Login';
import NotFound from '@/pages/NotFound';

// Protected route wrapper
import ProtectedRoute from '@/components/ProtectedRoute';

function App() {
  const { isAuthenticated, setWebSocketConnected, handleWebSocketMessage } = useAppStore();

  useEffect(() => {
    // Initialize WebSocket connection if authenticated
    if (isAuthenticated) {
      webSocketService.connect()
        .then(() => {
          setWebSocketConnected(true);

          // Subscribe to system metrics and updates
          webSocketService.subscribeToSystemMetrics();
          webSocketService.subscribe('agent_status_update', handleWebSocketMessage);
          webSocketService.subscribe('task_update', handleWebSocketMessage);
          webSocketService.subscribe('system_metrics', handleWebSocketMessage);
        })
        .catch((error) => {
          console.error('Failed to connect WebSocket:', error);
          setWebSocketConnected(false);
        });

      // Cleanup on unmount
      return () => {
        webSocketService.unsubscribeFromSystemMetrics();
        webSocketService.disconnect();
      };
    }
  }, [isAuthenticated, setWebSocketConnected, handleWebSocketMessage]);

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Main application routes
  return (
    <Layout>
      <Routes>
        {/* Dashboard */}
        <Route path="/" element={<Dashboard />} />

        {/* Agents */}
        <Route path="/agents" element={<Agents />} />
        <Route path="/agents/:id" element={<AgentDetail />} />
        <Route path="/agents/new" element={<AgentBuilder />} />
        <Route path="/agents/:id/edit" element={<AgentBuilder />} />

        {/* Tasks */}
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/tasks/:id" element={<TaskDetail />} />
        <Route path="/tasks/new" element={<TaskBuilder />} />
        <Route path="/tasks/:id/edit" element={<TaskBuilder />} />

        {/* Providers */}
        <Route path="/providers" element={<Providers />} />
        <Route path="/providers/:id" element={<ProviderDetail />} />

        {/* Analytics */}
        <Route path="/analytics" element={<Analytics />} />

        {/* Settings */}
        <Route path="/settings" element={<Settings />} />

        {/* 404 */}
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
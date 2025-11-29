import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TaskQueueChartProps {
  data?: any[];
  loading?: boolean;
}

const TaskQueueChart: React.FC<TaskQueueChartProps> = ({
  data,
  loading = false,
}) => {
  // Sample data - would be replaced with real task queue data
  const sampleData = [
    { priority: 'Critical', count: 2, color: '#ef4444' },
    { priority: 'High', count: 5, color: '#f59e0b' },
    { priority: 'Normal', count: 12, color: '#3b82f6' },
    { priority: 'Low', count: 8, color: '#10b981' },
  ];

  const chartData = data || sampleData;

  if (loading) {
    return (
      <div className="card-body">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis
          dataKey="priority"
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
        />
        <Bar
          dataKey="count"
          fill="#3b82f6"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default TaskQueueChart;
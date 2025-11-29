import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AgentActivityChartProps {
  data?: any[];
  loading?: boolean;
}

const AgentActivityChart: React.FC<AgentActivityChartProps> = ({
  data,
  loading = false,
}) => {
  // Sample data - would be replaced with real agent activity data
  const sampleData = [
    { time: '00:00', active: 2, idle: 8, total: 10 },
    { time: '04:00', active: 3, idle: 7, total: 10 },
    { time: '08:00', active: 7, idle: 3, total: 10 },
    { time: '12:00', active: 9, idle: 1, total: 10 },
    { time: '16:00', active: 6, idle: 4, total: 10 },
    { time: '20:00', active: 4, idle: 6, total: 10 },
    { time: 'Now', active: 5, idle: 5, total: 10 },
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
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis
          dataKey="time"
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
        <Line
          type="monotone"
          dataKey="active"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ fill: '#10b981', r: 4 }}
          activeDot={{ r: 6 }}
          name="Active Agents"
        />
        <Line
          type="monotone"
          dataKey="idle"
          stroke="#6b7280"
          strokeWidth={2}
          dot={{ fill: '#6b7280', r: 4 }}
          activeDot={{ r: 6 }}
          name="Idle Agents"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default AgentActivityChart;
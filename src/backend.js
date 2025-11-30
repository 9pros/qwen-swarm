// Qwen Swarm Backend - JavaScript Version
import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load configuration
config({ path: join(__dirname, '../.env') });

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, '../../frontend/dist')));

// Basic routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    version: '2.1.0',
    agents: 12,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

app.get('/api/agents', (req, res) => {
  res.json({
    agents: [
      { id: 1, name: 'Queen Agent', type: 'queen', status: 'active' },
      { id: 2, name: 'Worker Agent 1', type: 'worker', status: 'active' },
      { id: 3, name: 'Worker Agent 2', type: 'worker', status: 'idle' }
    ]
  });
});

// WebSocket handling
wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');

  ws.on('message', (message) => {
    console.log('Received:', message.toString());
  });

  // Send periodic status updates
  const interval = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'status',
        data: {
          timestamp: Date.now(),
          status: 'running',
          agents: 12
        }
      }));
    }
  }, 5000);

  ws.on('close', () => {
    clearInterval(interval);
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Qwen Swarm backend running on port ${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api`);
  console.log(`🌐 WebSocket: ws://localhost:${PORT}`);
});

export default app;
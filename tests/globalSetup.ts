import { MongoMemoryServer } from 'mongodb-memory-server';
import { execSync } from 'child_process';
import path from 'path';

let mongoServer: MongoMemoryServer;

module.exports = async () => {
  console.log('🚀 Setting up global test environment...');

  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create({
    instance: {
      dbName: 'hive-mind-test',
    },
  });

  const mongoUri = mongoServer.getUri();
  process.env.MONGODB_URI = mongoUri;
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key';
  process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars';

  // Create test databases
  console.log('📊 Creating test databases...');

  try {
    // Initialize test database schema
    execSync(`node -e "
      const { MongoClient } = require('mongodb');
      const client = new MongoClient('${mongoUri}');

      async function setup() {
        await client.connect();
        const db = client.db('hive-mind-test');

        // Create collections with indexes
        await db.createCollection('agents');
        await db.collection('agents').createIndex({ id: 1 }, { unique: true });
        await db.collection('agents').createIndex({ type: 1 });
        await db.collection('agents').createIndex({ status: 1 });

        await db.createCollection('tasks');
        await db.collection('tasks').createIndex({ id: 1 }, { unique: true });
        await db.collection('tasks').createIndex({ status: 1 });
        await db.collection('tasks').createIndex({ priority: 1 });
        await db.collection('tasks').createIndex({ assignedAgentId: 1 });

        await db.createCollection('memory');
        await db.collection('memory').createIndex({ sessionId: 1 });
        await db.collection('memory').createIndex({ timestamp: 1 });
        await db.collection('memory').createIndex({ type: 1 });

        await db.createCollection('sessions');
        await db.collection('sessions').createIndex({ sessionId: 1 }, { unique: true });
        await db.collection('sessions').createIndex({ agentId: 1 });

        await db.createCollection('metrics');
        await db.collection('metrics').createIndex({ timestamp: 1 });
        await db.collection('metrics').createIndex({ agentId: 1 });

        console.log('✅ Test database setup complete');
        await client.close();
      }

      setup().catch(console.error);
    "`, { cwd: path.resolve(__dirname, '..') });
  } catch (error) {
    console.error('❌ Failed to setup test database:', error);
    throw error;
  }

  // Set test environment variables
  process.env.SWARM_CONFIG = JSON.stringify({
    maxWorkers: 4,
    consensusAlgorithm: 'majority',
    memorySize: 50,
    autoScale: false,
    encryption: true,
    mcpTools: {
      enabled: true,
      parallel: true,
      timeout: 30000
    }
  });

  console.log('✅ Global test environment ready');

  // Store mongod instance for cleanup
  (global as any).__MONGOD__ = mongoServer;
};
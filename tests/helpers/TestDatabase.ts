import { MongoClient, Db, Collection } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';

export class TestDatabase {
  private static instance: TestDatabase;
  private mongoServer: MongoMemoryServer | null = null;
  private client: MongoClient | null = null;
  private db: Db | null = null;

  private constructor() {}

  static getInstance(): TestDatabase {
    if (!TestDatabase.instance) {
      TestDatabase.instance = new TestDatabase();
    }
    return TestDatabase.instance;
  }

  async start(): Promise<void> {
    if (this.mongoServer) {
      return;
    }

    this.mongoServer = await MongoMemoryServer.create({
      instance: {
        dbName: 'hive-mind-test',
      },
    });

    const uri = this.mongoServer.getUri();
    this.client = new MongoClient(uri);
    await this.client.connect();
    this.db = this.client.db('hive-mind-test');

    await this.setupCollections();
  }

  async stop(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    if (this.mongoServer) {
      await this.mongoServer.stop();
      this.mongoServer = null;
    }
    this.db = null;
  }

  async clear(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const collections = await this.db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }

  async reset(): Promise<void> {
    await this.clear();
    await this.setupCollections();
  }

  getDatabase(): Db {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  getCollection<T = any>(name: string): Collection<T> {
    return this.getDatabase().collection<T>(name);
  }

  getUri(): string {
    if (!this.mongoServer) {
      throw new Error('MongoDB server not started');
    }
    return this.mongoServer.getUri();
  }

  private async setupCollections(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Agents collection
    const agents = this.db.collection('agents');
    await agents.createIndex({ id: 1 }, { unique: true });
    await agents.createIndex({ type: 1 });
    await agents.createIndex({ status: 1 });
    await agents.createIndex({ 'metadata.healthScore': 1 });

    // Tasks collection
    const tasks = this.db.collection('tasks');
    await tasks.createIndex({ id: 1 }, { unique: true });
    await tasks.createIndex({ status: 1 });
    await tasks.createIndex({ priority: 1 });
    await tasks.createIndex({ assignedAgentId: 1 });
    await tasks.createIndex({ type: 1 });
    await tasks.createIndex({ createdAt: 1 });

    // Memory collection
    const memory = this.db.collection('memory');
    await memory.createIndex({ sessionId: 1 });
    await memory.createIndex({ timestamp: 1 });
    await memory.createIndex({ type: 1 });

    // Sessions collection
    const sessions = this.db.collection('sessions');
    await sessions.createIndex({ sessionId: 1 }, { unique: true });
    await sessions.createIndex({ agentId: 1 });
    await sessions.createIndex({ createdAt: 1 });

    // Metrics collection
    const metrics = this.db.collection('metrics');
    await metrics.createIndex({ timestamp: 1 });
    await metrics.createIndex({ agentId: 1 });
    await metrics.createIndex({ type: 1 });

    // Consensus collection
    const consensus = this.db.collection('consensus');
    await consensus.createIndex({ proposalId: 1 }, { unique: true });
    await consensus.createIndex({ status: 1 });
    await consensus.createIndex({ createdAt: 1 });

    // Events collection
    const events = this.db.collection('events');
    await events.createIndex({ timestamp: 1 });
    await events.createIndex({ type: 1 });
    await events.createIndex({ source: 1 });
  }

  async insertTestData<T>(collectionName: string, data: T[]): Promise<void> {
    const collection = this.getCollection<T>(collectionName);
    if (data.length > 0) {
      await collection.insertMany(data);
    }
  }

  async findDocuments<T>(collectionName: string, filter: any = {}): Promise<T[]> {
    const collection = this.getCollection<T>(collectionName);
    return await collection.find(filter).toArray();
  }

  async countDocuments(collectionName: string, filter: any = {}): Promise<number> {
    const collection = this.getCollection(collectionName);
    return await collection.countDocuments(filter);
  }

  async dropCollection(collectionName: string): Promise<void> {
    const collection = this.getCollection(collectionName);
    await collection.drop();
  }

  async getStats(): Promise<any> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return await this.db.stats();
  }
}

export const testDb = TestDatabase.getInstance();
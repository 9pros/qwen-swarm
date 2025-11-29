import { HiveMindSwarm } from '../../src/HiveMindSwarm';
import { AgentFactory } from '../factories/AgentFactory';
import { TaskFactory } from '../factories/TaskFactory';
import { testDb } from '../helpers/TestDatabase';
import request from 'supertest';
import express from 'express';

describe('Security Vulnerability Testing', () => {
  let swarm: HiveMindSwarm;
  let app: express.Application;
  let agents: any[];

  beforeAll(async () => {
    await testDb.start();
  });

  afterAll(async () => {
    await testDb.stop();
  });

  beforeEach(async () => {
    await testDb.reset();
    swarm = new HiveMindSwarm({
      database: testDb.getDatabase(),
      securityEnabled: true,
      encryptionEnabled: true,
      authenticationRequired: true
    });

    agents = AgentFactory.createSwarm(1, 5, 2);

    await swarm.initialize();
    await swarm.addAgents(agents);

    // Setup Express app for API security testing
    app = express();
    app.use(express.json());
    swarm.setupAPIRoutes(app);
  });

  afterEach(async () => {
    if (swarm) {
      await swarm.shutdown();
    }
  });

  describe('Authentication & Authorization', () => {
    it('should reject requests without valid authentication', async () => {
      const response = await request(app)
        .get('/api/swarm/status')
        .expect(401);

      expect(response.body.error).toContain('Unauthorized');
      expect(response.body.code).toBe('AUTH_REQUIRED');
    });

    it('should reject requests with invalid tokens', async () => {
      const response = await request(app)
        .get('/api/swarm/status')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toContain('Invalid token');
    });

    it('should enforce role-based access control', async () => {
      // Create worker token (limited permissions)
      const workerToken = await swarm.generateToken({
        agentId: agents[1].id, // Worker agent
        role: 'worker',
        permissions: ['task_execute', 'status_update']
      });

      // Worker should not be able to access admin endpoints
      const response = await request(app)
        .post('/api/swarm/shutdown')
        .set('Authorization', `Bearer ${workerToken}`)
        .expect(403);

      expect(response.body.error).toContain('Insufficient permissions');
      expect(response.body.requiredRole).toContain('admin');
    });

    it('should handle token expiration gracefully', async () => {
      // Create expired token
      const expiredToken = await swarm.generateToken({
        agentId: agents[0].id,
        role: 'admin',
        expiresIn: -1 // Already expired
      });

      const response = await request(app)
        .get('/api/swarm/status')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.error).toContain('Token expired');
    });

    it('should prevent privilege escalation attacks', async () => {
      const workerToken = await swarm.generateToken({
        agentId: agents[1].id,
        role: 'worker',
        permissions: ['task_execute']
      });

      // Attempt to escalate privileges
      const escalationPayload = {
        role: 'admin',
        permissions: ['all'],
        agentId: agents[0].id // Queen agent
      };

      const response = await request(app)
        .post('/api/auth/escalate')
        .set('Authorization', `Bearer ${workerToken}`)
        .send(escalationPayload)
        .expect(403);

      expect(response.body.error).toContain('Privilege escalation not allowed');
    });
  });

  describe('Input Validation & Sanitization', () => {
    it('should prevent SQL injection in agent data', async () => {
      const maliciousPayload = {
        name: "'; DROP TABLE agents; --",
        type: 'worker',
        configuration: {
          "maxConcurrentTasks": "1; DELETE FROM tasks; --"
        }
      };

      const adminToken = await swarm.generateAdminToken();

      const response = await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(maliciousPayload)
        .expect(400);

      expect(response.body.error).toContain('Invalid input');

      // Verify database integrity
      const agentCount = await testDb.countDocuments('agents');
      expect(agentCount).toBeGreaterThan(0);
    });

    it('should prevent NoSQL injection in MongoDB queries', async () => {
      const maliciousQuery = {
        "id": { "$ne": null },
        "type": { "$regex": "^worker" },
        "configuration": { "$where": "function() { return true; }" }
      };

      const adminToken = await swarm.generateAdminToken();

      const response = await request(app)
        .post('/api/agents/query')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ filter: maliciousQuery })
        .expect(400);

      expect(response.body.error).toContain('Invalid query parameters');

      // Query should not execute malicious operations
      const operations = await testDb.getDatabase().collection('audit').find({
        type: 'malicious_query_attempt'
      }).toArray();

      expect(operations.length).toBeGreaterThan(0);
    });

    it('should sanitize XSS attempts in task payloads', async () => {
      const xssPayload = TaskFactory.create({
        title: '<script>alert("XSS")</script>',
        description: '"><img src=x onerror=alert("XSS")>',
        payload: {
          code: '<script>document.location="http://evil.com"</script>',
          config: 'constructor.prototype.polluted = true'
        }
      });

      const adminToken = await swarm.generateAdminToken();

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(xssPayload)
        .expect(400);

      expect(response.body.error).toContain('Invalid input');

      // Verify no script execution
      expect({}.polluted).toBeUndefined();
    });

    it('should prevent command injection in task execution', async () => {
      const commandInjectionPayload = {
        type: 'file_operation',
        payload: {
          command: 'ls; rm -rf /; echo "pwned"',
          filename: '`whoami`',
          path: '../../etc/passwd'
        }
      };

      const adminToken = await swarm.generateAdminToken();

      const response = await request(app)
        .post('/api/tasks/execute')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(commandInjectionPayload)
        .expect(400);

      expect(response.body.error).toContain('Command injection detected');

      // Verify system integrity
      const systemHealth = await swarm.getSystemHealth();
      expect(systemHealth.compromised).toBe(false);
    });

    it('should validate and sanitize API parameters', async () => {
      const maliciousParams = [
        'id[]=1&id[]=2', // Array injection
        'limit=999999',  // Resource exhaustion
        'offset=-1',     // Negative offset
        'sort=($^)',     // Invalid sort
        'fields={}'      // Object injection
      ];

      const adminToken = await swarm.generateAdminToken();

      for (const params of maliciousParams) {
        const response = await request(app)
          .get(`/api/agents?${params}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(400);

        expect(response.body.error).toContain('Invalid parameters');
      }
    });
  });

  describe('Data Encryption & Protection', () => {
    it('should encrypt sensitive data at rest', async () => {
      const sensitiveAgentData = {
        id: 'secret-agent',
        type: 'worker',
        credentials: {
          apiKey: 'sk-1234567890abcdef',
          secret: 'super-secret-key',
          tokens: ['token1', 'token2']
        }
      };

      await swarm.addAgent(sensitiveAgentData);

      // Check raw database storage
      const rawAgent = await testDb.findDocuments('agents', { id: 'secret-agent' });
      expect(rawAgent).toHaveLength(1);

      const storedData = rawAgent[0];
      expect(storedData.credentials.apiKey).not.toBe('sk-1234567890abcdef');
      expect(storedData.credentials.secret).not.toBe('super-secret-key');

      // Verify data can be decrypted by authorized users
      const adminToken = await swarm.generateAdminToken();
      const response = await request(app)
        .get('/api/agents/secret-agent')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.credentials.apiKey).toBe('sk-1234567890abcdef');
      expect(response.body.credentials.secret).toBe('super-secret-key');
    });

    it('should encrypt data in transit', async () => {
      const wsUrl = swarm.getWebSocketUrl();

      // Verify WebSocket uses secure protocol
      expect(wsUrl).toMatch(/^wss:\/\//);

      // Test encrypted message transmission
      const sensitiveMessage = {
        type: 'task_assignment',
        data: {
          credentials: { api_key: 'secret-key' },
          payload: { sensitive_data: 'confidential' }
        }
      };

      const encryptionResult = await swarm.encryptMessage(sensitiveMessage);
      expect(encryptionResult.encrypted).toBe(true);
      expect(encryptionResult.data).not.toContain('secret-key');
      expect(encryptionResult.iv).toBeDefined();
      expect(encryptionResult.tag).toBeDefined();
    });

    it('should protect against data leakage in logs', async () => {
      const sensitiveTask = TaskFactory.create({
        title: 'Secret Processing Task',
        payload: {
          credentials: { password: 'secret123' },
          secrets: { key: 'confidential-data' }
        }
      });

      await swarm.addTask(sensitiveTask);

      // Check logs for sensitive information
      const logs = await swarm.getSystemLogs();
      const logData = logs.map(log => log.message).join(' ');

      expect(logData).not.toContain('secret123');
      expect(logData).not.toContain('confidential-data');
      expect(logData).not.toContain('Secret Processing Task'); // Should be masked
    });

    it('should implement proper key management', async () => {
      const keyInfo = await swarm.getEncryptionKeyInfo();

      expect(keyInfo.keyId).toBeDefined();
      expect(keyInfo.algorithm).toContain('aes');
      expect(keyInfo.keyLength).toBe(256);

      // Test key rotation
      const oldKeyId = keyInfo.keyId;
      await swarm.rotateEncryptionKey();

      const newKeyInfo = await swarm.getEncryptionKeyInfo();
      expect(newKeyInfo.keyId).not.toBe(oldKeyId);

      // Old data should still be decryptable
      const oldAgents = await swarm.getAllAgents();
      expect(oldAgents.length).toBeGreaterThan(0);
    });
  });

  describe('Access Control & Permissions', () => {
    it('should enforce least privilege principle', async () => {
      // Create agent with minimal permissions
      const workerToken = await swarm.generateToken({
        agentId: agents[1].id,
        role: 'worker',
        permissions: ['task_execute']
      });

      const restrictedOperations = [
        { method: 'GET', path: '/api/agents' },
        { method: 'POST', path: '/api/agents' },
        { method: 'DELETE', path: `/api/agents/${agents[0].id}` },
        { method: 'POST', path: '/api/swarm/shutdown' },
        { method: 'POST', path: '/api/auth/tokens' }
      ];

      for (const operation of restrictedOperations) {
        const response = await request(app)[operation.method.toLowerCase()](operation.path)
          .set('Authorization', `Bearer ${workerToken}`)
          .expect(403);

        expect(response.body.error).toContain('Insufficient permissions');
      }
    });

    it('should prevent horizontal privilege escalation', async () => {
      const worker1Token = await swarm.generateToken({
        agentId: agents[1].id,
        role: 'worker',
        permissions: ['task_execute', 'own_task_view']
      });

      // Worker 1 should not access worker 2's tasks
      const response = await request(app)
        .get(`/api/agents/${agents[2].id}/tasks`)
        .set('Authorization', `Bearer ${worker1Token}`)
        .expect(403);

      expect(response.body.error).toContain('Access denied');
    });

    it('should implement resource-based access control', async () => {
      const adminToken = await swarm.generateAdminToken();

      // Create resource with specific owner
      const task = TaskFactory.create({
        ownerAgentId: agents[1].id,
        accessControl: {
          read: ['agent-1', 'agent-2'],
          write: ['agent-1'],
          execute: ['agent-1', 'agent-3']
        }
      });

      await swarm.addTask(task);

      // Test access permissions
      const agent1Token = await swarm.generateToken({ agentId: agents[1].id, role: 'worker' });
      const agent2Token = await swarm.generateToken({ agentId: agents[2].id, role: 'worker' });
      const agent4Token = await swarm.generateToken({ agentId: agents[4].id, role: 'worker' });

      // Agent 1 should have full access (owner)
      await request(app)
        .get(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${agent1Token}`)
        .expect(200);

      // Agent 2 should have read access only
      await request(app)
        .get(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${agent2Token}`)
        .expect(200);

      await request(app)
        .put(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${agent2Token}`)
        .expect(403);

      // Agent 4 should have no access
      await request(app)
        .get(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${agent4Token}`)
        .expect(403);
    });
  });

  describe('Rate Limiting & DoS Protection', () => {
    it('should implement rate limiting on API endpoints', async () => {
      const adminToken = await swarm.generateAdminToken();

      // Make rapid requests
      const requests = Array.from({ length: 100 }, () =>
        request(app)
          .get('/api/swarm/status')
          .set('Authorization', `Bearer ${adminToken}`)
      );

      const results = await Promise.allSettled(requests);

      // Some requests should be rate limited
      const rejectedRequests = results.filter(result =>
        result.status === 'rejected' ||
        (result.status === 'fulfilled' && result.value.status === 429)
      );

      expect(rejectedRequests.length).toBeGreaterThan(0);
    });

    it('should prevent resource exhaustion attacks', async () => {
      const adminToken = await swarm.generateAdminToken();

      // Attempt to create large number of resources
      const largePayload = {
        agents: Array.from({ length: 10000 }, (_, i) => ({
          id: `agent-${i}`,
          type: 'worker',
          configuration: {
            maxConcurrentTasks: 100,
            resourceLimits: { memory: 1024 * 1024, cpu: 100 }
          }
        }))
      };

      const response = await request(app)
        .post('/api/agents/batch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(largePayload)
        .expect(400);

      expect(response.body.error).toContain('Resource limit exceeded');
    });

    it('should handle WebSocket connection flooding', async () => {
      const connectionPromises = Array.from({ length: 1000 }, () =>
        swarm.createWebSocketConnection()
      );

      const results = await Promise.allSettled(connectionPromises);

      // Should limit concurrent connections
      const successfulConnections = results.filter(
        result => result.status === 'fulfilled'
      );

      expect(successfulConnections.length).toBeLessThan(1000);
    });
  });

  describe('Security Audit & Monitoring', () => {
    it('should log all security-relevant events', async () => {
      const adminToken = await swarm.generateAdminToken();

      // Perform security-relevant actions
      await request(app)
        .get('/api/swarm/status')
        .set('Authorization', `Bearer ${adminToken}`);

      await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(AgentFactory.createWorker());

      await request(app)
        .get('/api/agents/nonexistent')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      const auditLogs = await swarm.getSecurityAuditLogs();

      expect(auditLogs.some(log => log.event === 'authentication_success')).toBe(true);
      expect(auditLogs.some(log => log.event === 'agent_created')).toBe(true);
      expect(auditLogs.some(log => log.event === 'resource_access_denied')).toBe(true);

      // Verify logs contain necessary information
      auditLogs.forEach(log => {
        expect(log.timestamp).toBeDefined();
        expect(log.agentId).toBeDefined();
        expect(log.action).toBeDefined();
        expect(log.ipAddress).toBeDefined();
      });
    });

    it('should detect and alert on suspicious activities', async () => {
      const workerToken = await swarm.generateToken({
        agentId: agents[1].id,
        role: 'worker',
        permissions: ['task_execute']
      });

      // Perform suspicious activities
      const suspiciousActions = [
        () => request(app).get('/api/agents').set('Authorization', `Bearer ${workerToken}`),
        () => request(app).post('/api/swarm/shutdown').set('Authorization', `Bearer ${workerToken}`),
        () => request(app).get('/api/auth/tokens').set('Authorization', `Bearer ${workerToken}`)
      ];

      await Promise.allSettled(suspiciousActions.map(action => action()));

      const securityAlerts = await swarm.getSecurityAlerts();

      expect(securityAlerts.length).toBeGreaterThan(0);
      expect(securityAlerts.some(alert => alert.type === 'privilege_escalation_attempt')).toBe(true);
      expect(securityAlerts.some(alert => alert.severity === 'high')).toBe(true);
    });

    it('should perform regular security scans', async () => {
      const securityScan = await swarm.performSecurityScan();

      expect(securityScan.scanCompleted).toBe(true);
      expect(securityScan.vulnerabilitiesFound).toBeDefined();
      expect(securityScan.securityScore).toBeGreaterThan(0);
      expect(securityScan.recommendations).toBeDefined();

      // Check for common vulnerabilities
      const vulnerabilities = securityScan.vulnerabilitiesFound;
      expect(vulnerabilities.length).toBeGreaterThanOrEqual(0);

      // Should not have critical vulnerabilities in test environment
      const criticalVulns = vulnerabilities.filter(v => v.severity === 'critical');
      expect(criticalVulns.length).toBe(0);
    });
  });

  describe('Secure Configuration', () => {
    it('should use secure defaults', async () => {
      const config = await swarm.getSecurityConfiguration();

      expect(config.encryptionEnabled).toBe(true);
      expect(config.authenticationRequired).toBe(true);
      expect(config.rateLimitingEnabled).toBe(true);
      expect(config.auditLoggingEnabled).toBe(true);

      expect(config.sessionTimeout).toBeLessThan(3600000); // Less than 1 hour
      expect(config.maxLoginAttempts).toBeLessThan(10);
      expect(config.passwordMinLength).toBeGreaterThan(8);
    });

    it('should validate SSL/TLS configuration', async () => {
      const sslConfig = await swarm.getSSLConfiguration();

      expect(sslConfig.enabled).toBe(true);
      expect(sslConfig.minVersion).toContain('TLSv1.2');
      expect(sslConfig.cipherSuites.length).toBeGreaterThan(0);

      // Should not allow weak ciphers
      const weakCiphers = sslConfig.cipherSuites.filter(cipher =>
        cipher.includes('RC4') || cipher.includes('DES') || cipher.includes('MD5')
      );
      expect(weakCiphers.length).toBe(0);
    });

    it('should implement secure headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-xss-protection']).toBeDefined();
      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['content-security-policy']).toBeDefined();
    });
  });
});
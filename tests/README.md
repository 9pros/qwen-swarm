# 🧪 Comprehensive Testing Suite for qwen-swarm CLI

A state-of-the-art testing framework designed specifically for validating AGI-enhanced CLI capabilities, swarm intelligence, and distributed coordination systems.

## 🎯 Overview

This comprehensive test suite provides multi-layered validation of the qwen-swarm CLI system, ensuring AGI-level quality through systematic testing across all dimensions of functionality, performance, and user experience.

## 🏗️ Test Architecture

### Testing Pyramid

```
         /\
        /E2E\      <- User workflows, GUI testing, full swarm orchestration (5%)
       /------\
      /Integr. \   <- Agent communication, MCP tools, database interactions (25%)
     /----------\
    /   Unit     \ <- Component logic, algorithms, data structures (70%)
   /--------------\
```

### Test Categories

1. **Unit Tests** (`tests/unit/`)
   - Component-level testing
   - Algorithm validation
   - Data structure operations
   - Individual agent logic

2. **Integration Tests** (`tests/integration/`)
   - Agent-to-agent communication
   - MCP tool integration
   - Database operations
   - Memory coordination

3. **End-to-End Tests** (`tests/e2e/`)
   - Complete user workflows
   - GUI functionality
   - System orchestration
   - Real-world scenarios

4. **Performance Tests** (`tests/performance/`)
   - Load testing
   - Scalability validation
   - Resource usage monitoring
   - Benchmarking

5. **Chaos Tests** (`tests/chaos/`)
   - Failure simulation
   - Self-healing validation
   - Fault tolerance
   - Resilience testing

6. **Security Tests** (`tests/security/`)
   - Vulnerability scanning
   - Penetration testing
   - Access control validation
   - Data protection testing

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e          # End-to-end tests only
npm run test:performance  # Performance tests only
npm run test:chaos        # Chaos engineering tests
npm run test:security     # Security tests only

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch

# Run tests in CI mode
npm run test:ci
```

### Test Environment Setup

```bash
# Setup test database
npm run db:test:setup

# Run tests with database
npm run test:integration

# Cleanup test database
npm run db:test:teardown
```

## 📁 Test Structure

```
tests/
├── unit/                    # Unit tests
│   ├── agents/             # Agent component tests
│   ├── core/               # Core system tests
│   └── utils/              # Utility function tests
├── integration/            # Integration tests
│   ├── AgentCommunication.test.ts
│   └── MCPIntegration.test.ts
├── e2e/                    # End-to-end tests
│   ├── SwarmGUI.test.ts
│   └── UserWorkflows.test.ts
├── performance/           # Performance tests
│   ├── LoadTesting.test.ts
│   └── Scalability.test.ts
├── chaos/                 # Chaos engineering tests
│   ├── AgentFailureSimulation.test.ts
│   └── NetworkPartition.test.ts
├── security/              # Security tests
│   ├── SecurityVulnerabilities.test.ts
│   └── PenetrationTesting.test.ts
├── helpers/               # Test utilities
│   ├── TestDatabase.ts
│   └── TestUtils.ts
├── factories/             # Test data factories
│   ├── AgentFactory.ts
│   └── TaskFactory.ts
├── fixtures/              # Test fixtures
└── setup/                 # Test setup files
```

## 🏭 Test Factories

### AgentFactory

Create realistic test agents with various configurations:

```typescript
import { AgentFactory } from '../factories/AgentFactory';

// Create single agent
const agent = AgentFactory.createWorker({
  name: 'Test Worker',
  capabilities: ['data_processing', 'analysis']
});

// Create swarm
const swarm = AgentFactory.createSwarm(1, 5, 2); // 1 queen, 5 workers, 2 specialists

// Create failed agent for testing
const failedAgent = AgentFactory.createFailed();
```

### TaskFactory

Generate test tasks with realistic scenarios:

```typescript
import { TaskFactory } from '../factories/TaskFactory';

// Create single task
const task = TaskFactory.createDataProcessing({
  priority: 'high',
  payload: { inputFormat: 'json', outputFormat: 'csv' }
});

// Create task workflow
const workflow = TaskFactory.createWorkflow(5); // 5 dependent tasks

// Create many tasks
const tasks = TaskFactory.createMany(100);
```

## 🛠️ Test Utilities

### TestDatabase

Manage test database state:

```typescript
import { testDb } from '../helpers/TestDatabase';

// Setup test database
await testDb.start();

// Reset between tests
await testDb.reset();

// Insert test data
await testDb.insertTestData('agents', testAgents);

// Cleanup
await testDb.stop();
```

### TestUtils

Comprehensive testing utilities:

```typescript
import { TestUtils } from '../helpers/TestUtils';

// Performance measurement
const { result, duration } = await TestUtils.measureTime(
  () => swarm.processTasks(tasks),
  'Task Processing'
);

// Memory tracking
const memoryTracker = TestUtils.trackMemoryUsage('Test Operation');
// ... run operation
memoryTracker.stop();

// Chaos engineering
const failedAgents = await TestUtils.simulateRandomFailure(agents, 0.3);

// Load testing
const loadResults = await TestUtils.generateLoad(
  'http://localhost:3000/api/tasks',
  100, // concurrent users
  60000, // duration
  () => ({ type: 'test', data: 'payload' })
);
```

## 🎭 Mock Systems

### Memory Coordination Mocking

```typescript
import { mock, MockProxy } from 'jest-mock-extended';

const mockMemory: MockProxy<MemoryCoordination> = mock();
mockMemory.store.mockResolvedValue({ id: 'test-memory' });
mockMemory.retrieve.mockResolvedValue(testData);
```

### WebSocket Mocking

```typescript
const mockWebSocket = {
  send: jest.fn(),
  on: jest.fn(),
  close: jest.fn(),
  readyState: WebSocket.OPEN
} as any;
```

## 🔒 Security Testing

### Running Security Tests

```bash
# Run security vulnerability tests
npm run test:security

# Run penetration tests
npm run test:penetration

# Run security audit
npm run security:audit

# Run Snyk scan
npm run security:snyk
```

### Security Test Coverage

- **Authentication & Authorization**
  - Token validation
  - Role-based access control
  - Privilege escalation prevention

- **Input Validation**
  - SQL injection prevention
  - XSS protection
  - Command injection prevention

- **Data Protection**
  - Encryption at rest
  - Encryption in transit
  - Data leakage prevention

- **Access Control**
  - Least privilege principle
  - Resource-based permissions
  - Session management

## 🌪️ Chaos Engineering

### Running Chaos Tests

```bash
# Run chaos engineering tests
npm run test:chaos

# Run specific chaos scenarios
npm run chaos:simulate

# Run failure injection
npm run chaos:inject
```

### Chaos Scenarios

- **Agent Failure Simulation**
  - Random agent failures
  - Cascading failures
  - Resource exhaustion

- **Network Partition Testing**
  - Split-brain prevention
  - Partition recovery
  - Data consistency

- **Consensus Failure Scenarios**
  - Timeout handling
  - Divergence recovery
  - Fallback strategies

## 📊 Performance Testing

### Load Testing

```typescript
// Artillery configuration example
export const loadTestConfig = {
  config: {
    target: 'http://localhost:3000',
    phases: [
      { duration: 60, arrivalRate: 10 },
      { duration: 120, arrivalRate: 50 },
      { duration: 60, arrivalRate: 100 }
    ]
  },
  scenarios: [
    {
      name: 'Task Creation',
      weight: 40,
      flow: [
        { post: { url: '/api/tasks', json: { type: 'test', data: {} } } }
      ]
    }
  ]
};
```

### Benchmarking

```typescript
// Benchmark critical operations
const benchmarkResults = await TestUtils.benchmarkOperation(
  () => swarm.distributeTasks(testTasks),
  100 // iterations
);

console.log(`Average: ${benchmarkResults.averageDuration}ms`);
console.log(`Min: ${benchmarkResults.minDuration}ms`);
console.log(`Max: ${benchmarkResults.maxDuration}ms`);
```

## 🔧 Configuration

### Jest Configuration

The Jest configuration (`jest.config.js`) includes:

- Multiple test projects (unit, integration, performance, chaos, security)
- Coverage thresholds and reporting
- TypeScript support
- Custom reporters

### Playwright Configuration

The Playwright configuration (`playwright.config.ts`) includes:

- Multi-browser testing (Chrome, Firefox, Safari)
- Mobile viewport testing
- Screenshot and video capture
- Trace collection for debugging

## 📈 Coverage Reporting

### Coverage Thresholds

- **Global**: 90% statements, 85% branches, 90% functions, 90% lines
- **Core Modules**: 95% statements, 90% branches, 95% functions, 95% lines

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html

# Upload to Codecov
# (Automatic in CI)
```

## 🔄 Continuous Integration

### GitHub Actions Pipeline

The CI pipeline includes:

1. **Code Quality**
   - ESLint
   - TypeScript type checking
   - Prettier formatting

2. **Security Scanning**
   - npm audit
   - Snyk scan
   - CodeQL analysis

3. **Testing**
   - Unit tests (multiple Node.js versions)
   - Integration tests
   - E2E tests (multiple browsers)
   - Performance tests
   - Chaos engineering tests
   - Security tests

4. **Quality Gates**
   - Coverage thresholds
   - Security scan results
   - Performance benchmarks

### Quality Gates

Tests must pass all quality gates before merging:

- ✅ All tests pass
- ✅ Coverage thresholds met
- ✅ No security vulnerabilities
- ✅ Performance within benchmarks
- ✅ Code quality standards met

## 🐛 Debugging Tests

### Debugging Unit Tests

```bash
# Run tests in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand

# Debug specific test
npm run test:unit -- AgentFactory.test.ts --detectOpenHandles
```

### Debugging E2E Tests

```bash
# Run with Playwright Inspector
npm run test:e2e -- --debug

# Run with headed mode
npm run test:e2e -- --headed

# Generate trace files
npm run test:e2e -- --trace on
```

### Test Debugging Tips

1. **Use `--detectOpenHandles`** to detect resource leaks
2. **Use `--runInBand`** for tests with database dependencies
3. **Use `--verbose`** for detailed output
4. **Use `--testNamePattern`** to run specific tests
5. **Use Playwright Inspector** for E2E debugging

## 📝 Writing Tests

### Unit Test Example

```typescript
describe('AgentFactory', () => {
  it('should create valid worker agent', () => {
    const agent = AgentFactory.createWorker();

    TestUtils.assertValidAgent(agent);
    expect(agent.type).toBe('worker');
    expect(agent.capabilities).toContain('data_processing');
  });
});
```

### Integration Test Example

```typescript
describe('Agent Communication', () => {
  it('should distribute tasks to capable agents', async () => {
    const swarm = await createTestSwarm();
    const tasks = TaskFactory.createMany(10);

    const distribution = await swarm.distributeTasks(tasks);

    expect(distribution.distributed).toHaveLength(10);
    expect(distribution.undistributed).toHaveLength(0);
  });
});
```

### E2E Test Example

```typescript
test('should create agent via GUI', async ({ page }) => {
  await page.goto('/agents/create');

  await page.fill('[data-testid="agent-name"]', 'Test Agent');
  await page.selectOption('[data-testid="agent-type"]', 'worker');
  await page.click('[data-testid="create-agent"]');

  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
});
```

## 🎯 Best Practices

### Test Design

1. **Arrange-Act-Assert Pattern**
   ```typescript
   // Arrange
   const agent = AgentFactory.createWorker();
   const task = TaskFactory.create();

   // Act
   const result = await agent.processTask(task);

   // Assert
   expect(result.success).toBe(true);
   ```

2. **Use Test Factories**
   - Always use factories for test data
   - Keep factories realistic but simple
   - Override specific properties when needed

3. **Test Isolation**
   - Each test should be independent
   - Clean up after each test
   - Use fresh database for each test

4. **Descriptive Test Names**
   ```typescript
   it('should reassign tasks when agent fails', async () => {
     // Test implementation
   });
   ```

### Performance Considerations

1. **Use Mocks for External Dependencies**
2. **Limit Database Operations**
3. **Reuse Test Resources When Possible**
4. **Optimize Test Data Size**

### Security Considerations

1. **Never Use Production Secrets in Tests**
2. **Use Test-Specific Credentials**
3. **Validate All Input Sanitization**
4. **Test Authentication and Authorization**

## 🔮 Future Enhancements

- **Visual Regression Testing**
- **API Contract Testing**
- **Contract Testing with Consumers**
- **Mutation Testing**
- **Property-Based Testing**
- **Component Testing Framework**
- **Performance Regression Testing**
- **Security Monitoring in Production**

## 📚 Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/)
- [Chaos Engineering](https://principlesofchaos.org/)
- [Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [Performance Testing Best Practices](https://web.dev/performance/)

---

This comprehensive testing framework ensures the Hive Mind swarm system meets the highest standards of reliability, security, and performance. Regular execution of these tests maintains system quality and enables confident development and deployment.
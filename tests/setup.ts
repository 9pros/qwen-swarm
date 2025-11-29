import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
const originalConsole = global.console;

beforeAll(() => {
  // Suppress console.log in tests unless explicitly needed
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  // Set up global test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long';
});

afterAll(() => {
  // Restore original console
  global.console = originalConsole;
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();

  // Reset modules to ensure clean state
  jest.resetModules();
});

afterEach(() => {
  // Clean up any test-specific state
  if (global.gc) {
    global.gc();
  }
});

// Global test utilities
global.testUtils = {
  generateRandomString: (length: number = 10): string => {
    return Math.random().toString(36).substring(2, 2 + length);
  },

  generateUUID: (): string => {
    return 'test-' + Math.random().toString(36).substring(2) + '-' + Date.now();
  },

  waitFor: (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  createMockDate: (date?: Date): Date => {
    const mockDate = date || new Date('2024-01-01T00:00:00.000Z');
    jest.spyOn(Date, 'now').mockReturnValue(mockDate.getTime());
    return mockDate;
  },

  restoreMockDate: (): void => {
    jest.restoreAllMocks();
  }
};

// Error handling for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
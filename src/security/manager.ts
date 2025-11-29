import EventEmitter from 'eventemitter3';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { SecurityContext, SystemConfig } from '@/types';
import { Logger } from '@/utils/logger';

export interface SecurityEvents {
  'authentication:success': (userId: string, sessionId: string) => void;
  'authentication:failure': (userId: string, reason: string) => void;
  'authorization:granted': (userId: string, resource: string, action: string) => void;
  'authorization:denied': (userId: string, resource: string, action: string, reason: string) => void;
  'security:alert': (alertType: string, details: unknown) => void;
  'security:breach': (details: unknown) => void;
  'token:expired': (tokenId: string) => void;
  'session:created': (sessionId: string, userId: string) => void;
  'session:terminated': (sessionId: string, reason: string) => void;
}

export interface SecuritySession {
  id: string;
  userId: string;
  agentId?: string;
  permissions: string[];
  createdAt: Date;
  lastAccess: Date;
  expiresAt: Date;
  metadata: Record<string, unknown>;
}

export interface SecurityUser {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
  metadata: Record<string, unknown>;
}

export interface SecurityMetrics {
  totalSessions: number;
  activeSessions: number;
  authenticationAttempts: number;
  authenticationFailures: number;
  authorizationRequests: number;
  authorizationDenials: number;
  securityAlerts: number;
  lastSecurityEvent: Date;
}

export class SecurityManager extends EventEmitter<SecurityEvents> {
  private config: SecurityContext;
  private logger: Logger;
  private sessions: Map<string, SecuritySession> = new Map();
  private users: Map<string, SecurityUser> = new Map();
  private tokens: Map<string, { userId: string; sessionId: string; expiresAt: Date }> = new Map();
  private rateLimits: Map<string, { count: number; resetTime: Date }> = new Map();
  private metrics: SecurityMetrics;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private jwtSecret: string;

  constructor() {
    super();
    this.logger = new Logger().withContext({ component: 'SecurityManager' });
    this.metrics = this.initializeMetrics();
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret-key-change-in-production';
    this.config = {} as any;
  }

  public async initialize(config: SecurityContext): Promise<void> {
    this.config = config;
    this.logger.info('Initializing Security Manager', {
      authenticationRequired: config.authenticationRequired,
      encryptionEnabled: config.encryptionEnabled,
      auditEnabled: config.auditEnabled
    });

    this.startPeriodicCleanup();
    await this.createDefaultUsers();
  }

  public async authenticateUser(
    username: string,
    password: string,
    metadata: Record<string, unknown> = {}
  ): Promise<{ sessionId: string; token: string } | null> {
    try {
      const user = await this.findUserByUsername(username);
      if (!user || !user.isActive) {
        await this.recordAuthenticationFailure(username, 'user_not_found');
        return null;
      }

      if (await this.checkRateLimit(username)) {
        await this.recordAuthenticationFailure(username, 'rate_limit_exceeded');
        return null;
      }

      const isValidPassword = await this.verifyPassword(password, user.id);
      if (!isValidPassword) {
        await this.recordAuthenticationFailure(username, 'invalid_password');
        return null;
      }

      const sessionId = await this.createSession(user.id, metadata);
      const token = await this.generateToken(user.id, sessionId);

      user.lastLogin = new Date();
      this.users.set(user.id, user);

      await this.recordAuthenticationSuccess(user.id, sessionId);

      this.logger.info('User authenticated successfully', { userId: user.id, username, sessionId });
      return { sessionId, token };

    } catch (error) {
      this.logger.error('Authentication error', error instanceof Error ? error : new Error(String(error)), { username });
      return null;
    }
  }

  public async authenticateAgent(
    agentId: string,
    apiKey: string,
    metadata: Record<string, unknown> = {}
  ): Promise<{ sessionId: string; token: string } | null> {
    try {
      if (!this.validateAgentApiKey(agentId, apiKey)) {
        await this.recordAuthenticationFailure(agentId, 'invalid_api_key');
        return null;
      }

      const sessionId = await this.createSession(null, { ...metadata, agentId });
      const token = await this.generateToken(agentId, sessionId);

      await this.recordAuthenticationSuccess(agentId, sessionId);

      this.logger.info('Agent authenticated successfully', { agentId, sessionId });
      return { sessionId, token };

    } catch (error) {
      this.logger.error('Agent authentication error', error instanceof Error ? error : new Error(String(error)), { agentId });
      return null;
    }
  }

  public async validateToken(token: string): Promise<{ userId: string; sessionId: string } | null> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      const tokenInfo = this.tokens.get(decoded.jti);

      if (!tokenInfo || new Date() > tokenInfo.expiresAt) {
        this.emit('token:expired', decoded.jti);
        return null;
      }

      const session = this.sessions.get(tokenInfo.sessionId);
      if (!session || new Date() > session.expiresAt) {
        return null;
      }

      session.lastAccess = new Date();

      return {
        userId: tokenInfo.userId,
        sessionId: tokenInfo.sessionId
      };

    } catch (error) {
      this.logger.debug('Token validation failed', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  public async authorizeAccess(
    userId: string,
    resource: string,
    action: string,
    context: Record<string, unknown> = {}
  ): Promise<boolean> {
    try {
      const user = this.users.get(userId);
      if (!user) {
        await this.recordAuthorizationDenial(userId, resource, action, 'user_not_found');
        return false;
      }

      const isAuthorized = await this.checkPermissions(user, resource, action, context);

      if (isAuthorized) {
        await this.recordAuthorizationGranted(userId, resource, action);
      } else {
        await this.recordAuthorizationDenial(userId, resource, action, 'insufficient_permissions');
      }

      return isAuthorized;

    } catch (error) {
      this.logger.error('Authorization error', error instanceof Error ? error : new Error(String(error)), { userId, resource, action });
      return false;
    }
  }

  public async terminateSession(sessionId: string, reason: string = 'logout'): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.delete(sessionId);

      for (const [tokenId, tokenInfo] of this.tokens) {
        if (tokenInfo.sessionId === sessionId) {
          this.tokens.delete(tokenId);
        }
      }

      this.emit('session:terminated', sessionId, reason);
      this.logger.info('Session terminated', { sessionId, reason });
    }
  }

  public async createUser(userData: {
    username: string;
    email: string;
    password: string;
    roles?: string[];
    permissions?: string[];
  }): Promise<string> {
    const userId = this.generateUserId();
    const hashedPassword = await this.hashPassword(userData.password);

    const user: SecurityUser = {
      id: userId,
      username: userData.username,
      email: userData.email,
      roles: userData.roles || [],
      permissions: userData.permissions || [],
      isActive: true,
      createdAt: new Date(),
      metadata: {}
    };

    this.users.set(userId, user);

    this.logger.info('User created', { userId, username: userData.username });
    return userId;
  }

  public async updateUser(
    userId: string,
    updates: {
      email?: string;
      roles?: string[];
      permissions?: string[];
      isActive?: boolean;
    }
  ): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    if (updates.email) user.email = updates.email;
    if (updates.roles) user.roles = updates.roles;
    if (updates.permissions) user.permissions = updates.permissions;
    if (updates.isActive !== undefined) user.isActive = updates.isActive;

    this.users.set(userId, user);
    this.logger.info('User updated', { userId });
  }

  public async revokeToken(tokenId: string): Promise<void> {
    this.tokens.delete(tokenId);
    this.logger.info('Token revoked', { tokenId });
  }

  public getActiveSessionCount(): number {
    const now = new Date();
    let activeCount = 0;

    for (const session of this.sessions.values()) {
      if (now <= session.expiresAt) {
        activeCount++;
      }
    }

    return activeCount;
  }

  public getSession(sessionId: string): SecuritySession | undefined {
    return this.sessions.get(sessionId);
  }

  public getUser(userId: string): SecurityUser | undefined {
    return this.users.get(userId);
  }

  public getMetrics(): SecurityMetrics {
    this.metrics.totalSessions = this.sessions.size;
    this.metrics.activeSessions = this.getActiveSessionCount();
    return { ...this.metrics };
  }

  private async findUserByUsername(username: string): Promise<SecurityUser | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  private async verifyPassword(password: string, userId: string): Promise<boolean> {
    const storedHash = await this.getStoredPasswordHash(userId);
    if (!storedHash) return false;

    return bcrypt.compare(password, storedHash);
  }

  private async getStoredPasswordHash(userId: string): Promise<string | null> {
    return null;
  }

  private validateAgentApiKey(agentId: string, apiKey: string): boolean {
    return apiKey === `agent_${agentId}_key`;
  }

  private async createSession(userId: string | null, metadata: Record<string, unknown>): Promise<string> {
    const sessionId = this.generateSessionId();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const session: SecuritySession = {
      id: sessionId,
      userId: userId || '',
      agentId: metadata.agentId as string,
      permissions: [],
      createdAt: new Date(),
      lastAccess: new Date(),
      expiresAt,
      metadata
    };

    this.sessions.set(sessionId, session);
    this.emit('session:created', sessionId, userId || '');

    return sessionId;
  }

  private async generateToken(userId: string, sessionId: string): Promise<string> {
    const tokenId = this.generateTokenId();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    this.tokens.set(tokenId, { userId, sessionId, expiresAt });

    return jwt.sign(
      {
        userId,
        sessionId,
        jti: tokenId
      },
      this.jwtSecret,
      { expiresIn: '1h' }
    );
  }

  private async checkPermissions(
    user: SecurityUser,
    resource: string,
    action: string,
    context: Record<string, unknown>
  ): Promise<boolean> {
    if (!this.config.authenticationRequired) {
      return true;
    }

    const requiredPermission = `${resource}:${action}`;
    return user.permissions.includes(requiredPermission) ||
           user.permissions.includes('*') ||
           user.permissions.includes(`${resource}:*`);
  }

  private async checkRateLimit(identifier: string): Promise<boolean> {
    const rateLimit = this.rateLimits.get(identifier);
    const now = new Date();

    if (!rateLimit || now > rateLimit.resetTime) {
      this.rateLimits.set(identifier, {
        count: 1,
        resetTime: new Date(now.getTime() + 15 * 60 * 1000)
      });
      return false;
    }

    if (rateLimit.count >= 5) {
      return true;
    }

    rateLimit.count++;
    return false;
  }

  private async recordAuthenticationSuccess(userId: string, sessionId: string): Promise<void> {
    this.metrics.authenticationAttempts++;
    this.emit('authentication:success', userId, sessionId);

    if (this.config.auditEnabled) {
      this.logger.audit('authentication_success', userId, 'session', { sessionId });
    }
  }

  private async recordAuthenticationFailure(userId: string, reason: string): Promise<void> {
    this.metrics.authenticationAttempts++;
    this.metrics.authenticationFailures++;
    this.emit('authentication:failure', userId, reason);

    this.logger.warn('Authentication failure', { userId, reason });

    if (this.config.auditEnabled) {
      this.logger.audit('authentication_failure', userId, 'system', { reason });
    }
  }

  private async recordAuthorizationGranted(userId: string, resource: string, action: string): Promise<void> {
    this.metrics.authorizationRequests++;
    this.emit('authorization:granted', userId, resource, action);

    if (this.config.auditEnabled) {
      this.logger.audit('authorization_granted', userId, resource, { action });
    }
  }

  private async recordAuthorizationDenial(userId: string, resource: string, action: string, reason: string): Promise<void> {
    this.metrics.authorizationRequests++;
    this.metrics.authorizationDenials++;
    this.emit('authorization:denied', userId, resource, action, reason);

    this.logger.warn('Authorization denied', { userId, resource, action, reason });

    if (this.config.auditEnabled) {
      this.logger.audit('authorization_denied', userId, resource, { action, reason });
    }
  }

  private async createDefaultUsers(): Promise<void> {
    const adminUser = await this.createUser({
      username: 'admin',
      email: 'admin@qwen-swarm.local',
      password: 'admin123',
      roles: ['admin'],
      permissions: ['*']
    });

    this.logger.info('Default admin user created', { userId: adminUser, username: 'admin' });
  }

  private startPeriodicCleanup(): void {
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupExpiredSessions();
      await this.cleanupExpiredTokens();
    }, 5 * 60 * 1000);
  }

  private async cleanupExpiredSessions(): Promise<void> {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions) {
      if (now > session.expiresAt) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      await this.terminateSession(sessionId, 'expired');
    }

    if (expiredSessions.length > 0) {
      this.logger.debug('Cleaned up expired sessions', { count: expiredSessions.length });
    }
  }

  private async cleanupExpiredTokens(): Promise<void> {
    const now = new Date();
    const expiredTokens: string[] = [];

    for (const [tokenId, tokenInfo] of this.tokens) {
      if (now > tokenInfo.expiresAt) {
        expiredTokens.push(tokenId);
      }
    }

    for (const tokenId of expiredTokens) {
      this.tokens.delete(tokenId);
    }

    if (expiredTokens.length > 0) {
      this.logger.debug('Cleaned up expired tokens', { count: expiredTokens.length });
    }
  }

  private initializeMetrics(): SecurityMetrics {
    return {
      totalSessions: 0,
      activeSessions: 0,
      authenticationAttempts: 0,
      authenticationFailures: 0,
      authorizationRequests: 0,
      authorizationDenials: 0,
      securityAlerts: 0,
      lastSecurityEvent: new Date()
    };
  }

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTokenId(): string {
    return `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    const sessionIds = Array.from(this.sessions.keys());
    for (const sessionId of sessionIds) {
      await this.terminateSession(sessionId, 'shutdown');
    }

    this.sessions.clear();
    this.users.clear();
    this.tokens.clear();
    this.rateLimits.clear();

    this.logger.info('Security Manager shutdown complete');
  }
}
import { EventEmitter } from 'events';
import { WebSocketBridge } from './websocket-bridge';
import { ConfigSync } from './config-sync';
import { LogStreamer } from './log-streamer';
import { Logger } from '../utils/logger';

export interface ComponentStatus {
  id: string;
  name: string;
  type: 'backend' | 'gui' | 'bridge' | 'integration' | 'external';
  status: 'starting' | 'running' | 'stopped' | 'error' | 'degraded';
  health: 'healthy' | 'unhealthy' | 'unknown';
  lastCheck: Date;
  metrics: Record<string, any>;
  dependencies: string[];
  dependents: string[];
  error?: string;
  warnings: string[];
  uptime?: number;
  version?: string;
  endpoint?: string;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: ComponentStatus[];
  checks: HealthCheck[];
  timestamp: Date;
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    unknown: number;
  };
}

export interface HealthCheck {
  id: string;
  name: string;
  component: string;
  type: 'http' | 'tcp' | 'process' | 'custom';
  endpoint?: string;
  interval: number;
  timeout: number;
  lastResult: 'pass' | 'fail' | 'unknown';
  lastCheck: Date;
  consecutiveFailures: number;
  maxFailures: number;
}

export interface StatusMonitorEvents {
  'component:status_changed': ComponentStatus;
  'component:health_changed': ComponentStatus;
  'system:health_changed': SystemHealth;
  'check:failed': HealthCheck;
  'check:recovered': HealthCheck;
  'alert:triggered': { alert: Alert; component: string };
  'metrics:updated': { component: string; metrics: Record<string, any> };
}

export interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  severity: 'low' | 'medium' | 'high' | 'critical';
  component: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  resolved: boolean;
}

export class StatusMonitor extends EventEmitter {
  private wsBridge: WebSocketBridge;
  private configSync: ConfigSync;
  private logStreamer: LogStreamer;
  private components: Map<string, ComponentStatus> = new Map();
  private healthChecks: Map<string, HealthCheck> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private checkIntervals: Map<string, NodeJS.Timeout> = new Map();
  private logger: Logger;
  private isMonitoring = false;

  constructor(
    wsBridge: WebSocketBridge,
    configSync: ConfigSync,
    logStreamer: LogStreamer
  ) {
    super();
    this.wsBridge = wsBridge;
    this.configSync = configSync;
    this.logStreamer = logStreamer;
    this.logger = new Logger().withContext({ component: 'StatusMonitor' });
    this.setupIntegration();
  }

  /**
   * Start status monitoring
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      this.logger.warn('Status monitoring already active');
      return;
    }

    this.logger.info('Starting status monitoring');

    try {
      // Register default components
      this.registerDefaultComponents();

      // Setup default health checks
      this.setupDefaultHealthChecks();

      // Start health checks
      this.startHealthChecks();

      // Setup WebSocket monitoring
      this.setupWebSocketMonitoring();

      // Setup configuration monitoring
      this.setupConfigurationMonitoring();

      // Setup log monitoring
      this.setupLogMonitoring();

      this.isMonitoring = true;
      this.logger.info('Status monitoring started successfully');

      // Emit initial system health
      this.updateSystemHealth();

    } catch (error) {
      this.logger.error('Failed to start status monitoring', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Stop status monitoring
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    this.logger.info('Stopping status monitoring');

    this.isMonitoring = false;

    // Clear all health check intervals
    for (const [id, interval] of this.checkIntervals.entries()) {
      clearInterval(interval);
    }
    this.checkIntervals.clear();

    this.logger.info('Status monitoring stopped');
  }

  /**
   * Register a component for monitoring
   */
  registerComponent(component: Omit<ComponentStatus, 'lastCheck' | 'warnings'>): void {
    const fullComponent: ComponentStatus = {
      ...component,
      lastCheck: new Date(),
      warnings: []
    };

    this.components.set(component.id, fullComponent);
    this.logger.info('Component registered for monitoring', { id: component.id, name: component.name });
  }

  /**
   * Update component status
   */
  updateComponentStatus(
    componentId: string,
    updates: Partial<ComponentStatus>
  ): void {
    const component = this.components.get(componentId);
    if (!component) {
      this.logger.warn('Component not found for status update', { componentId });
      return;
    }

    const previousStatus = component.status;
    const previousHealth = component.health;

    // Update component
    Object.assign(component, updates, { lastCheck: new Date() });

    // Check for status changes
    if (previousStatus !== component.status) {
      this.logger.info('Component status changed', {
        componentId,
        previous: previousStatus,
        current: component.status
      });
      this.emit('component:status_changed', component);
    }

    if (previousHealth !== component.health) {
      this.logger.info('Component health changed', {
        componentId,
        previous: previousHealth,
        current: component.health
      });
      this.emit('component:health_changed', component);
    }

    // Update system health
    this.updateSystemHealth();
  }

  /**
   * Get component status
   */
  getComponentStatus(componentId: string): ComponentStatus | undefined {
    return this.components.get(componentId);
  }

  /**
   * Get all component statuses
   */
  getAllComponentStatuses(): ComponentStatus[] {
    return Array.from(this.components.values());
  }

  /**
   * Get system health
   */
  getSystemHealth(): SystemHealth {
    const components = Array.from(this.components.values());

    const summary = {
      total: components.length,
      healthy: components.filter(c => c.health === 'healthy').length,
      degraded: components.filter(c => c.health === 'degraded').length,
      unhealthy: components.filter(c => c.health === 'unhealthy').length,
      unknown: components.filter(c => c.health === 'unknown').length
    };

    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (summary.unhealthy > 0) {
      overall = 'unhealthy';
    } else if (summary.degraded > 0) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }

    return {
      overall,
      components,
      checks: Array.from(this.healthChecks.values()),
      timestamp: new Date(),
      summary
    };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert && !alert.acknowledged) {
      alert.acknowledged = true;
      this.logger.info('Alert acknowledged', { alertId, message: alert.message });
    }
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      this.logger.info('Alert resolved', { alertId, message: alert.message });
    }
  }

  /**
   * Add a health check
   */
  addHealthCheck(check: Omit<HealthCheck, 'lastResult' | 'lastCheck' | 'consecutiveFailures'>): void {
    const fullCheck: HealthCheck = {
      ...check,
      lastResult: 'unknown',
      lastCheck: new Date(),
      consecutiveFailures: 0
    };

    this.healthChecks.set(check.id, fullCheck);

    // Start the check if monitoring is active
    if (this.isMonitoring) {
      this.startHealthCheck(fullCheck);
    }
  }

  /**
   * Update component metrics
   */
  updateMetrics(componentId: string, metrics: Record<string, any>): void {
    const component = this.components.get(componentId);
    if (!component) return;

    component.metrics = { ...component.metrics, ...metrics };
    this.emit('metrics:updated', { component: componentId, metrics });
  }

  /**
   * Setup integration with other components
   */
  private setupIntegration(): void {
    // Monitor WebSocket bridge
    this.wsBridge.on('client:connected', () => {
      this.updateComponentStatus('websocket-bridge', {
        status: 'running',
        health: 'healthy',
        metrics: { connectedClients: this.wsBridge.getClients().length }
      });
    });

    this.wsBridge.on('client:disconnected', () => {
      this.updateComponentStatus('websocket-bridge', {
        metrics: { connectedClients: this.wsBridge.getClients().length }
      });
    });

    this.wsBridge.on('error', (error) => {
      this.updateComponentStatus('websocket-bridge', {
        status: 'error',
        health: 'unhealthy',
        error: error.error.message
      });
    });

    // Monitor configuration sync
    this.configSync.on('config:changed', () => {
      this.updateComponentStatus('config-sync', { health: 'healthy' });
    });

    this.configSync.on('sync:error', ({ error }) => {
      this.updateComponentStatus('config-sync', {
        health: 'degraded',
        warnings: [`Sync error: ${error}`]
      });
    });

    // Monitor log streamer
    this.logStreamer.on('stream:started', () => {
      this.updateComponentStatus('log-streamer', { status: 'running', health: 'healthy' });
    });

    this.logStreamer.on('stream:error', ({ error, source }) => {
      this.updateComponentStatus('log-streamer', {
        health: 'degraded',
        warnings: [`Stream error for ${source}: ${error.message}`]
      });
    });
  }

  /**
   * Register default components
   */
  private registerDefaultComponents(): void {
    // Backend component
    this.registerComponent({
      id: 'backend',
      name: 'Qwen Swarm Backend',
      type: 'backend',
      status: 'starting',
      health: 'unknown',
      metrics: {},
      dependencies: [],
      dependents: ['gui'],
      endpoint: 'http://localhost:3000'
    });

    // GUI component
    this.registerComponent({
      id: 'gui',
      name: 'Qwen Swarm GUI',
      type: 'gui',
      status: 'starting',
      health: 'unknown',
      metrics: {},
      dependencies: ['backend'],
      dependents: [],
      endpoint: 'http://localhost:5173'
    });

    // WebSocket bridge
    this.registerComponent({
      id: 'websocket-bridge',
      name: 'WebSocket Bridge',
      type: 'bridge',
      status: 'starting',
      health: 'unknown',
      metrics: {},
      dependencies: [],
      dependents: ['gui', 'cli']
    });

    // Configuration sync
    this.registerComponent({
      id: 'config-sync',
      name: 'Configuration Sync',
      type: 'integration',
      status: 'starting',
      health: 'unknown',
      metrics: {},
      dependencies: [],
      dependents: ['backend', 'gui']
    });

    // Log streamer
    this.registerComponent({
      id: 'log-streamer',
      name: 'Log Streamer',
      type: 'integration',
      status: 'starting',
      health: 'unknown',
      metrics: {},
      dependencies: [],
      dependents: []
    });
  }

  /**
   * Setup default health checks
   */
  private setupDefaultHealthChecks(): void {
    // Backend HTTP check
    this.addHealthCheck({
      id: 'backend-http',
      name: 'Backend HTTP Health Check',
      component: 'backend',
      type: 'http',
      endpoint: 'http://localhost:3000/health',
      interval: 30000,
      timeout: 5000,
      maxFailures: 3
    });

    // GUI HTTP check
    this.addHealthCheck({
      id: 'gui-http',
      name: 'GUI HTTP Health Check',
      component: 'gui',
      type: 'http',
      endpoint: 'http://localhost:5173',
      interval: 30000,
      timeout: 5000,
      maxFailures: 3
    });

    // WebSocket bridge check
    this.addHealthCheck({
      id: 'websocket-bridge-check',
      name: 'WebSocket Bridge Check',
      component: 'websocket-bridge',
      type: 'custom',
      interval: 60000,
      timeout: 5000,
      maxFailures: 2
    });
  }

  /**
   * Start all health checks
   */
  private startHealthChecks(): void {
    for (const check of this.healthChecks.values()) {
      this.startHealthCheck(check);
    }
  }

  /**
   * Start a specific health check
   */
  private startHealthCheck(check: HealthCheck): void {
    const interval = setInterval(async () => {
      await this.executeHealthCheck(check);
    }, check.interval);

    this.checkIntervals.set(check.id, interval);
  }

  /**
   * Execute a health check
   */
  private async executeHealthCheck(check: HealthCheck): Promise<void> {
    try {
      let result: 'pass' | 'fail' = 'fail';

      switch (check.type) {
        case 'http':
          result = await this.executeHttpHealthCheck(check);
          break;
        case 'tcp':
          result = await this.executeTcpHealthCheck(check);
          break;
        case 'process':
          result = await this.executeProcessHealthCheck(check);
          break;
        case 'custom':
          result = await this.executeCustomHealthCheck(check);
          break;
      }

      const previousResult = check.lastResult;
      check.lastResult = result;
      check.lastCheck = new Date();

      if (result === 'pass') {
        check.consecutiveFailures = 0;

        // Check if we recovered from a failure
        if (previousResult === 'fail') {
          this.logger.info('Health check recovered', { checkId: check.id });
          this.emit('check:recovered', check);

          // Update component health
          this.updateComponentStatus(check.component, { health: 'healthy' });
        }
      } else {
        check.consecutiveFailures++;

        this.logger.warn('Health check failed', {
          checkId: check.id,
          consecutiveFailures: check.consecutiveFailures,
          maxFailures: check.maxFailures
        });

        this.emit('check:failed', check);

        // Update component health based on failures
        if (check.consecutiveFailures >= check.maxFailures) {
          const health = check.consecutiveFailures >= check.maxFailures * 2 ? 'unhealthy' : 'degraded';
          this.updateComponentStatus(check.component, { health });

          // Create alert
          this.createAlert({
            type: 'error',
            severity: health === 'unhealthy' ? 'high' : 'medium',
            component: check.component,
            message: `Health check '${check.name}' failed ${check.consecutiveFailures} times`
          });
        }
      }

    } catch (error) {
      this.logger.error('Health check execution error', error instanceof Error ? error : new Error(String(error)), { checkId: check.id });

      check.lastResult = 'fail';
      check.lastCheck = new Date();
      check.consecutiveFailures++;
    }
  }

  /**
   * Execute HTTP health check
   */
  private async executeHttpHealthCheck(check: HealthCheck): Promise<'pass' | 'fail'> {
    if (!check.endpoint) return 'fail';

    try {
      const response = await fetch(check.endpoint, {
        method: 'GET',
        timeout: check.timeout
      });
      return response.ok ? 'pass' : 'fail';
    } catch (error) {
      return 'fail';
    }
  }

  /**
   * Execute TCP health check
   */
  private async executeTcpHealthCheck(check: HealthCheck): Promise<'pass' | 'fail'> {
    // Implementation would depend on TCP connection logic
    // For now, return pass as placeholder
    return 'pass';
  }

  /**
   * Execute process health check
   */
  private async executeProcessHealthCheck(check: HealthCheck): Promise<'pass' | 'fail'> {
    // Implementation would check if process is running
    // For now, return pass as placeholder
    return 'pass';
  }

  /**
   * Execute custom health check
   */
  private async executeCustomHealthCheck(check: HealthCheck): Promise<'pass' | 'fail'> {
    const component = this.components.get(check.component);
    if (!component) return 'fail';

    // Custom logic based on component type
    switch (check.component) {
      case 'websocket-bridge':
        return this.wsBridge.getClients().length >= 0 ? 'pass' : 'fail';
      case 'config-sync':
        return 'pass'; // Assume config sync is healthy if running
      case 'log-streamer':
        return 'pass'; // Assume log streamer is healthy if running
      default:
        return 'pass';
    }
  }

  /**
   * Setup WebSocket monitoring
   */
  private setupWebSocketMonitoring(): void {
    // Send status updates via WebSocket
    setInterval(() => {
      if (this.isMonitoring) {
        const health = this.getSystemHealth();
        this.wsBridge.sendToTopic('system:status', {
          type: 'system_health',
          payload: health,
          source: 'status_monitor'
        });
      }
    }, 10000);
  }

  /**
   * Setup configuration monitoring
   */
  private setupConfigurationMonitoring(): void {
    // Monitor configuration changes that affect system health
    this.configSync.on('config:changed', (items) => {
      // Check if health check configuration changed
      const healthCheckConfig = items.find(item => item.key.startsWith('health.'));
      if (healthCheckConfig) {
        this.logger.info('Health check configuration changed, restarting checks');
        // Restart health checks with new configuration
        this.stopHealthChecks();
        this.setupDefaultHealthChecks();
        this.startHealthChecks();
      }
    });
  }

  /**
   * Setup log monitoring for health alerts
   */
  private setupLogMonitoring(): void {
    // Monitor for error logs that might indicate health issues
    this.logStreamer.on('log:received', (entry) => {
      if (entry.level === 'error') {
        // Check if error is from a monitored component
        const component = Array.from(this.components.values())
          .find(c => entry.message.includes(c.name) || entry.message.includes(c.id));

        if (component) {
          this.updateComponentStatus(component.id, {
            warnings: [`Error logged: ${entry.message.substring(0, 100)}...`]
          });
        }
      }
    });
  }

  /**
   * Update system health and emit events
   */
  private updateSystemHealth(): void {
    const health = this.getSystemHealth();
    this.emit('system:health_changed', health);

    // Check for system-wide alerts
    if (health.overall === 'unhealthy') {
      this.createAlert({
        type: 'error',
        severity: 'critical',
        component: 'system',
        message: `System health is unhealthy: ${health.summary.unhealthy} components unhealthy`
      });
    } else if (health.overall === 'degraded') {
      this.createAlert({
        type: 'warning',
        severity: 'medium',
        component: 'system',
        message: `System health is degraded: ${health.summary.degraded} components degraded`
      });
    }
  }

  /**
   * Create an alert
   */
  private createAlert(alertData: Omit<Alert, 'id' | 'timestamp' | 'acknowledged' | 'resolved'>): void {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      acknowledged: false,
      resolved: false,
      ...alertData
    };

    this.alerts.set(alert.id, alert);
    this.emit('alert:triggered', { alert, component: alert.component });

    this.logger.warn('Alert triggered', {
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
      component: alert.component,
      message: alert.message
    });
  }

  /**
   * Stop all health checks
   */
  private stopHealthChecks(): void {
    for (const [id, interval] of this.checkIntervals.entries()) {
      clearInterval(interval);
    }
    this.checkIntervals.clear();
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.stopMonitoring();
  }
}
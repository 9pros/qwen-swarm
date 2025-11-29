import { test, expect } from '@playwright/test';
import { AgentFactory } from '../factories/AgentFactory';
import { TaskFactory } from '../factories/TaskFactory';

test.describe('Swarm Management GUI', () => {
  test.beforeEach(async ({ page }) => {
    // Login to the application
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@test.com');
    await page.fill('[data-testid="password"]', 'test-password');
    await page.click('[data-testid="login-button"]');

    // Wait for dashboard to load
    await page.waitForURL('/dashboard');
    await expect(page.locator('[data-testid="dashboard-title"]')).toBeVisible();
  });

  test('should display swarm overview dashboard', async ({ page }) => {
    // Check dashboard components
    await expect(page.locator('[data-testid="swarm-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-agents-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="tasks-in-queue"]')).toBeVisible();
    await expect(page.locator('[data-testid="system-health"]')).toBeVisible();

    // Verify real-time updates
    const initialAgentCount = await page.textContent('[data-testid="active-agents-count"]');
    await page.waitForTimeout(2000);
    const updatedAgentCount = await page.textContent('[data-testid="active-agents-count"]');
    expect(updatedAgentCount).toBeTruthy();
  });

  test('should create new agent with validation', async ({ page }) => {
    // Navigate to agent creation
    await page.click('[data-testid="agents-tab"]');
    await page.click('[data-testid="create-agent-button"]');

    // Verify agent creation form
    await expect(page.locator('[data-testid="agent-creation-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="agent-name-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="agent-type-select"]')).toBeVisible();
    await expect(page.locator('[data-testid="agent-capabilities-multiselect"]')).toBeVisible();

    // Test form validation
    await page.click('[data-testid="create-agent-submit"]');
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();

    // Fill form with valid data
    await page.fill('[data-testid="agent-name-input"]', 'Test Worker Agent');
    await page.selectOption('[data-testid="agent-type-select"]', 'worker');
    await page.click('[data-testid="capability-data-processing"]');
    await page.click('[data-testid="capability-analysis"]');

    // Set configuration
    await page.fill('[data-testid="max-concurrent-tasks"]', '5');
    await page.fill('[data-testid="memory-limit"]', '1024');
    await page.fill('[data-testid="cpu-limit"]', '2');

    // Submit form
    await page.click('[data-testid="create-agent-submit"]');

    // Verify agent creation success
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Agent created successfully');

    // Verify agent appears in list
    await expect(page.locator('[data-testid="agent-list"]')).toContainText('Test Worker Agent');
  });

  test('should manage agent lifecycle', async ({ page }) => {
    // Create an agent first
    await page.goto('/agents/create');
    await page.fill('[data-testid="agent-name-input"]', 'Lifecycle Test Agent');
    await page.selectOption('[data-testid="agent-type-select"]', 'worker');
    await page.click('[data-testid="capability-data-processing"]');
    await page.click('[data-testid="create-agent-submit"]');

    // Navigate to agents list
    await page.goto('/agents');

    // Find the created agent
    const agentRow = page.locator('[data-testid="agent-row"]').filter({ hasText: 'Lifecycle Test Agent' });
    await expect(agentRow).toBeVisible();

    // Test agent status change
    await agentRow.locator('[data-testid="agent-actions"]').click();
    await page.click('[data-testid="pause-agent"]');
    await expect(agentRow.locator('[data-testid="agent-status"]')).toContainText('paused');

    // Resume agent
    await agentRow.locator('[data-testid="agent-actions"]').click();
    await page.click('[data-testid="resume-agent"]');
    await expect(agentRow.locator('[data-testid="agent-status"]')).toContainText('active');

    // Test agent configuration edit
    await agentRow.locator('[data-testid="edit-agent"]').click();
    await page.fill('[data-testid="max-concurrent-tasks"]', '8');
    await page.click('[data-testid="save-agent-config"]');
    await expect(page.locator('[data-testid="config-updated"]')).toBeVisible();
  });

  test('should create and monitor task execution', async ({ page }) => {
    // Create a task
    await page.goto('/tasks/create');
    await expect(page.locator('[data-testid="task-creation-form"]')).toBeVisible();

    // Fill task details
    await page.fill('[data-testid="task-title"]', 'Test Data Processing Task');
    await page.fill('[data-testid="task-description"]', 'Process test dataset for analysis');
    await page.selectOption('[data-testid="task-type"]', 'data_processing');
    await page.selectOption('[data-testid="task-priority"]', 'high');

    // Configure task payload
    await page.fill('[data-testid="input-format"]', 'json');
    await page.fill('[data-testid="output-format"]', 'csv');
    await page.click('[data-testid="transformation-filter"]');
    await page.click('[data-testid="transformation-aggregate"]');

    // Set execution parameters
    await page.fill('[data-testid="timeout"]', '300');
    await page.fill('[data-testid="retry-count"]', '3');

    // Submit task
    await page.click('[data-testid="create-task-submit"]');

    // Verify task creation
    await expect(page.locator('[data-testid="task-created-notification"]')).toBeVisible();

    // Navigate to task monitoring
    await page.goto('/tasks');
    const taskRow = page.locator('[data-testid="task-row"]').filter({ hasText: 'Test Data Processing Task' });
    await expect(taskRow).toBeVisible();

    // Monitor task execution
    await expect(taskRow.locator('[data-testid="task-status"]')).toContainText('pending');

    // Wait for task assignment (simulate real assignment)
    await page.waitForTimeout(3000);
    await expect(taskRow.locator('[data-testid="task-status"]')).toContainText('assigned');

    // View task details
    await taskRow.locator('[data-testid="view-task-details"]').click();
    await expect(page.locator('[data-testid="task-detail-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="task-execution-log"]')).toBeVisible();
    await expect(page.locator('[data-testid="task-performance-metrics"]')).toBeVisible();

    // Close modal
    await page.click('[data-testid="close-modal"]');
  });

  test('should handle swarm scaling operations', async ({ page }) => {
    // Navigate to swarm management
    await page.goto('/swarm');

    // Check current swarm status
    await expect(page.locator('[data-testid="swarm-overview"]')).toBeVisible();
    await expect(page.locator('[data-testid="current-agent-count"]')).toBeVisible();

    // Test manual scaling
    await page.click('[data-testid="scaling-controls"]');
    await page.fill('[data-testid="target-worker-count"]', '10');
    await page.click('[data-testid="apply-scaling"]');

    // Verify scaling initiation
    await expect(page.locator('[data-testid="scaling-in-progress"]')).toBeVisible();

    // Wait for scaling to complete
    await page.waitForTimeout(5000);
    await expect(page.locator('[data-testid="scaling-completed"]')).toBeVisible();

    // Verify new agents appear
    const updatedAgentCount = await page.textContent('[data-testid="current-agent-count"]');
    expect(updatedAgentCount).toContain('10');

    // Test auto-scaling configuration
    await page.click('[data-testid="auto-scaling-settings"]');
    await page.fill('[data-testid="scale-up-threshold"]', '80');
    await page.fill('[data-testid="scale-down-threshold"]', '20');
    await page.click('[data-testid="enable-auto-scaling"]');

    await expect(page.locator('[data-testid="auto-scaling-enabled"]')).toBeVisible();
  });

  test('should display and manage swarm metrics', async ({ page }) => {
    // Navigate to metrics dashboard
    await page.goto('/metrics');

    // Verify metrics panels
    await expect(page.locator('[data-testid="performance-metrics"]')).toBeVisible();
    await expect(page.locator('[data-testid="resource-utilization"]')).toBeVisible();
    await expect(page.locator('[data-testid="task-throughput"]')).toBeVisible();
    await expect(page.locator('[data-testid="agent-efficiency"]')).toBeVisible();

    // Test time range selection
    await page.selectOption('[data-testid="time-range"]', '1h');
    await expect(page.locator('[data-testid="metrics-updated"]')).toBeVisible();

    // Test custom date range
    await page.click('[data-testid="custom-range"]');
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-02');
    await page.click('[data-testid="apply-date-range"]');

    // Verify metrics update
    await expect(page.locator('[data-testid="charts-loaded"]')).toBeVisible();

    // Test metric export
    await page.click('[data-testid="export-metrics"]');
    await page.selectOption('[data-testid="export-format"]', 'csv');
    await page.click('[data-testid="download-export"]');

    // Verify download initiated
    const downloadPromise = page.waitForEvent('download');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('metrics');
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Simulate network error
    await page.route('**/api/agents', route => route.abort('failed'));

    // Navigate to agents page
    await page.goto('/agents');

    // Verify error handling
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

    // Test retry functionality
    await page.unroute('**/api/agents');
    await page.click('[data-testid="retry-button"]');

    // Verify recovery
    await expect(page.locator('[data-testid="agent-list"]')).toBeVisible();
  });

  test('should support responsive design', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/dashboard');

    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
    await expect(page.locator('[data-testid="main-content"]')).toBeVisible();

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('[data-testid="sidebar"]')).toBeHidden();
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();

    // Test mobile navigation
    await page.click('[data-testid="mobile-menu"]');
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();

    await page.click('[data-testid="mobile-nav-agents"]');
    await expect(page.locator('[data-testid="agent-list"]')).toBeVisible();
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/agents');

    // Test tab navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();

    // Test keyboard shortcuts
    await page.keyboard.press('Control+k');
    await expect(page.locator('[data-testid="search-modal"]')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="search-modal"]')).toBeHidden();

    // Test agent creation with keyboard
    await page.keyboard.press('Control+n');
    await expect(page.locator('[data-testid="agent-creation-form"]')).toBeVisible();
  });

  test('should handle real-time updates', async ({ page }) => {
    // Navigate to real-time monitoring
    await page.goto('/monitoring');

    // Verify WebSocket connection indicator
    await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');

    // Monitor agent status updates
    const initialStatus = await page.textContent('[data-testid="system-status"]');

    // Simulate external agent status change
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('agentStatusUpdate', {
        detail: { agentId: 'test-agent', status: 'busy' }
      }));
    });

    // Verify UI updates
    await page.waitForTimeout(1000);
    const updatedStatus = await page.textContent('[data-testid="system-status"]');
    expect(updatedStatus).not.toBe(initialStatus);

    // Test task completion notifications
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('taskCompleted', {
        detail: { taskId: 'test-task', result: 'success' }
      }));
    });

    await expect(page.locator('[data-testid="notification"]')).toBeVisible();
    await expect(page.locator('[data-testid="notification"]')).toContainText('Task completed');
  });

  test('should support accessibility standards', async ({ page }) => {
    // Test ARIA labels
    await page.goto('/dashboard');

    const mainContent = page.locator('main');
    await expect(mainContent).toHaveAttribute('aria-label');

    const navigation = page.locator('nav');
    await expect(navigation).toHaveAttribute('aria-label');

    // Test keyboard accessibility
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toHaveAttribute('tabindex');

    // Test screen reader support
    const agentButton = page.locator('[data-testid="agents-tab"]');
    await expect(agentButton).toHaveAttribute('aria-label');
    await expect(agentButton).toHaveAttribute('role');

    // Test color contrast (basic check)
    const textElements = page.locator('[data-testid*="text"], p, h1, h2, h3, span');
    const textCount = await textElements.count();

    for (let i = 0; i < Math.min(textCount, 10); i++) {
      const element = textElements.nth(i);
      const styles = await element.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor
        };
      });

      // Basic contrast check (not comprehensive)
      expect(styles.color).not.toBe(styles.backgroundColor);
    }
  });

  test('should handle browser storage and persistence', async ({ page }) => {
    // Test local storage preferences
    await page.goto('/dashboard');

    // Change theme
    await page.click('[data-testid="theme-toggle"]');

    // Verify preference stored
    const themePreference = await page.evaluate(() => {
      return localStorage.getItem('theme-preference');
    });
    expect(themePreference).toBe('dark');

    // Test session persistence
    await page.reload();
    await expect(page.locator('[data-testid="dashboard"]')).toHaveClass(/dark-theme/);

    // Test user preferences
    await page.goto('/settings');
    await page.selectOption('[data-testid="default-page-size"]', '50');
    await page.click('[data-testid="save-preferences"]');

    // Verify preferences persisted
    await page.goto('/agents');
    await expect(page.locator('[data-testid="agents-table"]')).toHaveAttribute('data-page-size', '50');
  });
});
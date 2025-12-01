/**
 * Comprehensive Test Reporting Dashboard
 * Centralized test result aggregation, analysis, and visualization
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { performance } from 'perf_hooks';

interface TestSuiteResult {
  name: string;
  category: 'unit' | 'integration' | 'e2e' | 'performance' | 'chaos' | 'security' | 'agi' | 'uat' | 'qa';
  timestamp: number;
  duration: number;
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  coverage?: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  metrics: {
    performance?: any;
    quality?: any;
    security?: any;
    accessibility?: any;
  };
  artifacts: string[];
  environment: string;
  version: string;
}

interface DashboardData {
  summary: {
    overallScore: number;
    totalSuites: number;
    passedSuites: number;
    failedSuites: number;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    coveragePercentage: number;
    lastUpdated: number;
    buildStatus: 'passed' | 'failed' | 'warning';
  };
  trends: {
    daily: Array<{ date: string; score: number; tests: number }>;
    weekly: Array<{ week: string; score: number; tests: number }>;
    categories: Record<string, Array<{ date: string; score: number }>>;
  };
  suites: TestSuiteResult[];
  qualityGates: {
    name: string;
    status: 'passed' | 'failed' | 'warning';
    score: number;
    threshold: number;
    blocking: boolean;
  }[];
  recommendations: string[];
  alerts: {
    level: 'critical' | 'warning' | 'info';
    message: string;
    timestamp: number;
  }[];
}

export class TestReportingDashboard {
  private dataPath: string;
  private reportsPath: string;
  private dashboardData: DashboardData;

  constructor(basePath: string = process.cwd()) {
    this.dataPath = join(basePath, 'test-data');
    this.reportsPath = join(basePath, 'test-reports');
    this.initializePaths();
    this.loadDashboardData();
  }

  private initializePaths(): void {
    if (!existsSync(this.dataPath)) {
      mkdirSync(this.dataPath, { recursive: true });
    }
    if (!existsSync(this.reportsPath)) {
      mkdirSync(this.reportsPath, { recursive: true });
    }
  }

  private loadDashboardData(): void {
    const dataFilePath = join(this.dataPath, 'dashboard-data.json');

    if (existsSync(dataFilePath)) {
      try {
        this.dashboardData = JSON.parse(readFileSync(dataFilePath, 'utf8'));
      } catch (error) {
        console.warn('Failed to load dashboard data, starting fresh:', error.message);
        this.initializeDashboardData();
      }
    } else {
      this.initializeDashboardData();
    }
  }

  private initializeDashboardData(): void {
    this.dashboardData = {
      summary: {
        overallScore: 0,
        totalSuites: 0,
        passedSuites: 0,
        failedSuites: 0,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        coveragePercentage: 0,
        lastUpdated: Date.now(),
        buildStatus: 'passed'
      },
      trends: {
        daily: [],
        weekly: [],
        categories: {}
      },
      suites: [],
      qualityGates: [],
      recommendations: [],
      alerts: []
    };
  }

  async generateComprehensiveReport(
    testResults: TestSuiteResult[]
  ): Promise<{
    dashboardData: DashboardData;
    htmlReport: string;
    jsonReport: string;
    artifacts: string[];
  }> {
    console.log('📊 Generating comprehensive test report...');

    const startTime = performance.now();

    // Process test results
    this.processTestResults(testResults);

    // Generate recommendations
    this.generateRecommendations();

    // Generate alerts
    this.generateAlerts();

    // Update trends
    this.updateTrends();

    // Save dashboard data
    await this.saveDashboardData();

    // Generate HTML report
    const htmlReport = await this.generateHTMLReport();

    // Generate JSON report
    const jsonReport = await this.generateJSONReport();

    // Generate artifacts
    const artifacts = await this.generateArtifacts();

    const duration = performance.now() - startTime;
    console.log(`✅ Report generated in ${duration.toFixed(0)}ms`);

    return {
      dashboardData: this.dashboardData,
      htmlReport,
      jsonReport,
      artifacts
    };
  }

  private processTestResults(testResults: TestSuiteResult[]): void {
    this.dashboardData.suites = testResults;
    this.dashboardData.summary.lastUpdated = Date.now();

    // Calculate summary statistics
    this.dashboardData.summary.totalSuites = testResults.length;
    this.dashboardData.summary.passedSuites = testResults.filter(s => s.status === 'passed').length;
    this.dashboardData.summary.failedSuites = testResults.filter(s => s.status === 'failed').length;

    this.dashboardData.summary.totalTests = testResults.reduce((sum, s) => sum + s.totalTests, 0);
    this.dashboardData.summary.passedTests = testResults.reduce((sum, s) => sum + s.passedTests, 0);
    this.dashboardData.summary.failedTests = testResults.reduce((sum, s) => sum + s.failedTests, 0);

    // Calculate overall score
    this.dashboardData.summary.overallScore = this.calculateOverallScore(testResults);

    // Calculate average coverage
    const suitesWithCoverage = testResults.filter(s => s.coverage);
    if (suitesWithCoverage.length > 0) {
      const totalCoverage = suitesWithCoverage.reduce((sum, s) => sum + (
        (s.coverage.statements + s.coverage.branches + s.coverage.functions + s.coverage.lines) / 4
      ), 0);
      this.dashboardData.summary.coveragePercentage = totalCoverage / suitesWithCoverage.length;
    }

    // Determine build status
    this.dashboardData.summary.buildStatus = this.determineBuildStatus(testResults);

    // Update quality gates
    this.updateQualityGates(testResults);
  }

  private calculateOverallScore(testResults: TestSuiteResult[]): number {
    if (testResults.length === 0) return 0;

    const weights = {
      unit: 0.25,
      integration: 0.20,
      e2e: 0.15,
      performance: 0.15,
      chaos: 0.10,
      security: 0.10,
      agi: 0.03,
      uat: 0.01,
      qa: 0.01
    };

    let totalWeightedScore = 0;
    let totalWeight = 0;

    const categoryScores: Record<string, { total: number; count: number; weight: number }> = {};

    // Initialize category scores
    Object.entries(weights).forEach(([category, weight]) => {
      categoryScores[category] = { total: 0, count: 0, weight };
    });

    // Calculate scores by category
    testResults.forEach(suite => {
      const category = suite.category;
      if (categoryScores[category]) {
        const score = suite.status === 'passed' ? 100 : suite.status === 'warning' ? 75 : 50;
        categoryScores[category].total += score;
        categoryScores[category].count++;
      }
    });

    // Calculate weighted average
    Object.entries(categoryScores).forEach(([category, data]) => {
      if (data.count > 0) {
        const averageScore = data.total / data.count;
        totalWeightedScore += averageScore * data.weight;
        totalWeight += data.weight;
      }
    });

    return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  }

  private determineBuildStatus(testResults: TestSuiteResult[]): 'passed' | 'failed' | 'warning' {
    const criticalFailures = testResults.filter(s =>
      s.status === 'failed' && ['unit', 'integration', 'security'].includes(s.category)
    ).length;

    const totalFailures = testResults.filter(s => s.status === 'failed').length;
    const warnings = testResults.filter(s => s.status === 'warning').length;

    if (criticalFailures > 0) return 'failed';
    if (totalFailures > testResults.length * 0.1) return 'failed';
    if (warnings > testResults.length * 0.2) return 'warning';
    return 'passed';
  }

  private updateQualityGates(testResults: TestSuiteResult[]): void {
    this.dashboardData.qualityGates = [
      {
        name: 'Unit Tests',
        status: this.getGateStatus(testResults, 'unit'),
        score: this.getCategoryScore(testResults, 'unit'),
        threshold: 95,
        blocking: true
      },
      {
        name: 'Integration Tests',
        status: this.getGateStatus(testResults, 'integration'),
        score: this.getCategoryScore(testResults, 'integration'),
        threshold: 90,
        blocking: true
      },
      {
        name: 'Code Coverage',
        status: this.dashboardData.summary.coveragePercentage >= 85 ? 'passed' : 'failed',
        score: this.dashboardData.summary.coveragePercentage,
        threshold: 85,
        blocking: true
      },
      {
        name: 'Performance Tests',
        status: this.getGateStatus(testResults, 'performance'),
        score: this.getCategoryScore(testResults, 'performance'),
        threshold: 80,
        blocking: false
      },
      {
        name: 'Security Tests',
        status: this.getGateStatus(testResults, 'security'),
        score: this.getCategoryScore(testResults, 'security'),
        threshold: 90,
        blocking: true
      },
      {
        name: 'E2E Tests',
        status: this.getGateStatus(testResults, 'e2e'),
        score: this.getCategoryScore(testResults, 'e2e'),
        threshold: 85,
        blocking: false
      }
    ];
  }

  private getGateStatus(testResults: TestSuiteResult[], category: string): 'passed' | 'failed' | 'warning' {
    const categorySuites = testResults.filter(s => s.category === category);
    if (categorySuites.length === 0) return 'warning';

    const passed = categorySuites.filter(s => s.status === 'passed').length;
    const failed = categorySuites.filter(s => s.status === 'failed').length;

    if (failed > 0) return 'failed';
    if (passed === categorySuites.length) return 'passed';
    return 'warning';
  }

  private getCategoryScore(testResults: TestSuiteResult[], category: string): number {
    const categorySuites = testResults.filter(s => s.category === category);
    if (categorySuites.length === 0) return 0;

    const totalScore = categorySuites.reduce((sum, suite) => {
      const passRate = suite.totalTests > 0 ? (suite.passedTests / suite.totalTests) * 100 : 0;
      return sum + passRate;
    }, 0);

    return totalScore / categorySuites.length;
  }

  private generateRecommendations(): void {
    const recommendations: string[] = [];

    // Analyze failed suites
    const failedSuites = this.dashboardData.suites.filter(s => s.status === 'failed');
    if (failedSuites.length > 0) {
      recommendations.push(`${failedSuites.length} test suite(s) failed. Review failing tests and fix critical issues.`);
    }

    // Analyze coverage
    if (this.dashboardData.summary.coveragePercentage < 85) {
      recommendations.push(`Code coverage is ${this.dashboardData.summary.coveragePercentage.toFixed(1)}%. Aim for 85%+ coverage.`);
    }

    // Analyze performance
    const performanceSuites = this.dashboardData.suites.filter(s => s.category === 'performance');
    const slowTests = performanceSuites.filter(s => s.duration > 60000); // > 1 minute
    if (slowTests.length > 0) {
      recommendations.push(`${slowTests.length} test(s) are slow. Consider optimizing test performance.`);
    }

    // Analyze quality gates
    const failedGates = this.dashboardData.qualityGates.filter(g => g.status === 'failed');
    if (failedGates.length > 0) {
      recommendations.push(`Quality gates failed: ${failedGates.map(g => g.name).join(', ')}`);
    }

    // AGI-specific recommendations
    const agiSuites = this.dashboardData.suites.filter(s => s.category === 'agi');
    if (agiSuites.length > 0) {
      const avgAgisScore = agiSuites.reduce((sum, s) => sum + (s.passedTests / s.totalTests) * 100, 0) / agiSuites.length;
      if (avgAgisScore < 80) {
        recommendations.push('AGI capabilities need improvement. Focus on learning and adaptation features.');
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Excellent test performance! All quality gates passed successfully.');
    }

    this.dashboardData.recommendations = recommendations;
  }

  private generateAlerts(): void {
    const alerts = this.dashboardData.alerts;
    alerts.length = 0; // Clear existing alerts

    // Critical alerts
    if (this.dashboardData.summary.buildStatus === 'failed') {
      alerts.push({
        level: 'critical',
        message: 'Build failed due to critical test failures',
        timestamp: Date.now()
      });
    }

    // Security alerts
    const securityFailures = this.dashboardData.suites.filter(s => s.category === 'security' && s.status === 'failed');
    if (securityFailures.length > 0) {
      alerts.push({
        level: 'critical',
        message: `${securityFailures.length} security test(s) failed - immediate attention required`,
        timestamp: Date.now()
      });
    }

    // Performance alerts
    const performanceFailures = this.dashboardData.suites.filter(s => s.category === 'performance' && s.status === 'failed');
    if (performanceFailures.length > 0) {
      alerts.push({
        level: 'warning',
        message: `${performanceFailures.length} performance test(s) failed - investigate bottlenecks`,
        timestamp: Date.now()
      });
    }

    // Coverage alerts
    if (this.dashboardData.summary.coveragePercentage < 70) {
      alerts.push({
        level: 'warning',
        message: `Low code coverage: ${this.dashboardData.summary.coveragePercentage.toFixed(1)}%`,
        timestamp: Date.now()
      });
    }

    // AGI capability alerts
    const agiFailures = this.dashboardData.suites.filter(s => s.category === 'agi' && s.status === 'failed');
    if (agiFailures.length > 0) {
      alerts.push({
        level: 'info',
        message: `${agiFailures.length} AGI capability test(s) failed - review AI model performance`,
        timestamp: Date.now()
      });
    }

    // Keep only recent alerts (last 24 hours)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    this.dashboardData.alerts = alerts.filter(alert => alert.timestamp > oneDayAgo);
  }

  private updateTrends(): void {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const weekKey = weekStart.toISOString().split('T')[0];

    // Update daily trend
    const dailyTrend = this.dashboardData.trends.daily.find(t => t.date === today);
    if (dailyTrend) {
      dailyTrend.score = this.dashboardData.summary.overallScore;
      dailyTrend.tests = this.dashboardData.summary.totalTests;
    } else {
      this.dashboardData.trends.daily.push({
        date: today,
        score: this.dashboardData.summary.overallScore,
        tests: this.dashboardData.summary.totalTests
      });

      // Keep only last 30 days
      if (this.dashboardData.trends.daily.length > 30) {
        this.dashboardData.trends.daily = this.dashboardData.trends.daily.slice(-30);
      }
    }

    // Update weekly trend
    const weeklyTrend = this.dashboardData.trends.weekly.find(t => t.week === weekKey);
    if (weeklyTrend) {
      weeklyTrend.score = this.dashboardData.summary.overallScore;
      weeklyTrend.tests = this.dashboardData.summary.totalTests;
    } else {
      this.dashboardData.trends.weekly.push({
        week: weekKey,
        score: this.dashboardData.summary.overallScore,
        tests: this.dashboardData.summary.totalTests
      });

      // Keep only last 12 weeks
      if (this.dashboardData.trends.weekly.length > 12) {
        this.dashboardData.trends.weekly = this.dashboardData.trends.weekly.slice(-12);
      }
    }

    // Update category trends
    const categories = ['unit', 'integration', 'performance', 'security', 'agi'];
    categories.forEach(category => {
      if (!this.dashboardData.trends.categories[category]) {
        this.dashboardData.trends.categories[category] = [];
      }

      const categoryScore = this.getCategoryScore(this.dashboardData.suites, category);
      const categoryTrend = this.dashboardData.trends.categories[category].find(t => t.date === today);

      if (categoryTrend) {
        categoryTrend.score = categoryScore;
      } else {
        this.dashboardData.trends.categories[category].push({
          date: today,
          score: categoryScore
        });

        // Keep only last 30 days
        if (this.dashboardData.trends.categories[category].length > 30) {
          this.dashboardData.trends.categories[category] = this.dashboardData.trends.categories[category].slice(-30);
        }
      }
    });
  }

  private async saveDashboardData(): Promise<void> {
    const dataFilePath = join(this.dataPath, 'dashboard-data.json');
    writeFileSync(dataFilePath, JSON.stringify(this.dashboardData, null, 2));
  }

  private async generateHTMLReport(): Promise<string> {
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>qwen-swarm Test Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .dashboard {
            max-width: 1400px;
            margin: 0 auto;
        }
        .header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .summary-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }
        .score {
            font-size: 2em;
            font-weight: bold;
            margin: 10px 0;
        }
        .score.passed { color: #28a745; }
        .score.failed { color: #dc3545; }
        .score.warning { color: #ffc107; }
        .charts-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .chart-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .suites-table {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        .status-passed { color: #28a745; }
        .status-failed { color: #dc3545; }
        .status-warning { color: #ffc107; }
        .alerts {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .alert {
            padding: 10px;
            margin: 5px 0;
            border-radius: 4px;
        }
        .alert-critical { background: #f8d7da; border-left: 4px solid #dc3545; }
        .alert-warning { background: #fff3cd; border-left: 4px solid #ffc107; }
        .alert-info { background: #d1ecf1; border-left: 4px solid #17a2b8; }
        .recommendations {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .recommendation {
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        .recommendation:last-child {
            border-bottom: none;
        }
        .quality-gates {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .gate {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
        }
        .gate:last-child {
            border-bottom: none;
        }
        .gate-status {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
        }
        .gate-passed { background: #d4edda; color: #155724; }
        .gate-failed { background: #f8d7da; color: #721c24; }
        .gate-warning { background: #fff3cd; color: #856404; }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>🧪 qwen-swarm Test Dashboard</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
        </div>

        <div class="summary-grid">
            <div class="summary-card">
                <h3>Overall Score</h3>
                <div class="score ${this.dashboardData.summary.buildStatus}">
                    ${this.dashboardData.summary.overallScore.toFixed(1)}%
                </div>
                <p>Build Status: <strong>${this.dashboardData.summary.buildStatus.toUpperCase()}</strong></p>
            </div>
            <div class="summary-card">
                <h3>Test Suites</h3>
                <div class="score">${this.dashboardData.summary.passedSuites}/${this.dashboardData.summary.totalSuites}</div>
                <p>Passed</p>
            </div>
            <div class="summary-card">
                <h3>Test Cases</h3>
                <div class="score">${this.dashboardData.summary.passedTests}/${this.dashboardData.summary.totalTests}</div>
                <p>Passed</p>
            </div>
            <div class="summary-card">
                <h3>Code Coverage</h3>
                <div class="score">${this.dashboardData.summary.coveragePercentage.toFixed(1)}%</div>
                <p>Coverage</p>
            </div>
        </div>

        <div class="quality-gates">
            <h2>🎯 Quality Gates</h2>
            ${this.dashboardData.qualityGates.map(gate => `
                <div class="gate">
                    <div>
                        <strong>${gate.name}</strong>
                        ${gate.blocking ? ' (Blocking)' : ''}
                    </div>
                    <div>
                        <span class="gate-status gate-${gate.status}">
                            ${gate.score.toFixed(1)}% - ${gate.status.toUpperCase()}
                        </span>
                        <small>Target: ${gate.threshold}%</small>
                    </div>
                </div>
            `).join('')}
        </div>

        ${this.dashboardData.alerts.length > 0 ? `
        <div class="alerts">
            <h2>🚨 Alerts</h2>
            ${this.dashboardData.alerts.map(alert => `
                <div class="alert alert-${alert.level}">
                    <strong>${alert.level.toUpperCase()}:</strong> ${alert.message}
                    <small>(${new Date(alert.timestamp).toLocaleTimeString()})</small>
                </div>
            `).join('')}
        </div>
        ` : ''}

        <div class="charts-container">
            <div class="chart-card">
                <h3>Score Trend (Last 7 Days)</h3>
                <canvas id="trendChart" width="400" height="200"></canvas>
            </div>
            <div class="chart-card">
                <h3>Category Performance</h3>
                <canvas id="categoryChart" width="400" height="200"></canvas>
            </div>
        </div>

        <div class="suites-table">
            <h2>📋 Test Suite Results</h2>
            <table>
                <thead>
                    <tr>
                        <th>Suite</th>
                        <th>Category</th>
                        <th>Status</th>
                        <th>Tests</th>
                        <th>Pass Rate</th>
                        <th>Duration</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.dashboardData.suites.map(suite => `
                        <tr>
                            <td>${suite.name}</td>
                            <td>${suite.category}</td>
                            <td class="status-${suite.status}">${suite.status.toUpperCase()}</td>
                            <td>${suite.passedTests}/${suite.totalTests}</td>
                            <td>${((suite.passedTests / suite.totalTests) * 100).toFixed(1)}%</td>
                            <td>${(suite.duration / 1000).toFixed(1)}s</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        ${this.dashboardData.recommendations.length > 0 ? `
        <div class="recommendations">
            <h2>💡 Recommendations</h2>
            ${this.dashboardData.recommendations.map(rec => `
                <div class="recommendation">• ${rec}</div>
            `).join('')}
        </div>
        ` : ''}
    </div>

    <script>
        // Trend Chart
        const trendCtx = document.getElementById('trendChart').getContext('2d');
        new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: ${JSON.stringify(this.dashboardData.trends.daily.slice(-7).map(d => d.date))},
                datasets: [{
                    label: 'Score',
                    data: ${JSON.stringify(this.dashboardData.trends.daily.slice(-7).map(d => d.score))},
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });

        // Category Chart
        const categoryCtx = document.getElementById('categoryChart').getContext('2d');
        new Chart(categoryCtx, {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(Object.keys(this.dashboardData.trends.categories))},
                datasets: [{
                    label: 'Score',
                    data: ${JSON.stringify(Object.values(this.dashboardData.trends.categories).map(c => c[c.length - 1]?.score || 0))},
                    backgroundColor: [
                        '#28a745',
                        '#007bff',
                        '#ffc107',
                        '#dc3545',
                        '#6f42c1'
                    ]
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    </script>
</body>
</html>`;

    const htmlPath = join(this.reportsPath, 'test-dashboard.html');
    writeFileSync(htmlPath, htmlTemplate);

    return htmlPath;
  }

  private async generateJSONReport(): Promise<string> {
    const jsonPath = join(this.reportsPath, 'test-report.json');
    writeFileSync(jsonPath, JSON.stringify(this.dashboardData, null, 2));
    return jsonPath;
  }

  private async generateArtifacts(): Promise<string[]> {
    const artifacts: string[] = [];

    // Generate CSV report
    const csvPath = join(this.reportsPath, 'test-results.csv');
    const csvContent = this.generateCSVReport();
    writeFileSync(csvPath, csvContent);
    artifacts.push(csvPath);

    // Generate metrics summary
    const metricsPath = join(this.reportsPath, 'metrics-summary.json');
    const metricsData = this.generateMetricsSummary();
    writeFileSync(metricsPath, JSON.stringify(metricsData, null, 2));
    artifacts.push(metricsPath);

    // Generate JUnit XML for CI integration
    const junitPath = join(this.reportsPath, 'junit-results.xml');
    const junitContent = this.generateJUnitReport();
    writeFileSync(junitPath, junitContent);
    artifacts.push(junitPath);

    return artifacts;
  }

  private generateCSVReport(): string {
    const headers = ['Suite', 'Category', 'Status', 'Total Tests', 'Passed', 'Failed', 'Skipped', 'Pass Rate %', 'Duration (s)', 'Coverage %'];
    const rows = [headers.join(',')];

    this.dashboardData.suites.forEach(suite => {
      const passRate = ((suite.passedTests / suite.totalTests) * 100).toFixed(1);
      const duration = (suite.duration / 1000).toFixed(1);
      const coverage = suite.coverage ? ((suite.coverage.statements + suite.coverage.branches + suite.coverage.functions + suite.coverage.lines) / 4).toFixed(1) : 'N/A';

      rows.push([
        `"${suite.name}"`,
        suite.category,
        suite.status,
        suite.totalTests,
        suite.passedTests,
        suite.failedTests,
        suite.skippedTests,
        passRate,
        duration,
        coverage
      ].join(','));
    });

    return rows.join('\n');
  }

  private generateMetricsSummary(): any {
    return {
      summary: this.dashboardData.summary,
      qualityGates: this.dashboardData.qualityGates,
      categoryBreakdown: this.calculateCategoryBreakdown(),
      performanceMetrics: this.calculatePerformanceMetrics(),
      trends: {
        daily: this.dashboardData.trends.daily.slice(-7),
        weekly: this.dashboardData.trends.weekly.slice(-4)
      }
    };
  }

  private calculateCategoryBreakdown(): any {
    const breakdown: Record<string, any> = {};

    this.dashboardData.suites.forEach(suite => {
      if (!breakdown[suite.category]) {
        breakdown[suite.category] = {
          suites: 0,
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          avgScore: 0
        };
      }

      const category = breakdown[suite.category];
      category.suites++;
      category.totalTests += suite.totalTests;
      category.passedTests += suite.passedTests;
      category.failedTests += suite.failedTests;
    });

    // Calculate average scores
    Object.keys(breakdown).forEach(category => {
      const cat = breakdown[category];
      cat.avgScore = (cat.passedTests / cat.totalTests) * 100;
    });

    return breakdown;
  }

  private calculatePerformanceMetrics(): any {
    const performanceSuites = this.dashboardData.suites.filter(s => s.category === 'performance');

    if (performanceSuites.length === 0) {
      return { message: 'No performance test results available' };
    }

    return {
      totalDuration: performanceSuites.reduce((sum, s) => sum + s.duration, 0),
      averageDuration: performanceSuites.reduce((sum, s) => sum + s.duration, 0) / performanceSuites.length,
      slowestTest: performanceSuites.reduce((max, s) => s.duration > max.duration ? s : max),
      fastestTest: performanceSuites.reduce((min, s) => s.duration < min.duration ? s : min)
    };
  }

  private generateJUnitReport(): string {
    const xmlLines = ['<?xml version="1.0" encoding="UTF-8"?>'];
    xmlLines.push('<testsuites>');

    this.dashboardData.suites.forEach(suite => {
      xmlLines.push(`  <testsuite name="${suite.name}" tests="${suite.totalTests}" failures="${suite.failedTests}" time="${suite.duration / 1000}">`);

      // Note: Individual test case details would need to be captured during test execution
      // This is a simplified version that represents suite-level results

      xmlLines.push(`    <testcase name="${suite.name}_summary" classname="${suite.category}" time="${suite.duration / 1000}">`);

      if (suite.failedTests > 0) {
        xmlLines.push(`      <failure message="${suite.failedTests} test(s) failed"/>`);
      }

      xmlLines.push('    </testcase>');
      xmlLines.push('  </testsuite>');
    });

    xmlLines.push('</testsuites>');
    return xmlLines.join('\n');
  }

  getDashboardData(): DashboardData {
    return this.dashboardData;
  }

  async updateRealTime(): Promise<void> {
    this.dashboardData.summary.lastUpdated = Date.now();
    await this.saveDashboardData();
  }
}

// Test Suite for Test Reporting Dashboard
describe('Test Reporting Dashboard', () => {
  let dashboard: TestReportingDashboard;

  beforeAll(() => {
    dashboard = new TestReportingDashboard();
  });

  it('should generate comprehensive test report', async () => {
    const mockTestResults: TestSuiteResult[] = [
      {
        name: 'Unit Tests',
        category: 'unit',
        timestamp: Date.now(),
        duration: 5000,
        status: 'passed',
        totalTests: 150,
        passedTests: 148,
        failedTests: 2,
        skippedTests: 0,
        coverage: {
          statements: 92,
          branches: 88,
          functions: 95,
          lines: 91
        },
        metrics: {},
        artifacts: [],
        environment: 'test',
        version: '1.0.0'
      },
      {
        name: 'Integration Tests',
        category: 'integration',
        timestamp: Date.now(),
        duration: 15000,
        status: 'passed',
        totalTests: 75,
        passedTests: 73,
        failedTests: 2,
        skippedTests: 0,
        coverage: {
          statements: 85,
          branches: 82,
          functions: 88,
          lines: 84
        },
        metrics: {},
        artifacts: [],
        environment: 'test',
        version: '1.0.0'
      },
      {
        name: 'AGI Capability Tests',
        category: 'agi',
        timestamp: Date.now(),
        duration: 45000,
        status: 'passed',
        totalTests: 25,
        passedTests: 22,
        failedTests: 3,
        skippedTests: 0,
        metrics: {
          aiPerformance: 85.5
        },
        artifacts: [],
        environment: 'test',
        version: '1.0.0'
      }
    ];

    const report = await dashboard.generateComprehensiveReport(mockTestResults);

    expect(report.dashboardData).toBeDefined();
    expect(report.dashboardData.summary.totalSuites).toBe(3);
    expect(report.dashboardData.summary.overallScore).toBeGreaterThan(80);
    expect(report.htmlReport).toContain('<!DOCTYPE html>');
    expect(report.jsonReport).toContain('dashboardData');
    expect(report.artifacts.length).toBeGreaterThan(0);

    console.log('Dashboard Report Generated:', {
      overallScore: `${report.dashboardData.summary.overallScore.toFixed(1)}%`,
      buildStatus: report.dashboardData.summary.buildStatus,
      artifacts: report.artifacts.length,
      recommendations: report.dashboardData.recommendations.length
    });
  }, 30000);

  it('should handle failed test scenarios correctly', async () => {
    const failedTestResults: TestSuiteResult[] = [
      {
        name: 'Security Tests',
        category: 'security',
        timestamp: Date.now(),
        duration: 10000,
        status: 'failed',
        totalTests: 30,
        passedTests: 25,
        failedTests: 5,
        skippedTests: 0,
        metrics: {
          vulnerabilities: 2
        },
        artifacts: [],
        environment: 'test',
        version: '1.0.0'
      }
    ];

    const report = await dashboard.generateComprehensiveReport(failedTestResults);

    expect(report.dashboardData.summary.buildStatus).toBe('failed');
    expect(report.dashboardData.alerts.length).toBeGreaterThan(0);
    expect(report.dashboardData.qualityGates.some(g => g.name === 'Security Tests' && g.status === 'failed')).toBe(true);
  }, 15000);

  it('should generate appropriate recommendations based on results', async () => {
    const lowCoverageResults: TestSuiteResult[] = [
      {
        name: 'Unit Tests',
        category: 'unit',
        timestamp: Date.now(),
        duration: 5000,
        status: 'passed',
        totalTests: 100,
        passedTests: 100,
        failedTests: 0,
        skippedTests: 0,
        coverage: {
          statements: 65,
          branches: 60,
          functions: 70,
          lines: 64
        },
        metrics: {},
        artifacts: [],
        environment: 'test',
        version: '1.0.0'
      }
    ];

    const report = await dashboard.generateComprehensiveReport(lowCoverageResults);

    expect(report.dashboardData.recommendations.some(r =>
      r.includes('coverage') || r.includes('85%')
    )).toBe(true);
  }, 15000);
});
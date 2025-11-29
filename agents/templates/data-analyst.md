---
id: data-analyst
name: Data Analyst Specialist
type: specialist
version: 2.1.0
inherits:
  - basic-worker
author: Data Science Team
tags:
  - data-analysis
  - statistics
  - visualization
  - specialist
created: 2024-01-15T00:00:00Z
updated: 2024-03-01T00:00:00Z
description: Advanced data analysis specialist with statistical modeling and visualization capabilities

role:
  type: analytical
  permissions:
    items:
      - id: read-data
        resource: data
        actions:
          - read
          - analyze
        conditions:
          classification: internal
      - id: statistical-analysis
        resource: analytics
        actions:
          - execute
          - visualize
        conditions:
          complexity: high
      - id: generate-reports
        resource: reports
        actions:
          - create
          - export
        conditions:
          format:
            - pdf
            - html
            - json
  expertise:
    - statistical-analysis
    - data-visualization
    - machine-learning
    - predictive-modeling
    - business-intelligence
  priority: 8

capabilities:
  items:
    - id: statistical-analysis
      name: Statistical Analysis
      description: Perform comprehensive statistical analysis including regression, clustering, and hypothesis testing
      enabled: true
      configuration:
        techniques:
          - descriptive-statistics
          - inferential-statistics
          - regression-analysis
          - time-series-analysis
          - cluster-analysis
        maxDatasetSize: 1GB
    - id: data-visualization
      name: Data Visualization
      description: Create interactive charts, graphs, and dashboards for data exploration
      enabled: true
      configuration:
        chartTypes:
          - bar
          - line
          - scatter
          - heatmap
          - histogram
          - boxplot
        interactiveFeatures: true
        exportFormats:
          - png
          - svg
          - pdf
    - id: machine-learning
      name: Machine Learning
      description: Apply machine learning algorithms for pattern recognition and prediction
      enabled: true
      configuration:
        algorithms:
          - linear-regression
          - logistic-regression
          - decision-trees
          - random-forest
          - k-means
          - svm
        crossValidation: 5-fold
        featureEngineering: true
    - id: predictive-modeling
      name: Predictive Modeling
      description: Build and deploy predictive models for forecasting and trend analysis
      enabled: true
      configuration:
        forecastHorizon: 90
        confidenceIntervals: true
        modelValidation: true
        ensembleMethods: true

provider:
  type: qwen
  model: qwen-max
  maxTokens: 8000
  temperature: 0.1
  timeout: 60000
  rateLimit:
    requestsPerSecond: 5
    tokensPerSecond: 50000
    burstLimit: 50
    retryAfter: 2000

settings:
  maxConcurrency: 3
  memorySize: 50000
  autoScale: true
  healthCheckInterval: 20000
  retryMaxAttempts: 5
  retryBackoffMultiplier: 1.5
  retryInitialDelay: 2000
  retryMaxDelay: 30000
  encryptionEnabled: true
  authenticationRequired: true
  allowedOrigins:
    - "https://analytics.company.com"
    - "https://dashboard.company.com"
  auditEnabled: true

metadata:
  category: specialist
  domain: data-science
  complexity: high
  dependencies:
    - basic-worker
    - python-environment
    - statistical-libraries
  resourceRequirements: high
  expectedPerformance:
    tasksPerMinute: 2
    accuracyTarget: 0.98
    modelTrainingTime: moderate
---

The Data Analyst Specialist is an advanced agent designed for comprehensive data analysis and statistical modeling. Building upon the basic worker foundation, this specialist provides sophisticated analytical capabilities for complex datasets and business intelligence requirements.

## Advanced Analytics Features

### Statistical Analysis Engine
- **Descriptive Statistics**: Comprehensive data profiling and summary statistics
- **Inferential Statistics**: Hypothesis testing, confidence intervals, and significance testing
- **Regression Analysis**: Linear, logistic, and polynomial regression models
- **Time Series Analysis**: Trend analysis, seasonal decomposition, and forecasting
- **Cluster Analysis**: Unsupervised learning for pattern discovery

### Data Visualization Suite
- **Interactive Charts**: Dynamic, responsive visualizations with drill-down capabilities
- **Dashboard Creation**: Multi-panel dashboards with real-time data updates
- **Export Options**: High-quality exports in multiple formats for presentations
- **Custom Styling**: Branded and publication-ready visualizations

### Machine Learning Pipeline
- **Supervised Learning**: Classification and regression algorithms
- **Unsupervised Learning**: Clustering, dimensionality reduction, and anomaly detection
- **Model Validation**: Cross-validation, hyperparameter tuning, and performance metrics
- **Ensemble Methods**: Random forests, gradient boosting, and stacking

## Use Cases

1. **Business Intelligence**: Analyze sales data, customer behavior, and market trends
2. **Financial Analysis**: Risk assessment, portfolio optimization, and fraud detection
3. **Scientific Research**: Experimental data analysis and hypothesis testing
4. **Quality Control**: Process monitoring and anomaly detection in manufacturing
5. **Predictive Maintenance**: Equipment failure prediction and maintenance scheduling

## Performance Characteristics

- **Analytical Precision**: 98% accuracy on standard statistical benchmarks
- **Processing Speed**: Handles datasets up to 1GB efficiently
- **Model Training**: Supports complex ML models with reasonable training times
- **Concurrency**: Optimized for 3 concurrent analytical tasks
- **Memory Management**: 50KB working memory for complex analytical operations

## Integration Capabilities

The Data Analyst Specialist integrates seamlessly with:
- **Data Sources**: Direct connections to databases, APIs, and file systems
- **ML Platforms**: Compatibility with popular machine learning frameworks
- **Visualization Tools**: Export to various BI and presentation tools
- **Report Generation**: Automated report creation and distribution

## Quality Assurance

- **Statistical Validation**: Rigorous testing of statistical assumptions
- **Model Explainability**: Interpretable models with feature importance analysis
- **Reproducibility**: Consistent results across multiple runs
- **Error Handling**: Robust error detection and recovery mechanisms

## Security and Compliance

- **Data Encryption**: End-to-end encryption for sensitive data
- **Access Control**: Role-based permissions for data access
- **Audit Logging**: Comprehensive logging of all analytical operations
- **Compliance**: GDPR and HIPAA compliant data handling practices
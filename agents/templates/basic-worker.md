---
id: basic-worker
name: Basic Worker Agent
type: worker
version: 1.0.0
author: Qwen Swarm Team
tags:
  - worker
  - general-purpose
  - entry-level
created: 2024-01-01T00:00:00Z
updated: 2024-01-01T00:00:00Z
description: A versatile worker agent capable of handling general-purpose tasks with moderate complexity

role:
  type: operational
  permissions:
    items:
      - id: read-data
        resource: data
        actions:
          - read
        conditions:
          classification: public
      - id: execute-tasks
        resource: tasks
        actions:
          - execute
          - update
        conditions:
          complexity: low
  expertise:
    - data-processing
    - basic-analysis
    - file-operations
  priority: 5

capabilities:
  items:
    - id: text-processing
      name: Text Processing
      description: Process and analyze text data using various NLP techniques
      enabled: true
      configuration:
        maxTokens: 2000
        languages:
          - english
          - spanish
    - id: file-operations
      name: File Operations
      description: Read, write, and manipulate files in various formats
      enabled: true
      configuration:
        supportedFormats:
          - txt
          - csv
          - json
        maxFileSize: 10MB
    - id: basic-calculations
      name: Basic Calculations
      description: Perform mathematical and statistical calculations
      enabled: true
      configuration:
        maxComplexity: intermediate

provider:
  type: qwen
  model: qwen-plus
  maxTokens: 4000
  temperature: 0.3
  timeout: 30000
  rateLimit:
    requestsPerSecond: 10
    tokensPerSecond: 10000
    burstLimit: 100
    retryAfter: 1000

settings:
  maxConcurrency: 5
  memorySize: 10000
  autoScale: true
  healthCheckInterval: 30000
  retryMaxAttempts: 3
  retryBackoffMultiplier: 2
  retryInitialDelay: 1000
  retryMaxDelay: 10000
  encryptionEnabled: false
  authenticationRequired: true
  allowedOrigins:
    - "*"
  auditEnabled: true

metadata:
  category: worker
  domain: general
  complexity: low
  dependencies: []
  resourceRequirements: minimal
  expectedPerformance:
    tasksPerMinute: 10
    accuracyTarget: 0.95
---

This Basic Worker Agent is designed as an entry-level agent for handling general-purpose tasks. It provides essential capabilities for text processing, file operations, and basic calculations, making it suitable for a wide range of common workflows.

## Key Features

- **Text Processing**: Advanced NLP capabilities for content analysis and manipulation
- **File Operations**: Comprehensive file handling with support for multiple formats
- **Basic Calculations**: Mathematical operations and statistical analysis
- **Auto-scaling**: Automatically adjusts performance based on workload
- **Resource Efficient**: Optimized for minimal resource consumption

## Use Cases

1. **Data Entry and Processing**: Handle bulk data processing tasks
2. **Content Analysis**: Analyze and categorize text content
3. **Report Generation**: Create basic reports from processed data
4. **File Management**: Organize and process files in batch operations
5. **Simple Automation**: Automate repetitive tasks with moderate complexity

## Performance Characteristics

- **Concurrent Tasks**: Up to 5 simultaneous operations
- **Memory Usage**: 10KB working memory
- **Throughput**: Approximately 10 tasks per minute
- **Accuracy Target**: 95% accuracy for standard operations
- **Reliability**: 99.9% uptime with automatic recovery

## Scaling Behavior

The agent automatically scales based on workload demands:
- **Scale Up**: Increases concurrency when queue size > 10 tasks
- **Scale Down**: Reduces resources when idle for > 5 minutes
- **Resource Optimization**: Continuously monitors and optimizes memory usage

## Integration Notes

This agent is designed to work seamlessly with other agents in the swarm ecosystem and can be easily extended through template inheritance or capability additions.
# API Documentation v2.0.0

## Overview

The Qwen Swarm API v2.0.0 provides comprehensive RESTful and WebSocket interfaces for interacting with the swarm orchestration system. This version includes enhanced capabilities for specialty agents, advanced analytics, real-time monitoring, and intelligent optimization.

## 🚀 New in v2.0.0

- **Enhanced Provider Management**: Dynamic routing and load balancing
- **Specialty Agent Registry**: 125+ pre-integrated agents with management APIs
- **Real-time Analytics**: Performance monitoring and optimization recommendations
- **Feedback System**: Continuous improvement through user feedback
- **Configuration Hot-Reload**: Live configuration updates
- **Advanced Monitoring**: Enhanced health checks and alerting
- **WebSocket Enhancements**: Real-time updates and streaming capabilities

## 🔗 Base URLs

- **Production**: `https://api.qwen-swarm.com/v2`
- **Staging**: `https://staging-api.qwen-swarm.com/v2`
- **Development**: `http://localhost:3000/api/v2`
- **WebSocket**: `ws://localhost:3001/ws` (Development) / `wss://api.qwen-swarm.com/ws` (Production)

## 🔐 Authentication

### JWT Authentication (Recommended)

```http
Authorization: Bearer <jwt-token>
```

### API Key Authentication

```http
X-API-Key: <api-key>
```

### Session Authentication

```http
X-Session-ID: <session-id>
```

## 📊 Core API Endpoints

### System Management

#### Get System Status
```http
GET /system/status
```

**Response:**
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "uptime": 86400,
  "components": {
    "api": "healthy",
    "database": "healthy",
    "queue": "healthy",
    "agents": "healthy"
  },
  "metrics": {
    "totalAgents": 25,
    "activeTasks": 12,
    "requestsPerSecond": 150
  }
}
```

#### Get System Health
```http
GET /system/health
```

**Response:**
```json
{
  "overall": "healthy",
  "checks": [
    {
      "name": "database",
      "status": "healthy",
      "responseTime": 15,
      "lastCheck": "2024-01-15T10:30:00Z"
    },
    {
      "name": "provider-qwen",
      "status": "healthy",
      "responseTime": 120,
      "lastCheck": "2024-01-15T10:30:05Z"
    }
  ],
  "alerts": []
}
```

#### Get System Metrics
```http
GET /system/metrics
```

**Query Parameters:**
- `timeRange` (optional): `1h`, `24h`, `7d`, `30d` (default: `24h`)
- `granularity` (optional): `minute`, `hour`, `day` (default: `hour`)

**Response:**
```json
{
  "timeRange": "24h",
  "granularity": "hour",
  "metrics": {
    "requests": {
      "total": 15000,
      "average": 625,
      "peak": 1200
    },
    "responseTime": {
      "average": 85,
      "p50": 70,
      "p95": 150,
      "p99": 300
    },
    "errors": {
      "rate": 0.02,
      "total": 300,
      "byType": {
        "timeout": 150,
        "rate_limit": 100,
        "provider_error": 50
      }
    },
    "agents": {
      "total": 25,
      "active": 18,
      "idle": 7
    }
  }
}
```

## 🤖 Agent Management APIs

### Agent Lifecycle

#### List All Agents
```http
GET /agents
```

**Query Parameters:**
- `status` (optional): `active`, `idle`, `error`
- `type` (optional): `queen`, `worker`, `specialist`
- `provider` (optional): Filter by provider
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "agents": [
    {
      "id": "agent_123",
      "name": "Code Reviewer",
      "type": "specialist",
      "status": "active",
      "provider": "openai",
      "model": "gpt-4",
      "capabilities": ["code-review", "security"],
      "metrics": {
        "tasksCompleted": 1250,
        "averageResponseTime": 450,
        "successRate": 0.98
      },
      "createdAt": "2024-01-10T08:00:00Z",
      "lastActive": "2024-01-15T10:25:00Z"
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

#### Get Agent Details
```http
GET /agents/{agentId}
```

**Response:**
```json
{
  "id": "agent_123",
  "name": "Code Reviewer",
  "type": "specialist",
  "status": "active",
  "provider": "openai",
  "model": "gpt-4",
  "configuration": {
    "temperature": 0.3,
    "maxTokens": 4000,
    "systemPrompt": "You are an expert code reviewer..."
  },
  "capabilities": ["code-review", "security", "performance"],
  "metrics": {
    "tasksCompleted": 1250,
    "averageResponseTime": 450,
    "successRate": 0.98,
    "costPerTask": 0.015,
    "userSatisfaction": 4.6
  },
  "health": {
    "status": "healthy",
    "lastHealthCheck": "2024-01-15T10:30:00Z",
    "uptime": 99.8
  },
  "createdAt": "2024-01-10T08:00:00Z",
  "updatedAt": "2024-01-15T09:00:00Z"
}
```

#### Create New Agent
```http
POST /agents
```

**Request Body:**
```json
{
  "name": "Custom Analyst",
  "type": "specialist",
  "provider": "claude",
  "model": "claude-2",
  "configuration": {
    "temperature": 0.5,
    "maxTokens": 8000,
    "systemPrompt": "You are a data analyst specializing in..."
  },
  "capabilities": ["data-analysis", "visualization"],
  "autoScaling": {
    "enabled": true,
    "minInstances": 1,
    "maxInstances": 5
  }
}
```

**Response:**
```json
{
  "id": "agent_456",
  "name": "Custom Analyst",
  "type": "specialist",
  "status": "initializing",
  "createdAt": "2024-01-15T10:35:00Z"
}
```

#### Update Agent
```http
PUT /agents/{agentId}
```

#### Delete Agent
```http
DELETE /agents/{agentId}
```

### Agent Operations

#### Scale Agent Pool
```http
POST /agents/{agentId}/scale
```

**Request Body:**
```json
{
  "instances": 3,
  "reason": "Increased workload"
}
```

#### Execute Agent
```http
POST /agents/{agentId}/execute
```

**Request Body:**
```json
{
  "task": "Review this code for security issues",
  "input": {
    "code": "function getUser(id) { return db.query('SELECT * FROM users WHERE id = ?', [id]); }",
    "language": "javascript",
    "context": "User authentication module"
  },
  "options": {
    "priority": "high",
    "timeout": 30000,
    "callback": "https://webhook.example.com/complete"
  }
}
```

**Response:**
```json
{
  "taskId": "task_789",
  "status": "queued",
  "estimatedDuration": 5000,
  "queuePosition": 2
}
```

#### Get Agent Execution Status
```http
GET /agents/{agentId}/tasks/{taskId}
```

**Response:**
```json
{
  "taskId": "task_789",
  "agentId": "agent_123",
  "status": "completed",
  "progress": 100,
  "startTime": "2024-01-15T10:35:00Z",
  "endTime": "2024-01-15T10:35:05Z",
  "result": {
    "summary": "SQL injection vulnerability detected",
    "issues": [
      {
        "type": "security",
        "severity": "high",
        "line": 1,
        "description": "Potential SQL injection vulnerability"
      }
    ],
    "recommendations": [
      "Use parameterized queries or prepared statements"
    ]
  },
  "metrics": {
    "executionTime": 5000,
    "tokensUsed": 250,
    "cost": 0.012
  }
}
```

## 🎯 Specialty Agent Registry APIs

### Registry Management

#### List Available Specialty Agents
```http
GET /registry/agents
```

**Query Parameters:**
- `category` (optional): Filter by category
- `provider` (optional): Filter by provider
- `capabilities` (optional): Filter by capabilities
- `installed` (optional): `true`, `false`

**Response:**
```json
{
  "agents": [
    {
      "id": "code-reviewer",
      "name": "Advanced Code Reviewer",
      "category": "Quality & Security",
      "description": "Comprehensive code review with security analysis",
      "version": "2.1.0",
      "provider": "VoltAgent",
      "capabilities": ["code-review", "security", "performance"],
      "languages": ["javascript", "typescript", "python", "java"],
      "installed": true,
      "rating": 4.8,
      "downloads": 15420,
      "metadata": {
        "author": "VoltAgent",
        "repository": "https://github.com/VoltAgent/awesome-claude-code-subagents",
        "license": "MIT",
        "lastUpdated": "2024-01-14T15:30:00Z"
      }
    }
  ],
  "categories": [
    "Core Development",
    "Language Specialists",
    "Infrastructure",
    "Quality & Security",
    "Data & AI",
    "Developer Experience",
    "Specialized Domains",
    "Business & Product",
    "Meta Orchestration",
    "Research & Analysis"
  ],
  "pagination": {
    "total": 125,
    "limit": 50,
    "offset": 0
  }
}
```

#### Search Specialty Agents
```http
GET /registry/agents/search
```

**Query Parameters:**
- `q` (required): Search query
- `category` (optional): Filter by category
- `language` (optional): Filter by programming language
- `rating` (optional): Minimum rating (0-5)

**Response:**
```json
{
  "query": "typescript security",
  "results": [
    {
      "id": "typescript-security-auditor",
      "name": "TypeScript Security Auditor",
      "category": "Quality & Security",
      "score": 0.95,
      "matchReasons": [
        "typescript expertise",
        "security specialization",
        "audit capabilities"
      ]
    }
  ],
  "total": 3,
  "searchTime": 45
}
```

#### Get Agent Definition
```http
GET /registry/agents/{agentId}
```

**Response:**
```json
{
  "id": "code-reviewer",
  "name": "Advanced Code Reviewer",
  "version": "2.1.0",
  "description": "Comprehensive code review with security analysis and performance optimization",
  "category": "Quality & Security",
  "author": "VoltAgent",
  "license": "MIT",
  "repository": "https://github.com/VoltAgent/awesome-claude-code-subagents",
  "documentation": "https://docs.example.com/code-reviewer",
  "capabilities": [
    {
      "name": "code-review",
      "description": "Comprehensive code quality analysis"
    },
    {
      "name": "security",
      "description": "Security vulnerability detection"
    },
    {
      "name": "performance",
      "description": "Performance optimization suggestions"
    }
  ],
  "languages": ["javascript", "typescript", "python", "java", "go"],
  "configuration": {
    "required": ["apiKey"],
    "optional": ["temperature", "maxTokens"],
    "schema": {
      "temperature": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.3
      }
    }
  },
  "examples": [
    {
      "name": "Basic Code Review",
      "input": {
        "code": "function example() { return 'hello'; }",
        "language": "javascript"
      }
    }
  ],
  "metrics": {
    "downloads": 15420,
    "rating": 4.8,
    "reviews": 342
  }
}
```

### Agent Installation & Management

#### Install Custom Agent
```http
POST /registry/agents
```

**Request Body:**
```json
{
  "source": "https://github.com/myorg/custom-agent",
  "name": "my-custom-agent",
  "autoUpdate": true,
  "configuration": {
    "apiKey": "${MY_API_KEY}",
    "endpoint": "https://api.example.com"
  }
}
```

#### Uninstall Agent
```http
DELETE /registry/agents/{agentId}
```

#### Load Agent for Execution
```http
PUT /registry/agents/{agentId}/load
```

**Request Body:**
```json
{
  "configuration": {
    "temperature": 0.5,
    "maxTokens": 4000
  },
  "instanceCount": 2
}
```

#### Unload Agent
```http
DELETE /registry/agents/{agentId}/unload
```

#### Execute Specialty Agent
```http
POST /registry/agents/{agentId}/execute
```

**Request Body:**
```json
{
  "input": {
    "code": "const data = await fetch('/api/users');",
    "language": "typescript",
    "context": "Frontend data fetching"
  },
  "options": {
    "depth": "comprehensive",
    "includeSecurity": true,
    "format": "markdown"
  }
}
```

### Registry Statistics

#### Get Registry Statistics
```http
GET /registry/stats
```

**Response:**
```json
{
  "totalAgents": 125,
  "installedAgents": 42,
  "categories": {
    "Core Development": 15,
    "Language Specialists": 20,
    "Infrastructure": 18,
    "Quality & Security": 25,
    "Data & AI": 22,
    "Developer Experience": 12,
    "Specialized Domains": 8,
    "Business & Product": 3,
    "Meta Orchestration": 2
  },
  "topDownloads": [
    { "id": "code-reviewer", "downloads": 15420 },
    { "id": "database-architect", "downloads": 12350 },
    { "id": "kubernetes-master", "downloads": 10980 }
  ],
  "recentUpdates": [
    {
      "agentId": "performance-analyzer",
      "previousVersion": "1.8.0",
      "newVersion": "1.9.0",
      "updateDate": "2024-01-14T10:00:00Z"
    }
  ]
}
```

#### Update Registry from Sources
```http
POST /registry/update
```

**Request Body:**
```json
{
  "sources": [
    "https://github.com/VoltAgent/awesome-claude-code-subagents",
    "https://github.com/myorg/custom-agents"
  ],
  "force": false
}
```

## 📈 Analytics & Monitoring APIs

### Performance Analytics

#### Get Real-time Metrics
```http
GET /analytics/metrics
```

**Query Parameters:**
- `metrics` (optional): Comma-separated list of metrics
- `timeRange` (optional): Time window for data
- `aggregation` (optional): `avg`, `min`, `max`, `sum`

**Response:**
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "metrics": {
    "requestsPerSecond": 150.5,
    "averageResponseTime": 85.2,
    "errorRate": 0.018,
    "activeAgents": 18,
    "queueLength": 3,
    "costPerHour": 12.45
  },
  "trends": {
    "requestsPerSecond": {
      "change": "+15%",
      "direction": "up"
    },
    "averageResponseTime": {
      "change": "-8%",
      "direction": "down"
    }
  }
}
```

#### Get Bottleneck Analysis
```http
GET /analytics/bottlenecks
```

**Response:**
```json
{
  "analysis": {
    "primaryBottleneck": {
      "component": "database",
      "impact": "high",
      "description": "Database query latency affecting 15% of requests",
      "recommendations": [
        "Add database indexes",
        "Implement query caching",
        "Consider read replicas"
      ]
    },
    "secondaryBottlenecks": [
      {
        "component": "provider-queue",
        "impact": "medium",
        "description": "OpenAI API rate limiting",
        "recommendations": ["Enable provider load balancing"]
      }
    ]
  },
  "impactAnalysis": {
    "performanceLoss": "25%",
    "costIncrease": "18%",
    "userImpact": "medium"
  }
}
```

#### Get Optimization Recommendations
```http
GET /analytics/recommendations
```

**Query Parameters:**
- `type` (optional): `performance`, `cost`, `quality`, `all`
- `priority` (optional): `high`, `medium`, `low`
- `impact` (optional): `significant`, `moderate`, `minimal`

**Response:**
```json
{
  "recommendations": [
    {
      "id": "rec_001",
      "type": "performance",
      "priority": "high",
      "title": "Enable Response Caching",
      "description": "Implement response caching to reduce API calls by 40%",
      "impact": {
        "performance": "+35%",
        "cost": "-25%",
        "implementation": "medium"
      },
      "steps": [
        "Enable caching in configuration",
        "Set appropriate TTL values",
        "Monitor cache hit rates"
      ],
      "estimatedEffort": "2 hours",
      "riskLevel": "low"
    },
    {
      "id": "rec_002",
      "type": "cost",
      "priority": "medium",
      "title": "Optimize Provider Selection",
      "description": "Switch to cost-optimized routing for non-critical tasks",
      "impact": {
        "cost": "-30%",
        "performance": "-5%",
        "implementation": "low"
      }
    }
  ]
}
```

### Cost Analytics

#### Get Cost Analysis
```http
GET /analytics/costs
```

**Query Parameters:**
- `timeRange` (optional): `24h`, `7d`, `30d` (default: `7d`)
- `breakdown` (optional): `provider`, `agent`, `task`
- `forecast` (optional): `true`, `false`

**Response:**
```json
{
  "timeRange": "7d",
  "totalCost": 245.67,
  "breakdown": {
    "byProvider": {
      "openai": 145.20,
      "claude": 67.45,
      "qwen": 33.02
    },
    "byAgent": {
      "code-reviewer": 89.30,
      "database-architect": 45.20,
      "frontend-developer": 67.80
    },
    "byTask": {
      "code-review": 134.50,
      "architecture": 56.20,
      "implementation": 54.97
    }
  },
  "trends": {
    "dailyAverage": 35.10,
    "weeklyChange": "+12%",
    "forecast": {
      "nextWeek": 275.00,
      "nextMonth": 1100.00
    }
  },
  "optimizations": {
    "potentialSavings": 45.30,
    "topOpportunity": "Provider optimization"
  }
}
```

#### Export Analytics Data
```http
POST /analytics/export
```

**Request Body:**
```json
{
  "format": "csv",
  "timeRange": "30d",
  "metrics": ["costs", "performance", "usage"],
  "filters": {
    "agents": ["code-reviewer", "database-architect"],
    "providers": ["openai", "claude"]
  }
}
```

## ⚙️ Configuration Management APIs

### Configuration Operations

#### Get Current Configuration
```http
GET /config
```

**Response:**
```json
{
  "system": {
    "name": "Production Swarm",
    "version": "2.0.0",
    "environment": "production",
    "logLevel": "info"
  },
  "agents": {
    "maxInstances": 50,
    "autoScaling": true,
    "defaultTimeout": 30000
  },
  "providers": {
    "routing": "intelligent",
    "fallback": true,
    "loadBalancing": "weighted"
  },
  "optimization": {
    "enabled": true,
    "autoApply": false,
    "strategies": ["performance", "cost", "quality"]
  }
}
```

#### Update Configuration
```http
PUT /config
```

**Request Body:**
```json
{
  "agents": {
    "maxInstances": 75,
    "autoScaling": {
      "enabled": true,
      "metrics": ["cpu", "queue_length"],
      "thresholds": {
        "scaleUp": 0.8,
        "scaleDown": 0.3
      }
    }
  },
  "optimization": {
    "autoApply": true,
    "approvalRequired": ["high_risk", "cost_increase"]
  }
}
```

#### Hot-Reload Configuration
```http
POST /config/reload
```

**Response:**
```json
{
  "success": true,
  "reloadedAt": "2024-01-15T10:35:00Z",
  "affectedComponents": [
    "agent-manager",
    "provider-router",
    "optimization-engine"
  ],
  "changes": {
    "updated": 12,
    "added": 3,
    "removed": 1
  }
}
```

#### Validate Configuration
```http
GET /config/validate
```

**Response:**
```json
{
  "valid": false,
  "errors": [
    {
      "path": "agents.maxInstances",
      "message": "Value exceeds system limit of 100",
      "severity": "error"
    }
  ],
  "warnings": [
    {
      "path": "providers.routing",
      "message": "Experimental routing strategy",
      "severity": "warning"
    }
  ]
}
```

## 🔄 Feedback System APIs

### Performance Feedback

#### Submit Performance Feedback
```http
POST /feedback/performance
```

**Request Body:**
```json
{
  "taskId": "task_789",
  "agentId": "agent_123",
  "metrics": {
    "responseTime": 1200,
    "expectedTime": 500,
    "quality": 4,
    "satisfaction": 3
  },
  "feedback": "Response was slower than expected but quality was good",
  "context": {
    "taskType": "code-review",
    "complexity": "high",
    "user": "user_456"
  }
}
```

#### Get Optimization Recommendations
```http
GET /feedback/recommendations
```

**Query Parameters:**
- `agentId` (optional): Filter by agent
- `timeRange` (optional): Time window for feedback analysis

**Response:**
```json
{
  "recommendations": [
    {
      "type": "performance",
      "agentId": "agent_123",
      "issue": "Slow response times for complex tasks",
      "suggestion": "Increase timeout or optimize task processing",
      "confidence": 0.85,
      "feedbackCount": 15
    }
  ],
  "summary": {
    "totalFeedback": 234,
    "averageRating": 4.2,
    "topIssues": ["response_time", "cost", "quality"]
  }
}
```

#### Trigger Auto-Optimization
```http
POST /feedback/auto-optimize
```

**Request Body:**
```json
{
  "targets": ["performance", "cost"],
  "scope": "agent_123",
  "approvalRequired": false
}
```

## 🌐 WebSocket API

### Connection

#### Establish Connection
```javascript
const ws = new WebSocket('ws://localhost:3001/ws', {
  headers: {
    'X-Agent-ID': 'agent_123',
    'X-Session-ID': 'session_456'
  }
});
```

### Message Format

#### Real-time Updates
```json
{
  "type": "metric_update",
  "timestamp": "2024-01-15T10:35:00Z",
  "data": {
    "metric": "response_time",
    "value": 85.5,
    "agent": "agent_123",
    "trend": "decreasing"
  }
}
```

#### Agent Status Updates
```json
{
  "type": "agent_status",
  "timestamp": "2024-01-15T10:35:00Z",
  "data": {
    "agentId": "agent_123",
    "status": "active",
    "currentTask": "task_789",
    "progress": 75
  }
}
```

#### System Alerts
```json
{
  "type": "alert",
  "timestamp": "2024-01-15T10:35:00Z",
  "data": {
    "severity": "warning",
    "message": "High error rate detected",
    "component": "provider-openai",
    "metrics": {
      "errorRate": 0.08,
      "threshold": 0.05
    }
  }
}
```

### WebSocket Commands

#### Subscribe to Updates
```json
{
  "command": "subscribe",
  "channels": ["metrics", "agents", "alerts"],
  "filters": {
    "agents": ["agent_123", "agent_456"],
    "severity": ["warning", "critical"]
  }
}
```

#### Unsubscribe from Updates
```json
{
  "command": "unsubscribe",
  "channels": ["metrics"]
}
```

#### Get Current State
```json
{
  "command": "get_state",
  "components": ["agents", "system", "metrics"]
}
```

## 🔧 Task Management APIs

### Task Operations

#### Submit Task
```http
POST /tasks
```

**Request Body:**
```json
{
  "type": "code-review",
  "agent": "code-reviewer",
  "priority": "high",
  "input": {
    "code": "function processData(data) { return data.map(item => item.value); }",
    "language": "javascript",
    "requirements": ["security", "performance"]
  },
  "options": {
    "timeout": 60000,
    "callback": "https://webhook.example.com/complete",
    "metadata": {
      "userId": "user_123",
      "projectId": "project_456"
    }
  }
}
```

**Response:**
```json
{
  "taskId": "task_101112",
  "status": "queued",
  "estimatedDuration": 8000,
  "queuePosition": 1,
  "createdAt": "2024-01-15T10:35:00Z"
}
```

#### Get Task Status
```http
GET /tasks/{taskId}
```

**Response:**
```json
{
  "taskId": "task_101112",
  "status": "running",
  "progress": 65,
  "agent": {
    "id": "agent_123",
    "name": "Code Reviewer"
  },
  "startTime": "2024-01-15T10:35:00Z",
  "estimatedCompletion": "2024-01-15T10:35:08Z",
  "currentStep": "Analyzing code patterns"
}
```

#### List Tasks
```http
GET /tasks
```

**Query Parameters:**
- `status` (optional): `queued`, `running`, `completed`, `failed`
- `agent` (optional): Filter by agent ID
- `priority` (optional): `high`, `medium`, `low`
- `limit` (optional): Number of results
- `offset` (optional): Pagination offset

#### Cancel Task
```http
DELETE /tasks/{taskId}
```

### Task Chains

#### Create Task Chain
```http
POST /tasks/chains
```

**Request Body:**
```json
{
  "name": "Comprehensive Code Analysis",
  "tasks": [
    {
      "agent": "static-analyzer",
      "input": {"code": "...", "language": "typescript"},
      "dependsOn": []
    },
    {
      "agent": "security-auditor",
      "input": {"code": "...", "language": "typescript"},
      "dependsOn": ["task_1"]
    },
    {
      "agent": "performance-analyzer",
      "input": {"code": "...", "language": "typescript"},
      "dependsOn": ["task_1"]
    },
    {
      "agent": "code-reviewer",
      "input": {
        "analysis": "${task_1.result}",
        "security": "${task_2.result}",
        "performance": "${task_3.result}"
      },
      "dependsOn": ["task_1", "task_2", "task_3"]
    }
  ]
}
```

## 📚 Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "AGENT_NOT_FOUND",
    "message": "Agent with ID 'invalid_agent' not found",
    "details": {
      "agentId": "invalid_agent",
      "timestamp": "2024-01-15T10:35:00Z",
      "requestId": "req_789"
    },
    "suggestions": [
      "Verify the agent ID is correct",
      "Check if the agent is installed"
    ]
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Request body validation failed |
| `UNAUTHORIZED` | 401 | Authentication required or failed |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `AGENT_NOT_FOUND` | 404 | Agent not found |
| `TASK_NOT_FOUND` | 404 | Task not found |
| `RATE_LIMITED` | 429 | Too many requests |
| `AGENT_ERROR` | 500 | Agent execution failed |
| `SYSTEM_ERROR` | 500 | Internal system error |
| `PROVIDER_ERROR` | 502 | External provider error |

## 🚀 Rate Limiting

### Rate Limit Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642248600
```

### Rate Limits by Endpoint

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| System APIs | 1000/hour | Per IP |
| Agent APIs | 500/hour | Per agent |
| Analytics APIs | 200/hour | Per user |
| Configuration APIs | 50/hour | Per user |

## 📋 SDKs & Libraries

### Official SDKs

#### Node.js SDK
```javascript
import { QwenSwarm } from '@qwen-swarm/sdk';

const client = new QwenSwarm({
  apiKey: 'your-api-key',
  baseUrl: 'http://localhost:3000/api/v2'
});

// Create agent
const agent = await client.agents.create({
  name: 'My Agent',
  type: 'specialist',
  provider: 'openai'
});

// Execute task
const result = await client.agents.execute(agent.id, {
  task: 'Analyze this code',
  input: { code: '...' }
});
```

#### Python SDK
```python
from qwen_swarm import QwenSwarmClient

client = QwenSwarmClient(
    api_key='your-api-key',
    base_url='http://localhost:3000/api/v2'
)

# List agents
agents = client.agents.list(status='active')

# Execute specialty agent
result = client.registry.execute_agent(
    'code-reviewer',
    input={'code': '...', 'language': 'python'}
)
```

#### Web SDK
```javascript
import { QwenSwarmWeb } from '@qwen-swarm/web-sdk';

const client = new QwenSwarmWeb({
  apiKey: 'your-api-key',
  websocketUrl: 'ws://localhost:3001/ws'
});

// Real-time updates
client.on('agent:status', (data) => {
  console.log('Agent status changed:', data);
});

// Submit task
const task = await client.tasks.submit({
  type: 'code-review',
  input: { code: '...' }
});
```

## 🔍 API Testing

### Testing with cURL

```bash
# Get system status
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v2/system/status

# Create agent
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Agent", "type": "specialist"}' \
  http://localhost:3000/api/v2/agents

# Execute specialty agent
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"input": {"code": "console.log('hello')", "language": "javascript"}}' \
  http://localhost:3000/api/v2/registry/agents/code-reviewer/execute
```

### Postman Collection

A comprehensive Postman collection is available at:
`/docs/postman/qwen-swarm-api-v2.json`

---

**API v2.0.0 - Comprehensive Swarm Orchestration Interface**

*Last Updated: January 15, 2024*
# Qwen Swarm Operations Guide

This guide covers day-to-day operations, maintenance, and troubleshooting for the Qwen Swarm system.

## Table of Contents

1. [System Overview](#system-overview)
2. [Daily Operations](#daily-operations)
3. [Monitoring & Alerting](#monitoring--alerting)
4. [Maintenance Procedures](#maintenance-procedures)
5. [Performance Tuning](#performance-tuning)
6. [Incident Response](#incident-response)
7. [Capacity Planning](#capacity-planning)
8. [Runbooks](#runbooks)

## System Overview

### Architecture Components

- **API Layer**: RESTful API with WebSocket support
- **Agent Management**: Dynamic agent lifecycle management
- **Communication Layer**: Real-time inter-agent communication
- **Consensus Engine**: Distributed decision-making
- **Memory System**: Persistent data storage and retrieval
- **Learning Engine**: Self-improvement capabilities
- **Security Framework**: Authentication and authorization

### Key Services

| Service | Port | Purpose | Health Check |
|---------|------|---------|--------------|
| qwen-swarm-api | 3000 | Main API server | `/health` |
| qwen-swarm-ws | 3001 | WebSocket server | `/ws/health` |
| postgres | 5432 | Primary database | pg_isready |
| redis | 6379 | Cache and session store | redis-cli ping |
| prometheus | 9090 | Metrics collection | `/api/v1/status/config` |
| grafana | 3000 | Monitoring dashboard | `/api/health` |

## Daily Operations

### Morning Checks (8:00 AM)

1. **System Health Verification**

```bash
# Check overall system status
curl -f https://api.yourdomain.com/health

# Check Kubernetes cluster
kubectl get nodes
kubectl get pods -n qwen-swarm-prod

# Check database connectivity
kubectl exec -n qwen-swarm-prod deployment/postgres -- pg_isready

# Check Redis
kubectl exec -n qwen-swarm-prod deployment/redis -- redis-cli ping
```

2. **Review Metrics**

- Access Grafana: https://grafana.yourdomain.com
- Check system overview dashboard
- Verify error rates < 1%
- Confirm response times < 1s (95th percentile)

3. **Review Logs**

```bash
# Check recent error logs
kubectl logs -n qwen-swarm-prod deployment/qwen-swarm --since=1h | grep ERROR

# Check application logs
kubectl logs -n qwen-swarm-prod deployment/qwen-swarm --tail=100
```

4. **Backup Verification**

```bash
# Verify last night's backup
aws s3 ls s3://qwen-swarm-backups/database-backups/ --recursive | tail -5
```

### Continuous Monitoring

1. **Real-time Dashboards**
   - System Overview
   - API Performance
   - Agent Activity
   - Resource Usage

2. **Alert Monitoring**
   - Critical alerts: Immediate response
   - Warning alerts: Review within 1 hour
   - Info alerts: Review daily

3. **Log Monitoring**
   - Error patterns
   - Security events
   - Performance anomalies

### Evening Procedures (5:00 PM)

1. **Daily Summary**
   - Review incident reports
   - Check performance trends
   - Document any issues

2. **Backup Status**
   - Verify daily backups completed
   - Check backup integrity
   - Confirm offsite storage

3. **Capacity Review**
   - Resource utilization trends
   - Storage capacity
   - Network usage

## Monitoring & Alerting

### Key Performance Indicators (KPIs)

#### System Health Metrics
- **Uptime**: > 99.9%
- **Response Time**: 95th percentile < 1s
- **Error Rate**: < 1%
- **Throughput**: > 100 requests/second

#### Business Metrics
- **Active Agents**: Minimum 2, target 5-10
- **Task Processing Rate**: > 10 tasks/second
- **Task Queue Length**: < 100 tasks
- **Consensus Success Rate**: > 95%

#### Infrastructure Metrics
- **CPU Usage**: < 70% average
- **Memory Usage**: < 80% average
- **Disk Usage**: < 85%
- **Network Latency**: < 10ms

### Alert Thresholds

| Metric | Warning | Critical | Response Time |
|--------|---------|----------|---------------|
| Error Rate | > 1% | > 5% | 5 min / 1 min |
| Response Time | > 1s | > 5s | 15 min / 5 min |
| CPU Usage | > 70% | > 90% | 30 min / 10 min |
| Memory Usage | > 80% | > 95% | 30 min / 10 min |
| Disk Usage | > 85% | > 95% | 1 hour / 15 min |
| Database Connections | > 80% | > 95% | 15 min / 5 min |

### Monitoring Setup

1. **Prometheus Alerts**

```yaml
# monitoring/alert_rules.yml
groups:
- name: qwen-swarm.rules
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
```

2. **Grafana Dashboards**

Pre-configured dashboards:
- System Overview
- API Performance
- Database Performance
- Infrastructure Metrics
- Business Metrics

3. **Log Aggregation**

```yaml
# Vector configuration for log collection
sources:
  qwen_swarm_logs:
    type: kubernetes_logs
    auto_partial_merge: true
    namespace: qwen-swarm-prod
```

## Maintenance Procedures

### Weekly Maintenance

#### 1. Security Updates (Tuesdays, 2:00 AM)

```bash
# Check for security updates
npm audit

# Update dependencies
npm update

# Rebuild and deploy
docker build -t qwen-swarm:latest .
./scripts/deploy/deploy-production.sh
```

#### 2. Performance Analysis (Wednesdays)

```bash
# Generate performance report
kubectl top pods -n qwen-swarm-prod --no-headers | awk '{sum+=$3} END {print "Average CPU:", sum/NR "%"}'

# Check slow queries
kubectl exec -n qwen-swarm-prod deployment/postgres -- psql -U qwen_prod_user -d qwen_swarm_prod -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

#### 3. Backup Verification (Thursdays)

```bash
# Test restore process
./scripts/backup/test-restore.sh --env staging
```

### Monthly Maintenance

#### 1. Capacity Planning (First Monday)

- Review resource utilization trends
- Update capacity forecasts
- Plan infrastructure scaling

#### 2. Security Review (Second Monday)

- Review access logs
- Update security policies
- Rotate secrets and keys

#### 3. Performance Optimization (Third Monday)

- Analyze performance bottlenecks
- Optimize database queries
- Tune application configuration

### Quarterly Maintenance

#### 1. Disaster Recovery Testing

```bash
# Schedule DR test
./scripts/disaster-recovery/test-dr.sh --env staging

# Update DR documentation
```

#### 2. Major Updates

- Kubernetes version updates
- Database version upgrades
- Major dependency updates

#### 3. Architecture Review

- Review system architecture
- Plan future improvements
- Update documentation

## Performance Tuning

### Database Optimization

#### PostgreSQL Tuning

```sql
-- Check database statistics
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE tablename = 'agents';

-- Analyze slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Update statistics
ANALYZE;
```

#### Configuration Optimization

```postgresql
# postgresql.conf
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
```

### Application Optimization

#### Node.js Tuning

```bash
# Environment variables
NODE_OPTIONS="--max-old-space-size=4096"
UV_THREADPOOL_SIZE=16
```

#### Caching Strategy

```javascript
// Redis caching configuration
const cacheConfig = {
  client: 'redis',
  ttl: 300, // 5 minutes
  max: 1000, // max items
  updateAgeOnGet: true
};
```

### Infrastructure Tuning

#### Kubernetes Resource Limits

```yaml
resources:
  requests:
    memory: "2Gi"
    cpu: "1000m"
  limits:
    memory: "8Gi"
    cpu: "4000m"
```

#### Horizontal Pod Autoscaling

```yaml
spec:
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Incident Response

### Incident Categories

#### Severity 1 - Critical
- System down
- Data loss or corruption
- Security breach
- Impact: All users affected

#### Severity 2 - High
- Significant performance degradation
- Major feature unavailable
- Data inconsistency
- Impact: Most users affected

#### Severity 3 - Medium
- Minor performance issues
- Some features unavailable
- Non-critical bugs
- Impact: Some users affected

#### Severity 4 - Low
- Cosmetic issues
- Documentation errors
- Minor inconveniences
- Impact: Few users affected

### Incident Response Process

#### 1. Detection (0-5 minutes)

```bash
# Check alerts
kubectl get events -n qwen-swarm-prod --sort-by='.lastTimestamp' | tail -10

# Check system health
curl -f https://api.yourdomain.com/health
```

#### 2. Assessment (5-15 minutes)

- Determine incident severity
- Identify affected components
- Estimate impact scope
- Initiate communication

#### 3. Response (15-60 minutes)

- Implement immediate fixes
- Scale resources if needed
- Restore services
- Monitor recovery

#### 4. Resolution (1-4 hours)

- Verify service restoration
- Monitor for stability
- Document incident
- Plan improvements

### Communication Procedures

#### Internal Communication

```bash
# Create incident channel
slack create-channel --name "incident-$(date +%Y%m%d-%H%M%S)"

# Notify team
slack notify --channel "#on-call" --message "Severity 1 incident detected: System down"
```

#### External Communication

- Status page updates
- Customer notifications
- Social media updates
- Executive briefings

### Post-Incident Review

#### Review Timeline (Within 24 hours)

1. **Immediate Review** (First 2 hours)
   - What happened
   - Immediate response
   - Current status

2. **Detailed Review** (Within 24 hours)
   - Root cause analysis
   - Timeline reconstruction
   - Improvement opportunities

3. **Follow-up Review** (Within 1 week)
   - Implementation status
   - Additional improvements
   - Lessons learned

#### Review Template

```markdown
# Incident Review: [Incident Title]

## Summary
- Date: [Date]
- Duration: [Duration]
- Severity: [Severity]
- Impact: [Impact description]

## Timeline
- [Time]: [Event]
- [Time]: [Event]
- [Time]: [Event]

## Root Cause
[Root cause analysis]

## Resolution
[Resolution steps]

## Impact Assessment
[Business impact]
[User impact]

## Lessons Learned
[What went well]
[What could be improved]

## Action Items
- [ ] [Action item 1]
- [ ] [Action item 2]
- [ ] [Action item 3]
```

## Capacity Planning

### Monitoring Trends

#### Resource Utilization

```bash
# CPU trend analysis
kubectl top pods -n qwen-swarm-prod --no-headers | awk '{print $3}' | sed 's/%//' | awk '{sum+=$1; count++} END {print "Average CPU:", sum/count "%"}'

# Memory trend analysis
kubectl top pods -n qwen-swarm-prod --no-headers | awk '{print $4}' | sed 's/Mi//' | awk '{sum+=$1; count++} END {print "Average Memory:", sum/count "Mi"}'
```

#### Growth Projections

- Historical data analysis
- Business growth forecasts
- Seasonal patterns
- New feature impact

### Scaling Strategies

#### Vertical Scaling

- Increase pod resource limits
- Upgrade node resources
- Optimize application performance

#### Horizontal Scaling

- Add more replicas
- Implement auto-scaling
- Load balancing optimization

#### Architectural Scaling

- Microservice decomposition
- Database sharding
- Caching layers
- CDN implementation

### Planning Timeline

#### 3-Month Outlook
- Current capacity utilization
- Planned feature releases
- Seasonal demand changes
- Hardware refresh cycles

#### 6-Month Outlook
- Infrastructure upgrades
- Major feature launches
- Business expansion plans
- Technology stack updates

#### 12-Month Outlook
- Architecture evolution
- Multi-region deployment
- Disaster recovery improvements
- Cost optimization initiatives

## Runbooks

### System Down

#### Symptoms
- Health checks failing
- API returning 503 errors
- Users cannot access services

#### Immediate Actions
```bash
# Check pod status
kubectl get pods -n qwen-swarm-prod

# Restart deployment
kubectl rollout restart deployment/qwen-swarm -n qwen-swarm-prod

# Check resource limits
kubectl describe pod <pod-name> -n qwen-swarm-prod
```

#### Escalation
- If not resolved in 5 minutes: escalate to Severity 1
- Contact on-call engineer
- Create incident channel

### High Error Rate

#### Symptoms
- 5xx errors increasing
- User complaints about failures
- Monitoring alerts triggered

#### Diagnosis
```bash
# Check error logs
kubectl logs -n qwen-swarm-prod deployment/qwen-swarm --since=5m | grep ERROR

# Check database connectivity
kubectl exec -n qwen-swarm-prod deployment/postgres -- pg_isready

# Check resource usage
kubectl top pods -n qwen-swarm-prod
```

#### Resolution
- Scale up resources if needed
- Restart problematic services
- Rollback recent changes

### Database Issues

#### Symptoms
- Database connection errors
- Slow query performance
- Transaction failures

#### Diagnosis
```bash
# Check database pod
kubectl get pods -n qwen-swarm-prod -l app=postgres

# Check database metrics
kubectl exec -n qwen-swarm-prod deployment/postgres -- psql -U qwen_prod_user -d qwen_swarm_prod -c "SELECT * FROM pg_stat_activity;"

# Check slow queries
kubectl exec -n qwen-swarm-prod deployment/postgres -- psql -U qwen_prod_user -d qwen_swarm_prod -c "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

#### Resolution
- Restart database if needed
- Optimize slow queries
- Scale database resources

### Performance Degradation

#### Symptoms
- Response times increasing
- User complaints about slowness
- Performance alerts

#### Diagnosis
```bash
# Check resource usage
kubectl top pods -n qwen-swarm-prod

# Check application metrics
curl -s https://api.yourdomain.com/metrics | grep request_duration

# Profile application
kubectl exec -n qwen-swarm-prod deployment/qwen-swarm -- node --inspect=0.0.0.0:9229 dist/index.js
```

#### Resolution
- Scale horizontally
- Optimize application code
- Add caching layers

### Security Incident

#### Symptoms
- Unauthorized access attempts
- Security alerts triggered
- Data breach indicators

#### Immediate Actions
```bash
# Block suspicious IPs
kubectl annotate namespace qwen-swarm-prod "net.beta.kubernetes.io/ingress.block-cidrs=192.168.1.100/32"

# Rotate secrets
kubectl delete secret qwen-swarm-api-keys -n qwen-swarm-prod
kubectl create secret generic qwen-swarm-api-keys --from-literal=qwen-api-key=NEW_KEY

# Enable audit logging
kubectl patch configmap qwen-swarm-config -p '{"data":{"audit-enabled":"true"}}'
```

#### Investigation
- Review access logs
- Analyze security events
- Assess data impact

#### Recovery
- Patch vulnerabilities
- Update security policies
- Notify stakeholders

## Support & Escalation

### Support Tiers

#### Tier 1: Basic Support
- System monitoring
- Basic troubleshooting
- Incident documentation
- Response time: 30 minutes

#### Tier 2: Advanced Support
- Complex troubleshooting
- Performance optimization
- Security incident response
- Response time: 15 minutes

#### Tier 3: Expert Support
- Architecture issues
- Disaster recovery
- Critical incidents
- Response time: 5 minutes

### Escalation Procedures

#### When to Escalate
- Incident not resolved in SLA time
- Severity 1 or 2 incidents
- Security breaches
- Data loss or corruption

#### Escalation Contacts
- **Team Lead**: team-lead@yourdomain.com
- **Engineering Manager**: eng-manager@yourdomain.com
- **VP Engineering**: vp-eng@yourdomain.com
- **CTO**: cto@yourdomain.com

### Documentation Updates

- Update runbooks after each incident
- Review and update quarterly
- Maintain change logs
- Share lessons learned

---

For additional support or questions, contact the operations team at ops@yourdomain.com or visit the internal wiki at https://wiki.yourdomain.com/qwen-swarm.
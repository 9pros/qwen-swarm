# Qwen Swarm Production Deployment Guide

This guide provides comprehensive instructions for deploying Qwen Swarm to production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Configuration](#configuration)
4. [Deployment Methods](#deployment-methods)
5. [Monitoring & Observability](#monitoring--observability)
6. [Security](#security)
7. [Backup & Recovery](#backup--recovery)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### Infrastructure Requirements

- **Kubernetes Cluster**: v1.25 or higher
- **Node Requirements**: Minimum 3 nodes, 8GB RAM, 4 CPU cores each
- **Storage**: 200GB+ persistent storage
- **Load Balancer**: For external access
- **Ingress Controller**: NGINX or similar
- **Certificate Manager**: For SSL/TLS certificates

### Software Requirements

- **Docker**: v20.10 or higher
- **kubectl**: v1.25 or higher
- **Helm**: v3.8 or higher
- **Node.js**: v18 or higher (for local development)
- **PostgreSQL**: v15 or higher
- **Redis**: v7 or higher

### Access Requirements

- Kubernetes cluster admin access
- Container registry access (Docker Hub, ECR, GCR, etc.)
- DNS management access
- SSL certificate management

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/qwen-swarm.git
cd qwen-swarm
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Namespaces

```bash
kubectl create namespace qwen-swarm-prod
kubectl create namespace qwen-swarm-staging
kubectl create namespace monitoring
```

### 4. Setup Container Registry

```bash
# Login to your container registry
docker login your-registry.com

# Build and push initial image
docker build -t your-registry.com/qwen-swarm:latest .
docker push your-registry.com/qwen-swarm:latest
```

## Configuration

### Environment Variables

Create a `.env.production` file:

```bash
# System Configuration
NODE_ENV=production
LOG_LEVEL=info
API_PORT=3000
WS_PORT=3001

# Database Configuration
DB_TYPE=postgresql
DB_HOST=postgres-service
DB_PORT=5432
DB_NAME=qwen_swarm_prod
DB_USERNAME=qwen_prod_user
DB_PASSWORD=your_secure_password

# Redis Configuration
REDIS_ENABLED=true
REDIS_HOST=redis-service
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Security Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this
ENCRYPTION_ENABLED=true
AUDIT_ENABLED=true

# Provider Configuration
QWEN_API_KEY=your_qwen_api_key
OPENAI_API_KEY=your_openai_api_key
CLAUDE_API_KEY=your_claude_api_key

# Monitoring Configuration
MONITORING_ENABLED=true
METRICS_INTERVAL=30000
HEALTH_CHECK_INTERVAL=30000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### Kubernetes Secrets

Create secrets for sensitive data:

```bash
# Database secrets
kubectl create secret generic qwen-swarm-db-secrets \
  --from-literal=db-name=qwen_swarm_prod \
  --from-literal=db-username=qwen_prod_user \
  --from-literal=db-password=your_secure_password \
  -n qwen-swarm-prod

# API keys
kubectl create secret generic qwen-swarm-api-keys \
  --from-literal=qwen-api-key=your_qwen_api_key \
  --from-literal=openai-api-key=your_openai_api_key \
  --from-literal=claude-api-key=your_claude_api_key \
  -n qwen-swarm-prod

# JWT secret
kubectl create secret generic qwen-swarm-jwt \
  --from-literal=jwt-secret=your_super_secret_jwt_key_change_this \
  -n qwen-swarm-prod
```

### SSL Certificates

Setup SSL certificates using cert-manager:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@yourdomain.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
```

## Deployment Methods

### Method 1: Kustomize Deployment (Recommended)

1. **Prepare Environment Files**

```bash
cp k8s/overlays/production/kustomization.yaml k8s/overlays/production/kustomization.yaml.bak
```

2. **Update Configuration**

Edit the production overlay files:
- `k8s/overlays/production/kustomization.yaml`
- `k8s/overlays/production/resources.yaml`
- `k8s/overlays/production/autoscaling.yaml`

3. **Deploy**

```bash
cd k8s/overlays/production
kustomize build . | kubectl apply -f -
```

4. **Verify Deployment**

```bash
kubectl get pods -n qwen-swarm-prod
kubectl rollout status deployment/qwen-swarm -n qwen-swarm-prod
```

### Method 2: Using Deployment Script

Use the automated deployment script:

```bash
# Production deployment
./scripts/deploy/deploy-production.sh

# With options
./scripts/deploy/deploy-production.sh --dry-run
./scripts/deploy/deploy-production.sh --skip-tests --force
```

### Method 3: Helm Chart

If you prefer Helm (requires chart setup):

```bash
# Add repository
helm repo add qwen-swarm https://charts.yourdomain.com
helm repo update

# Install
helm install qwen-swarm qwen-swarm/qwen-swarm \
  --namespace qwen-swarm-prod \
  --values values-production.yaml

# Upgrade
helm upgrade qwen-swarm qwen-swarm/qwen-swarm \
  --namespace qwen-swarm-prod \
  --values values-production.yaml
```

## Monitoring & Observability

### Prometheus Stack

Deploy the monitoring stack:

```bash
# Deploy monitoring components
kubectl apply -f monitoring/
```

### Grafana Dashboards

Access Grafana at `https://grafana.yourdomain.com`:

- Default dashboards are pre-installed
- Custom dashboards in `monitoring/grafana/dashboards/`
- Data sources configured in `monitoring/grafana/datasources/`

### Key Metrics

Monitor these critical metrics:

- **System Health**: `/health` endpoint status
- **Response Time**: 95th percentile < 1s
- **Error Rate**: < 1% for all endpoints
- **Memory Usage**: < 80% of allocated memory
- **CPU Usage**: < 70% of allocated CPU
- **Task Queue Length**: < 100 tasks
- **Active Agents**: > 2 agents
- **WebSocket Connections**: Monitor connection count

### Alerting

Configure alerts in AlertManager:

```yaml
# monitoring/alertmanager.yml
global:
  smtp_smarthost: 'smtp.yourdomain.com:587'
  smtp_from: 'alerts@yourdomain.com'

route:
  receiver: 'web.hook'
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h

receivers:
- name: 'web.hook'
  slack_configs:
  - api_url: 'YOUR_SLACK_WEBHOOK_URL'
    channel: '#alerts'
    title: 'Qwen Swarm Alert'
```

## Security

### Network Policies

Apply network policies:

```bash
kubectl apply -f k8s/overlays/production/security.yaml
```

### Pod Security Policies

Ensure pods run with least privilege:

```bash
kubectl get psp
kubectl describe psp qwen-swarm-psp
```

### Security Scanning

Run regular security scans:

```bash
# Security audit
./security/scripts/security-scan.sh

# Container scanning
trivy image your-registry.com/qwen-swarm:latest

# Kubernetes security
kube-linter lint k8s/
```

### Access Control

- RBAC configured for Kubernetes access
- API authentication via JWT and API keys
- Network policies restrict pod communication
- Secrets encrypted at rest

## Backup & Recovery

### Database Backups

Automated daily backups:

```bash
# Manual backup
./scripts/backup/backup-database.sh --env production

# Schedule daily backups
0 2 * * * /path/to/qwen-swarm/scripts/backup/backup-database.sh --env production --upload-s3
```

### Configuration Backups

Backup Kubernetes configurations:

```bash
# Backup all resources
kubectl get all -n qwen-swarm-prod -o yaml > backup-config-$(date +%Y%m%d).yaml

# Backup secrets (encrypted)
kubectl get secrets -n qwen-swarm-prod -o yaml | gpg --symmetric --output secrets-$(date +%Y%m%d).gpg
```

### Disaster Recovery

1. **Restore Database**

```bash
kubectl exec -i -n qwen-swarm-prod deployment/postgres -- psql -U qwen_prod_user -d qwen_swarm_prod < database_backup.sql
```

2. **Restore Configuration**

```bash
kubectl apply -f backup-config-YYYYMMDD.yaml
```

3. **Verify Recovery**

```bash
kubectl get pods -n qwen-swarm-prod
curl -f https://api.yourdomain.com/health
```

## Troubleshooting

### Common Issues

#### 1. Pods Not Starting

```bash
# Check pod status
kubectl get pods -n qwen-swarm-prod

# Check pod events
kubectl describe pod <pod-name> -n qwen-swarm-prod

# Check logs
kubectl logs <pod-name> -n qwen-swarm-prod
```

#### 2. Database Connection Issues

```bash
# Check PostgreSQL pod
kubectl get pods -n qwen-swarm-prod -l app=postgres

# Test database connection
kubectl exec -it -n qwen-swarm-prod deployment/postgres -- psql -U qwen_prod_user -d qwen_swarm_prod -c "SELECT 1;"

# Check database secrets
kubectl get secret qwen-swarm-db-secrets -n qwen-swarm-prod -o yaml
```

#### 3. High Memory Usage

```bash
# Check resource usage
kubectl top pods -n qwen-swarm-prod

# Check pod resource limits
kubectl describe pod <pod-name> -n qwen-swarm-prod | grep -A 10 Limits

# Scale deployment if needed
kubectl scale deployment qwen-swarm --replicas=5 -n qwen-swarm-prod
```

#### 4. SSL Certificate Issues

```bash
# Check certificate status
kubectl get certificate -n qwen-swarm-prod

# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager

# Manually renew certificate
kubectl delete certificate qwen-swarm-tls -n qwen-swarm-prod
```

### Debug Mode

Enable debug logging:

```bash
# Update config map
kubectl patch configmap qwen-swarm-config -n qwen-swarm-prod --patch '{"data":{"log-level":"debug"}}'

# Restart deployment
kubectl rollout restart deployment/qwen-swarm -n qwen-swarm-prod
```

### Performance Issues

1. **Check Metrics**

```bash
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Open http://localhost:9090
```

2. **Database Performance**

```bash
# Check slow queries
kubectl exec -it -n qwen-swarm-prod deployment/postgres -- psql -U qwen_prod_user -d qwen_swarm_prod -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

3. **Resource Scaling**

```bash
# Check HPA status
kubectl get hpa -n qwen-swarm-prod

# Manual scaling
kubectl scale deployment qwen-swarm --replicas=10 -n qwen-swarm-prod
```

## Rollback Procedures

### Quick Rollback

```bash
# Rollback to previous revision
kubectl rollout undo deployment/qwen-swarm -n qwen-swarm-prod

# Rollback to specific revision
kubectl rollout undo deployment/qwen-swarm --to-revision=2 -n qwen-swarm-prod

# Check rollback status
kubectl rollout status deployment/qwen-swarm -n qwen-swarm-prod
```

### Full Recovery

```bash
# Scale to zero
kubectl scale deployment qwen-swarm --replicas=0 -n qwen-swarm-prod

# Restore from backup
kubectl apply -f backup-config-YYYYMMDD.yaml

# Scale up
kubectl scale deployment qwen-swarm --replicas=3 -n qwen-swarm-prod

# Verify
kubectl get pods -n qwen-swarm-prod
curl -f https://api.yourdomain.com/health
```

## Maintenance Windows

### Scheduled Maintenance

1. **Notify Users**: Send notification 24 hours in advance
2. **Drain Connections**: Gradually reduce new connections
3. **Scale Down**: Reduce replicas to minimum
4. **Apply Updates**: Perform updates and maintenance
5. **Scale Up**: Restore full capacity
6. **Verify**: Check all systems are operational

### Blue-Green Deployment

```bash
# Deploy to green environment
kubectl apply -f k8s/overlays/staging/ -n qwen-swarm-green

# Test green environment
curl -f https://green-api.yourdomain.com/health

# Switch traffic
kubectl patch service qwen-swarm-service -p '{"spec":{"selector":{"version":"green"}}}'

# Monitor and cleanup
# ... (monitoring logic)
```

## Support

For deployment issues:

1. Check this documentation first
2. Review logs and metrics
3. Check GitHub Issues
4. Contact the deployment team

**Emergency Contacts**:
- DevOps Team: devops@yourdomain.com
- On-call Engineer: +1-555-0123
- Slack: #qwen-swarm-alerts
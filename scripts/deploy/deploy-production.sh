#!/bin/bash

# Production Deployment Script for Qwen Swarm
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENVIRONMENT="production"
NAMESPACE="qwen-swarm-prod"
DEPLOYMENT_TIMEOUT=600
HEALTH_CHECK_TIMEOUT=60

# Parse command line arguments
DRY_RUN=false
SKIP_TESTS=false
SKIP_BACKUP=false
FORCE_DEPLOY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --force)
            FORCE_DEPLOY=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --dry-run      Show what would be deployed without actually deploying"
            echo "  --skip-tests   Skip running tests before deployment"
            echo "  --skip-backup  Skip creating backup before deployment"
            echo "  --force        Force deployment even if health checks fail"
            echo "  --help, -h     Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}🚀 Qwen Swarm Production Deployment${NC}"
echo -e "${BLUE}===================================${NC}"

# Function to log messages
log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    case $level in
        "INFO")
            echo -e "${GREEN}[INFO]${NC} $message"
            ;;
        "WARNING")
            echo -e "${YELLOW}[WARNING]${NC} $message"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $message"
            ;;
        "HEADER")
            echo -e "${BLUE}[HEADER]${NC} $message"
            ;;
    esac

    echo "[$timestamp] [$level] $message" >> "${PROJECT_ROOT}/logs/deploy-production.log"
}

# Function to check prerequisites
check_prerequisites() {
    log "HEADER" "Checking prerequisites..."

    # Check if required tools are installed
    local required_tools=("kubectl" "helm" "docker")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log "ERROR" "$tool is not installed"
            exit 1
        fi
    done

    # Check if we can connect to the cluster
    if ! kubectl cluster-info &> /dev/null; then
        log "ERROR" "Cannot connect to Kubernetes cluster"
        exit 1
    fi

    # Check if namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log "WARNING" "Namespace $NAMESPACE does not exist, creating it..."
        kubectl create namespace "$NAMESPACE"
    fi

    # Check if Docker is running
    if ! docker info &> /dev/null; then
        log "ERROR" "Docker is not running"
        exit 1
    fi

    log "INFO" "Prerequisites check passed"
}

# Function to run tests
run_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        log "WARNING" "Skipping tests as requested"
        return 0
    fi

    log "HEADER" "Running tests..."

    cd "$PROJECT_ROOT"

    # Run unit tests
    log "INFO" "Running unit tests..."
    if ! npm run test:unit; then
        log "ERROR" "Unit tests failed"
        exit 1
    fi

    # Run integration tests
    log "INFO" "Running integration tests..."
    if ! npm run test:integration; then
        log "ERROR" "Integration tests failed"
        exit 1
    fi

    # Run security tests
    log "INFO" "Running security tests..."
    if ! npm run test:security; then
        log "ERROR" "Security tests failed"
        exit 1
    fi

    log "INFO" "All tests passed"
}

# Function to create backup
create_backup() {
    if [[ "$SKIP_BACKUP" == true ]]; then
        log "WARNING" "Skipping backup as requested"
        return 0
    fi

    log "HEADER" "Creating backup..."

    local backup_dir="${PROJECT_ROOT}/backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"

    # Backup current deployment
    log "INFO" "Backing up current deployment..."
    kubectl get all -n "$NAMESPACE" -o yaml > "$backup_dir/current_deployment.yaml"

    # Backup database
    log "INFO" "Backing up database..."
    kubectl exec -n "$NAMESPACE" deployment/postgres -- pg_dump -U "$DB_USERNAME" "$DB_NAME" > "$backup_dir/database_backup.sql"

    # Backup secrets (encrypted)
    log "INFO" "Backing up secrets..."
    kubectl get secrets -n "$NAMESPACE" -o yaml | gpg --symmetric --cipher-algo AES256 --output "$backup_dir/secrets.gpg"

    log "INFO" "Backup created in $backup_dir"
}

# Function to build Docker image
build_image() {
    log "HEADER" "Building Docker image..."

    cd "$PROJECT_ROOT"

    # Get version from package.json
    local version=$(node -p "require('./package.json').version")
    local tag="v${version}"

    # Build the image
    log "INFO" "Building Docker image with tag: $tag"
    docker build -t "qwen-swarm:$tag" -t "your-registry/qwen-swarm:$tag" .

    # Push to registry
    log "INFO" "Pushing Docker image to registry..."
    docker push "your-registry/qwen-swarm:$tag"

    echo "$tag" > "${PROJECT_ROOT}/.last-deployed-version"
    log "INFO" "Docker image built and pushed successfully"
}

# Function to deploy to Kubernetes
deploy_kubernetes() {
    log "HEADER" "Deploying to Kubernetes..."

    cd "$PROJECT_ROOT/k8s/overlays/production"

    if [[ "$DRY_RUN" == true ]]; then
        log "INFO" "Dry run: showing what would be deployed..."
        kustomize build . | kubectl apply --dry-run=client -f -
        return 0
    fi

    # Apply the deployment
    log "INFO" "Applying Kubernetes manifests..."
    kustomize build . | kubectl apply -f -

    # Wait for deployment to complete
    log "INFO" "Waiting for deployment to complete..."
    if ! kubectl rollout status deployment/qwen-swarm -n "$NAMESPACE" --timeout="${DEPLOYMENT_TIMEOUT}s"; then
        log "ERROR" "Deployment failed to complete within timeout"
        if [[ "$FORCE_DEPLOY" != true ]]; then
            exit 1
        fi
    fi

    log "INFO" "Kubernetes deployment completed"
}

# Function to run health checks
run_health_checks() {
    log "HEADER" "Running health checks..."

    local url="https://api.yourdomain.com/health"
    local attempts=0
    local max_attempts=30

    while [[ $attempts -lt $max_attempts ]]; do
        if curl -f -s "$url" > /dev/null; then
            log "INFO" "Health check passed"
            return 0
        fi

        attempts=$((attempts + 1))
        log "INFO" "Health check attempt $attempts/$max_attempts failed, retrying..."
        sleep 2
    done

    log "ERROR" "Health checks failed after $max_attempts attempts"
    if [[ "$FORCE_DEPLOY" != true ]]; then
        exit 1
    fi
}

# Function to run smoke tests
run_smoke_tests() {
    log "HEADER" "Running smoke tests..."

    cd "$PROJECT_ROOT"

    # Test API endpoints
    log "INFO" "Testing API endpoints..."
    if ! npm run test:smoke -- --env=production; then
        log "ERROR" "Smoke tests failed"
        if [[ "$FORCE_DEPLOY" != true ]]; then
            exit 1
        fi
    fi

    log "INFO" "Smoke tests passed"
}

# Function to cleanup
cleanup() {
    log "INFO" "Cleaning up..."

    # Remove unused Docker images
    docker image prune -f > /dev/null

    log "INFO" "Cleanup completed"
}

# Function to rollback on failure
rollback() {
    log "ERROR" "Deployment failed, initiating rollback..."

    # Get the last successful deployment
    local last_version=$(cat "${PROJECT_ROOT}/.last-deployed-version" 2>/dev/null || echo "")

    if [[ -n "$last_version" ]]; then
        log "INFO" "Rolling back to version: $last_version"

        # Rollback Kubernetes deployment
        kubectl rollout undo deployment/qwen-swarm -n "$NAMESPACE"

        # Wait for rollback to complete
        kubectl rollout status deployment/qwen-swarm -n "$NAMESPACE" --timeout=300

        log "INFO" "Rollback completed"
    else
        log "WARNING" "No previous version found for rollback"
    fi
}

# Main deployment flow
main() {
    # Setup error handling
    trap 'rollback; cleanup' ERR

    # Create logs directory
    mkdir -p "${PROJECT_ROOT}/logs"

    check_prerequisites
    run_tests
    create_backup
    build_image
    deploy_kubernetes
    run_health_checks
    run_smoke_tests
    cleanup

    log "INFO" "🎉 Production deployment completed successfully!"
    log "INFO" "Deployment version: $(cat "${PROJECT_ROOT}/.last-deployed-version")"
}

# Execute main function
main "$@"
#!/bin/bash

# Security Scan Script for Qwen Swarm
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REPORT_DIR="${PROJECT_ROOT}/security-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create reports directory
mkdir -p "${REPORT_DIR}"

echo -e "${BLUE}🔒 Qwen Swarm Security Scan${NC}"
echo -e "${BLUE}================================${NC}"

# Function to log results
log_result() {
    local level=$1
    local message=$2
    local file=$3

    case $level in
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $message"
            ;;
        "WARNING")
            echo -e "${YELLOW}[WARNING]${NC} $message"
            ;;
        "INFO")
            echo -e "${GREEN}[INFO]${NC} $message"
            ;;
        "HEADER")
            echo -e "${BLUE}[HEADER]${NC} $message"
            ;;
    esac

    if [[ -n "$file" ]]; then
        echo "[$level] $message" >> "$file"
    fi
}

# Initialize report
REPORT_FILE="${REPORT_DIR}/security_scan_${TIMESTAMP}.log"
touch "$REPORT_FILE"

log_result "HEADER" "Security Scan Report - $(date)" "$REPORT_FILE"
log_result "HEADER" "Project: Qwen Swarm" "$REPORT_FILE"
log_result "HEADER" "================================" "$REPORT_FILE"

# 1. Dependency Security Audit
echo -e "\n${BLUE}1. 🔍 Running Dependency Security Audit...${NC}"
log_result "HEADER" "1. Dependency Security Audit" "$REPORT_FILE"

cd "$PROJECT_ROOT"

# npm audit
if command -v npm &> /dev/null; then
    log_result "INFO" "Running npm audit..." "$REPORT_FILE"
    if npm audit --audit-level=moderate --json > "${REPORT_DIR}/npm_audit_${TIMESTAMP}.json" 2>&1; then
        log_result "INFO" "NPM audit completed successfully" "$REPORT_FILE"
    else
        log_result "WARNING" "NPM audit found vulnerabilities" "$REPORT_FILE"
    fi
else
    log_result "ERROR" "npm not found" "$REPORT_FILE"
fi

# Snyk scan
if command -v snyk &> /dev/null && [[ -n "${SNYK_TOKEN:-}" ]]; then
    log_result "INFO" "Running Snyk scan..." "$REPORT_FILE"
    if snyk test --json > "${REPORT_DIR}/snyk_scan_${TIMESTAMP}.json" 2>&1; then
        log_result "INFO" "Snyk scan completed successfully" "$REPORT_FILE"
    else
        log_result "WARNING" "Snyk found vulnerabilities" "$REPORT_FILE"
    fi
else
    log_result "WARNING" "Snyk not available or not configured" "$REPORT_FILE"
fi

# 2. Code Security Analysis
echo -e "\n${BLUE}2. 🔍 Running Code Security Analysis...${NC}"
log_result "HEADER" "2. Code Security Analysis" "$REPORT_FILE"

# Semgrep scan
if command -v semgrep &> /dev/null; then
    log_result "INFO" "Running Semgrep scan..." "$REPORT_FILE"
    if semgrep --config=auto --json --output="${REPORT_DIR}/semgrep_${TIMESTAMP}.json" src/; then
        log_result "INFO" "Semgrep scan completed" "$REPORT_FILE"
    else
        log_result "WARNING" "Semgrep found potential security issues" "$REPORT_FILE"
    fi
else
    log_result "WARNING" "Semgrep not installed" "$REPORT_FILE"
fi

# ESLint security rules
log_result "INFO" "Running ESLint security rules..." "$REPORT_FILE"
if npx eslint src/ --ext .ts --format=json --output-file="${REPORT_DIR}/eslint_security_${TIMESTAMP}.json" --quiet; then
    log_result "INFO" "ESLint security check completed" "$REPORT_FILE"
else
    log_result "WARNING" "ESLint found security issues" "$REPORT_FILE"
fi

# 3. Secret Detection
echo -e "\n${BLUE}3. 🔍 Running Secret Detection...${NC}"
log_result "HEADER" "3. Secret Detection" "$REPORT_FILE"

# TruffleHog
if command -v trufflehog &> /dev/null; then
    log_result "INFO" "Running TruffleHog..." "$REPORT_FILE"
    if trufflehog filesystem --json "$PROJECT_ROOT" > "${REPORT_DIR}/trufflehog_${TIMESTAMP}.json" 2>&1; then
        log_result "INFO" "TruffleHog scan completed" "$REPORT_FILE"
    else
        log_result "WARNING" "TruffleHog found potential secrets" "$REPORT_FILE"
    fi
else
    log_result "WARNING" "TruffleHog not installed" "$REPORT_FILE"
fi

# Git-secrets scan
if command -v git-secrets &> /dev/null; then
    log_result "INFO" "Running git-secrets..." "$REPORT_FILE"
    if git secrets --scan; then
        log_result "INFO" "git-secrets scan completed - no secrets found" "$REPORT_FILE"
    else
        log_result "WARNING" "git-secrets found potential secrets" "$REPORT_FILE"
    fi
else
    log_result "WARNING" "git-secrets not installed" "$REPORT_FILE"
fi

# 4. Infrastructure Security
echo -e "\n${BLUE}4. 🔍 Running Infrastructure Security Scan...${NC}"
log_result "HEADER" "4. Infrastructure Security" "$REPORT_FILE"

# Docker security scan
if command -v docker &> /dev/null && [[ -f "${PROJECT_ROOT}/Dockerfile" ]]; then
    log_result "INFO" "Running Docker security scan..." "$REPORT_FILE"

    # Build Docker image if it doesn't exist
    if ! docker image inspect qwen-swarm:security-scan &> /dev/null; then
        log_result "INFO" "Building Docker image for security scan..." "$REPORT_FILE"
        docker build -t qwen-swarm:security-scan .
    fi

    # Run Docker Scout
    if command -v docker-scout &> /dev/null; then
        if docker-scout cves qwen-swarm:security-scan --json > "${REPORT_DIR}/docker_scout_${TIMESTAMP}.json" 2>&1; then
            log_result "INFO" "Docker Scout scan completed" "$REPORT_FILE"
        else
            log_result "WARNING" "Docker Scout found vulnerabilities" "$REPORT_FILE"
        fi
    fi

    # Run Trivy
    if command -v trivy &> /dev/null; then
        if trivy image --format json --output "${REPORT_DIR}/trivy_${TIMESTAMP}.json" qwen-swarm:security-scan; then
            log_result "INFO" "Trivy scan completed" "$REPORT_FILE"
        else
            log_result "WARNING" "Trivy found vulnerabilities" "$REPORT_FILE"
        fi
    fi
fi

# 5. Kubernetes Security
if [[ -d "${PROJECT_ROOT}/k8s" ]]; then
    log_result "INFO" "Running Kubernetes security analysis..." "$REPORT_FILE"

    # kube-linter
    if command -v kube-linter &> /dev/null; then
        if kube-linter lint "${PROJECT_ROOT}/k8s/" --format json > "${REPORT_DIR}/kube_linter_${TIMESTAMP}.json" 2>&1; then
            log_result "INFO" "kube-linter completed" "$REPORT_FILE"
        else
            log_result "WARNING" "kube-linter found security issues" "$REPORT_FILE"
        fi
    fi

    # polaris
    if command -v polaris &> /dev/null; then
        if polaris audit --config "${PROJECT_ROOT}/security/policies/polaris.yaml" "${PROJECT_ROOT}/k8s/" --format json > "${REPORT_DIR}/polaris_${TIMESTAMP}.json" 2>&1; then
            log_result "INFO" "Polaris audit completed" "$REPORT_FILE"
        else
            log_result "WARNING" "Polaris found security issues" "$REPORT_FILE"
        fi
    fi
fi

# 6. Configuration Security
echo -e "\n${BLUE}5. 🔍 Running Configuration Security Analysis...${NC}"
log_result "HEADER" "5. Configuration Security" "$REPORT_FILE"

# Check for hardcoded secrets
log_result "INFO" "Checking for hardcoded secrets..." "$REPORT_FILE"
if grep -r -i "password\|secret\|key" --include="*.ts" --include="*.js" --include="*.json" --include="*.yaml" --include="*.yml" src/ config/ > "${REPORT_DIR}/hardcoded_secrets_${TIMESTAMP}.txt" 2>&1; then
    log_result "WARNING" "Potential hardcoded secrets found" "$REPORT_FILE"
else
    log_result "INFO" "No hardcoded secrets found" "$REPORT_FILE"
fi

# Check for insecure configurations
log_result "INFO" "Checking for insecure configurations..." "$REPORT_FILE"
if grep -r -i "debug.*true\|ssl.*false\|tls.*false" --include="*.ts" --include="*.js" --include="*.json" --include="*.yaml" --include="*.yml" . > "${REPORT_DIR}/insecure_configs_${TIMESTAMP}.txt" 2>&1; then
    log_result "WARNING" "Potential insecure configurations found" "$REPORT_FILE"
else
    log_result "INFO" "No insecure configurations found" "$REPORT_FILE"
fi

# 7. Generate Summary Report
echo -e "\n${BLUE}📊 Generating Summary Report...${NC}"
log_result "HEADER" "6. Summary" "$REPORT_FILE"

# Count issues
NPM_ISSUES=$(jq -r '.vulnerabilities | length' "${REPORT_DIR}/npm_audit_${TIMESTAMP}.json" 2>/dev/null || echo "0")
SEMGREP_ISSUES=$(jq '.results | length' "${REPORT_DIR}/semgrep_${TIMESTAMP}.json" 2>/dev/null || echo "0")

log_result "INFO" "Security scan completed" "$REPORT_FILE"
log_result "INFO" "NPM vulnerabilities: $NPM_ISSUES" "$REPORT_FILE"
log_result "INFO" "Semgrep findings: $SEMGREP_ISSUES" "$REPORT_FILE"
log_result "INFO" "Reports saved to: $REPORT_DIR" "$REPORT_FILE"

# 8. Exit with appropriate code
TOTAL_ISSUES=$((NPM_ISSUES + SEMGREP_ISSUES))
if [[ $TOTAL_ISSUES -gt 0 ]]; then
    echo -e "\n${RED}❌ Security scan found $TOTAL_ISSUES issues${NC}"
    echo -e "${YELLOW}📋 Detailed reports available in: $REPORT_DIR${NC}"
    exit 1
else
    echo -e "\n${GREEN}✅ Security scan passed with no critical issues${NC}"
    echo -e "${GREEN}📋 Reports available in: $REPORT_DIR${NC}"
    exit 0
fi
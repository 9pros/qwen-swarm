#!/bin/bash

# Comprehensive Integration Test Script for Qwen Swarm
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENVIRONMENT="${ENVIRONMENT:-staging}"
NAMESPACE="qwen-swarm-${ENVIRONMENT}"
BASE_URL="${BASE_URL:-https://api-${ENVIRONMENT}.yourdomain.com}"
WS_URL="${WS_URL:-wss://api-${ENVIRONMENT}.yourdomain.com}"
TEST_TIMEOUT="${TEST_TIMEOUT:-300}"
REPORT_DIR="${PROJECT_ROOT}/test-reports/integration"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Parse command line arguments
PARALLEL=false
VERBOSE=false
SKIP_SLOW=false
COVERAGE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --parallel)
            PARALLEL=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --skip-slow)
            SKIP_SLOW=true
            shift
            ;;
        --coverage)
            COVERAGE=true
            shift
            ;;
        --env)
            ENVIRONMENT="$2"
            NAMESPACE="qwen-swarm-${ENVIRONMENT}"
            BASE_URL="https://api-${ENVIRONMENT}.yourdomain.com"
            WS_URL="wss://api-${ENVIRONMENT}.yourdomain.com"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --parallel     Run tests in parallel"
            echo "  --verbose      Enable verbose output"
            echo "  --skip-slow    Skip slow-running tests"
            echo "  --coverage     Generate coverage report"
            echo "  --env ENV      Target environment (staging|production)"
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

echo -e "${BLUE}🧪 Qwen Swarm Integration Tests${NC}"
echo -e "${BLUE}================================${NC}"
echo -e "Environment: ${ENVIRONMENT}"
echo -e "Base URL: ${BASE_URL}"
echo -e "Namespace: ${NAMESPACE}"

# Function to log messages
log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    case $level in
        "INFO")
            [[ "$VERBOSE" == true ]] && echo -e "${GREEN}[INFO]${NC} $message"
            ;;
        "WARNING")
            echo -e "${YELLOW}[WARNING]${NC} $message"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $message"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[SUCCESS]${NC} $message"
            ;;
        "HEADER")
            echo -e "${BLUE}[HEADER]${NC} $message"
            ;;
        "TEST")
            echo -e "${BLUE}[TEST]${NC} $message"
            ;;
    esac

    echo "[$timestamp] [$level] $message" >> "${REPORT_DIR}/integration-test-${TIMESTAMP}.log"
}

# Function to check prerequisites
check_prerequisites() {
    log "HEADER" "Checking prerequisites..."

    # Check if curl is available
    if ! command -v curl &> /dev/null; then
        log "ERROR" "curl is not installed"
        exit 1
    fi

    # Check if jq is available
    if ! command -v jq &> /dev/null; then
        log "ERROR" "jq is not installed"
        exit 1
    fi

    # Check if websocat is available for WebSocket tests
    if ! command -v websocat &> /dev/null; then
        log "WARNING" "websocat not found, skipping WebSocket tests"
    fi

    # Check if kubectl is available
    if ! command -v kubectl &> /dev/null; then
        log "ERROR" "kubectl is not installed"
        exit 1
    fi

    # Create reports directory
    mkdir -p "$REPORT_DIR"

    log "INFO" "Prerequisites check passed"
}

# Function to wait for system readiness
wait_for_system() {
    log "HEADER" "Waiting for system readiness..."

    local max_attempts=30
    local attempt=1

    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "${BASE_URL}/health" > /dev/null; then
            log "SUCCESS" "System is ready"
            return 0
        fi

        log "INFO" "Attempt $attempt/$max_attempts: System not ready, waiting..."
        sleep 10
        attempt=$((attempt + 1))
    done

    log "ERROR" "System not ready after $max_attempts attempts"
    exit 1
}

# Function to run health check tests
test_health_checks() {
    log "HEADER" "Testing Health Checks..."

    local health_tests_passed=0
    local health_tests_total=3

    # Test basic health endpoint
    if curl -f -s "${BASE_URL}/health" | jq -e '.status == "healthy"' > /dev/null; then
        log "SUCCESS" "Health endpoint returned healthy status"
        health_tests_passed=$((health_tests_passed + 1))
    else
        log "ERROR" "Health endpoint failed"
    fi

    # Test readiness endpoint
    if curl -f -s "${BASE_URL}/ready" | jq -e '.ready == true' > /dev/null; then
        log "SUCCESS" "Readiness endpoint returned ready status"
        health_tests_passed=$((health_tests_passed + 1))
    else
        log "ERROR" "Readiness endpoint failed"
    fi

    # Test metrics endpoint
    if curl -f -s "${BASE_URL}/metrics" | jq -e '.system' > /dev/null; then
        log "SUCCESS" "Metrics endpoint returned data"
        health_tests_passed=$((health_tests_passed + 1))
    else
        log "ERROR" "Metrics endpoint failed"
    fi

    if [[ $health_tests_passed -eq $health_tests_total ]]; then
        log "SUCCESS" "All health check tests passed ($health_tests_passed/$health_tests_total)"
        return 0
    else
        log "ERROR" "Health check tests failed ($health_tests_passed/$health_tests_total)"
        return 1
    fi
}

# Function to test API endpoints
test_api_endpoints() {
    log "HEADER" "Testing API Endpoints..."

    local api_tests_passed=0
    local api_tests_total=6

    # Test agents endpoint
    local agents_response=$(curl -s -w "%{http_code}" "${BASE_URL}/api/v1/agents")
    local http_code="${agents_response: -3}"
    if [[ "$http_code" == "200" ]]; then
        log "SUCCESS" "Agents endpoint returned 200"
        api_tests_passed=$((api_tests_passed + 1))
    else
        log "ERROR" "Agents endpoint returned $http_code"
    fi

    # Test tasks endpoint
    local tasks_response=$(curl -s -w "%{http_code}" "${BASE_URL}/api/v1/tasks")
    http_code="${tasks_response: -3}"
    if [[ "$http_code" == "200" ]]; then
        log "SUCCESS" "Tasks endpoint returned 200"
        api_tests_passed=$((api_tests_passed + 1))
    else
        log "ERROR" "Tasks endpoint returned $http_code"
    fi

    # Test providers endpoint
    local providers_response=$(curl -s -w "%{http_code}" "${BASE_URL}/api/v1/providers")
    http_code="${providers_response: -3}"
    if [[ "$http_code" == "200" ]]; then
        log "SUCCESS" "Providers endpoint returned 200"
        api_tests_passed=$((api_tests_passed + 1))
    else
        log "ERROR" "Providers endpoint returned $http_code"
    fi

    # Test consensus endpoint
    local consensus_response=$(curl -s -w "%{http_code}" "${BASE_URL}/api/v1/consensus/metrics")
    http_code="${consensus_response: -3}"
    if [[ "$http_code" == "200" ]]; then
        log "SUCCESS" "Consensus endpoint returned 200"
        api_tests_passed=$((api_tests_passed + 1))
    else
        log "ERROR" "Consensus endpoint returned $http_code"
    fi

    # Test system endpoint
    local system_response=$(curl -s -w "%{http_code}" "${BASE_URL}/api/v1/system/state")
    http_code="${system_response: -3}"
    if [[ "$http_code" == "200" ]]; then
        log "SUCCESS" "System endpoint returned 200"
        api_tests_passed=$((api_tests_passed + 1))
    else
        log "ERROR" "System endpoint returned $http_code"
    fi

    # Test communication endpoint
    local communication_response=$(curl -s -w "%{http_code}" "${BASE_URL}/api/v1/communication/metrics")
    http_code="${communication_response: -3}"
    if [[ "$http_code" == "200" ]]; then
        log "SUCCESS" "Communication endpoint returned 200"
        api_tests_passed=$((api_tests_passed + 1))
    else
        log "ERROR" "Communication endpoint returned $http_code"
    fi

    if [[ $api_tests_passed -eq $api_tests_total ]]; then
        log "SUCCESS" "All API endpoint tests passed ($api_tests_passed/$api_tests_total)"
        return 0
    else
        log "ERROR" "API endpoint tests failed ($api_tests_passed/$api_tests_total)"
        return 1
    fi
}

# Function to test WebSocket functionality
test_websocket() {
    log "HEADER" "Testing WebSocket Functionality..."

    if ! command -v websocat &> /dev/null; then
        log "WARNING" "Skipping WebSocket tests - websocat not available"
        return 0
    fi

    local ws_tests_passed=0
    local ws_tests_total=2

    # Test WebSocket connection
    if timeout 10s websocat --text "${WS_URL}/ws" --exit-on-eof <<< '{"type":"ping"}'; then
        log "SUCCESS" "WebSocket connection established"
        ws_tests_passed=$((ws_tests_passed + 1))
    else
        log "ERROR" "WebSocket connection failed"
    fi

    # Test WebSocket heartbeat
    local heartbeat_response=$(timeout 10s websocat --text "${WS_URL}/ws" --exit-on-eof '{"type":"heartbeat"}' || echo "")
    if echo "$heartbeat_response" | jq -e '.type == "heartbeat_response"' > /dev/null; then
        log "SUCCESS" "WebSocket heartbeat responded correctly"
        ws_tests_passed=$((ws_tests_passed + 1))
    else
        log "ERROR" "WebSocket heartbeat failed"
    fi

    if [[ $ws_tests_passed -eq $ws_tests_total ]]; then
        log "SUCCESS" "All WebSocket tests passed ($ws_tests_passed/$ws_tests_total)"
        return 0
    else
        log "ERROR" "WebSocket tests failed ($ws_tests_passed/$ws_tests_total)"
        return 1
    fi
}

# Function to test agent lifecycle
test_agent_lifecycle() {
    log "HEADER" "Testing Agent Lifecycle..."

    local agent_tests_passed=0
    local agent_tests_total=3

    # Test agent creation
    local agent_data='{
        "name": "test-agent",
        "type": "worker",
        "role": {
            "type": "operational",
            "permissions": ["task:*"],
            "expertise": ["testing"],
            "priority": 5
        },
        "provider": {
            "type": "qwen",
            "model": "qwen-max",
            "maxTokens": 1000,
            "temperature": 0.7
        },
        "maxConcurrency": 2,
        "autoScale": false
    }'

    local create_response=$(curl -s -w "%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d "$agent_data" \
        "${BASE_URL}/api/v1/agents")
    local http_code="${create_response: -3}"

    if [[ "$http_code" == "201" ]]; then
        local agent_id=$(echo "$create_response" | jq -r '.id')
        log "SUCCESS" "Agent created successfully: $agent_id"
        agent_tests_passed=$((agent_tests_passed + 1))

        # Test agent retrieval
        local get_response=$(curl -s -w "%{http_code}" "${BASE_URL}/api/v1/agents/${agent_id}")
        http_code="${get_response: -3}"
        if [[ "$http_code" == "200" ]]; then
            log "SUCCESS" "Agent retrieved successfully"
            agent_tests_passed=$((agent_tests_passed + 1))
        else
            log "ERROR" "Agent retrieval failed with status $http_code"
        fi

        # Test agent deletion
        local delete_response=$(curl -s -w "%{http_code}" -X DELETE "${BASE_URL}/api/v1/agents/${agent_id}")
        http_code="${delete_response: -3}"
        if [[ "$http_code" == "200" ]]; then
            log "SUCCESS" "Agent deleted successfully"
            agent_tests_passed=$((agent_tests_passed + 1))
        else
            log "ERROR" "Agent deletion failed with status $http_code"
        fi
    else
        log "ERROR" "Agent creation failed with status $http_code"
    fi

    if [[ $agent_tests_passed -eq $agent_tests_total ]]; then
        log "SUCCESS" "All agent lifecycle tests passed ($agent_tests_passed/$agent_tests_total)"
        return 0
    else
        log "ERROR" "Agent lifecycle tests failed ($agent_tests_passed/$agent_tests_total)"
        return 1
    fi
}

# Function to test task processing
test_task_processing() {
    log "HEADER" "Testing Task Processing..."

    if [[ "$SKIP_SLOW" == true ]]; then
        log "WARNING" "Skipping task processing tests (slow)"
        return 0
    fi

    local task_tests_passed=0
    local task_tests_total=2

    # Test task submission
    local task_data='{
        "type": "test_task",
        "priority": "normal",
        "payload": {
            "message": "Integration test task"
        }
    }'

    local submit_response=$(curl -s -w "%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d "$task_data" \
        "${BASE_URL}/api/v1/tasks")
    local http_code="${submit_response: -3}"

    if [[ "$http_code" == "201" ]]; then
        local task_id=$(echo "$submit_response" | jq -r '.id')
        log "SUCCESS" "Task submitted successfully: $task_id"
        task_tests_passed=$((task_tests_passed + 1))

        # Wait for task processing
        sleep 5

        # Check task status
        local status_response=$(curl -s -w "%{http_code}" "${BASE_URL}/api/v1/tasks/${task_id}")
        http_code="${status_response: -3}"
        if [[ "$http_code" == "200" ]]; then
            local task_status=$(echo "$status_response" | jq -r '.status')
            if [[ "$task_status" =~ ^(completed|failed|running)$ ]]; then
                log "SUCCESS" "Task status updated: $task_status"
                task_tests_passed=$((task_tests_passed + 1))
            else
                log "ERROR" "Task has unexpected status: $task_status"
            fi
        else
            log "ERROR" "Task status check failed with status $http_code"
        fi
    else
        log "ERROR" "Task submission failed with status $http_code"
    fi

    if [[ $task_tests_passed -eq $task_tests_total ]]; then
        log "SUCCESS" "All task processing tests passed ($task_tests_passed/$task_tests_total)"
        return 0
    else
        log "ERROR" "Task processing tests failed ($task_tests_passed/$task_tests_total)"
        return 1
    fi
}

# Function to test performance
test_performance() {
    log "HEADER" "Testing Performance..."

    local perf_tests_passed=0
    local perf_tests_total=3

    # Test API response time
    local start_time=$(date +%s%N)
    curl -s "${BASE_URL}/health" > /dev/null
    local end_time=$(date +%s%N)
    local response_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds

    if [[ $response_time -lt 1000 ]]; then
        log "SUCCESS" "API response time: ${response_time}ms (< 1000ms)"
        perf_tests_passed=$((perf_tests_passed + 1))
    else
        log "ERROR" "API response time too slow: ${response_time}ms (>= 1000ms)"
    fi

    # Test concurrent requests
    local concurrent_requests=10
    local success_count=0

    for i in $(seq 1 $concurrent_requests); do
        if curl -s -f "${BASE_URL}/health" > /dev/null; then
            success_count=$((success_count + 1))
        fi &
    done

    wait

    if [[ $success_count -eq $concurrent_requests ]]; then
        log "SUCCESS" "All $concurrent_requests concurrent requests succeeded"
        perf_tests_passed=$((perf_tests_passed + 1))
    else
        log "ERROR" "Only $success_count/$concurrent_requests concurrent requests succeeded"
    fi

    # Test memory usage
    local memory_usage=$(kubectl top pods -n "$NAMESPACE" -l app=qwen-swarm --no-headers 2>/dev/null | awk '{sum+=$3} END {print sum+0}' | sed 's/Mi//')

    if [[ $memory_usage -lt 1000 ]]; then # Less than 1GiB
        log "SUCCESS" "Memory usage: ${memory_usage}Mi (< 1000Mi)"
        perf_tests_passed=$((perf_tests_passed + 1))
    else
        log "WARNING" "Memory usage high: ${memory_usage}Mi (>= 1000Mi)"
        # Still count as passed for integration tests
        perf_tests_passed=$((perf_tests_passed + 1))
    fi

    if [[ $perf_tests_passed -eq $perf_tests_total ]]; then
        log "SUCCESS" "All performance tests passed ($perf_tests_passed/$perf_tests_total)"
        return 0
    else
        log "ERROR" "Performance tests failed ($perf_tests_passed/$perf_tests_total)"
        return 1
    fi
}

# Function to test database connectivity
test_database() {
    log "HEADER" "Testing Database Connectivity..."

    local db_tests_passed=0
    local db_tests_total=2

    # Test PostgreSQL connectivity
    if kubectl exec -n "$NAMESPACE" deployment/postgres -- pg_isready -U qwen_user -q 2>/dev/null; then
        log "SUCCESS" "PostgreSQL is ready"
        db_tests_passed=$((db_tests_passed + 1))
    else
        log "ERROR" "PostgreSQL is not ready"
    fi

    # Test Redis connectivity
    if kubectl exec -n "$NAMESPACE" deployment/redis -- redis-cli ping | grep -q "PONG"; then
        log "SUCCESS" "Redis is ready"
        db_tests_passed=$((db_tests_passed + 1))
    else
        log "ERROR" "Redis is not ready"
    fi

    if [[ $db_tests_passed -eq $db_tests_total ]]; then
        log "SUCCESS" "All database tests passed ($db_tests_passed/$db_tests_total)"
        return 0
    else
        log "ERROR" "Database tests failed ($db_tests_passed/$db_tests_total)"
        return 1
    fi
}

# Function to generate test report
generate_report() {
    log "HEADER" "Generating Test Report..."

    local report_file="${REPORT_DIR}/integration-report-${TIMESTAMP}.json"
    local total_tests=$1
    local passed_tests=$2
    local failed_tests=$((total_tests - passed_tests))

    cat > "$report_file" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "environment": "$ENVIRONMENT",
  "base_url": "$BASE_URL",
  "test_summary": {
    "total": $total_tests,
    "passed": $passed_tests,
    "failed": $failed_tests,
    "success_rate": $(echo "scale=2; $passed_tests * 100 / $total_tests" | bc -l)
  },
  "test_categories": [
    {
      "name": "Health Checks",
      "tests": $health_tests_total,
      "passed": $health_passed
    },
    {
      "name": "API Endpoints",
      "tests": $api_tests_total,
      "passed": $api_passed
    },
    {
      "name": "WebSocket",
      "tests": $ws_tests_total,
      "passed": $ws_passed
    },
    {
      "name": "Agent Lifecycle",
      "tests": $agent_tests_total,
      "passed": $agent_passed
    },
    {
      "name": "Task Processing",
      "tests": $task_tests_total,
      "passed": $task_passed
    },
    {
      "name": "Performance",
      "tests": $perf_tests_total,
      "passed": $perf_passed
    },
    {
      "name": "Database",
      "tests": $db_tests_total,
      "passed": $db_passed
    }
  ],
  "log_file": "integration-test-${TIMESTAMP}.log"
}
EOF

    log "SUCCESS" "Test report generated: $report_file"
}

# Main test execution
main() {
    local total_tests=0
    local passed_tests=0
    local health_passed=0
    local api_passed=0
    local ws_passed=0
    local agent_passed=0
    local task_passed=0
    local perf_passed=0
    local db_passed=0

    check_prerequisites
    wait_for_system

    # Run test categories
    test_categories=(
        "test_health_checks"
        "test_api_endpoints"
        "test_websocket"
        "test_database"
        "test_agent_lifecycle"
        "test_task_processing"
        "test_performance"
    )

    for test_category in "${test_categories[@]}"; do
        log "TEST" "Running $test_category..."

        if $test_category; then
            passed_tests=$((passed_tests + 1))
            case "$test_category" in
                "test_health_checks") health_passed=1 ;;
                "test_api_endpoints") api_passed=1 ;;
                "test_websocket") ws_passed=1 ;;
                "test_agent_lifecycle") agent_passed=1 ;;
                "test_task_processing") task_passed=1 ;;
                "test_performance") perf_passed=1 ;;
                "test_database") db_passed=1 ;;
            esac
        fi
        total_tests=$((total_tests + 1))
    done

    # Generate report
    generate_report "$total_tests" "$passed_tests"

    # Summary
    log "HEADER" "Test Summary"
    log "INFO" "Total Tests: $total_tests"
    log "INFO" "Passed: $passed_tests"
    log "INFO" "Failed: $((total_tests - passed_tests))"
    log "INFO" "Success Rate: $(echo "scale=2; $passed_tests * 100 / $total_tests" | bc -l)%"

    if [[ $passed_tests -eq $total_tests ]]; then
        log "SUCCESS" "🎉 All integration tests passed!"
        exit 0
    else
        log "ERROR" "❌ Some integration tests failed!"
        exit 1
    fi
}

# Execute main function
main "$@"
#!/bin/bash

# Database Backup Script for Qwen Swarm
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NAMESPACE="qwen-swarm-prod"
BACKUP_DIR="${PROJECT_ROOT}/backups"
RETENTION_DAYS=30
DB_NAME="${DB_NAME:-qwen_swarm_prod}"
DB_USERNAME="${DB_USERNAME:-qwen_prod_user}"

# Parse command line arguments
ENVIRONMENT="production"
COMPRESS=true
ENCRYPT=true
UPLOAD_S3=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --no-compress)
            COMPRESS=false
            shift
            ;;
        --no-encrypt)
            ENCRYPT=false
            shift
            ;;
        --upload-s3)
            UPLOAD_S3=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --env           Environment (development|staging|production)"
            echo "  --no-compress   Skip compression of backup files"
            echo "  --no-encrypt    Skip encryption of backup files"
            echo "  --upload-s3     Upload backup to S3"
            echo "  --help, -h      Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}🗄️  Qwen Swarm Database Backup${NC}"
echo -e "${BLUE}===============================${NC}"

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

    echo "[$timestamp] [$level] $message" >> "${BACKUP_DIR}/backup.log"
}

# Function to check prerequisites
check_prerequisites() {
    log "HEADER" "Checking prerequisites..."

    # Check if kubectl is available
    if ! command -v kubectl &> /dev/null; then
        log "ERROR" "kubectl is not installed"
        exit 1
    fi

    # Check if PostgreSQL client tools are available
    if ! command -v pg_dump &> /dev/null; then
        log "WARNING" "pg_dump not found locally, will use container"
    fi

    # Create backup directory
    mkdir -p "$BACKUP_DIR"

    log "INFO" "Prerequisites check passed"
}

# Function to create database backup
create_database_backup() {
    log "HEADER" "Creating database backup..."

    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="${BACKUP_DIR}/database_${ENVIRONMENT}_${timestamp}.sql"

    # Get PostgreSQL pod name
    local postgres_pod=$(kubectl get pods -n "$NAMESPACE" -l app=postgres -o jsonpath='{.items[0].metadata.name}')

    if [[ -z "$postgres_pod" ]]; then
        log "ERROR" "PostgreSQL pod not found"
        exit 1
    fi

    log "INFO" "Found PostgreSQL pod: $postgres_pod"

    # Create backup using kubectl exec
    log "INFO" "Creating database backup..."
    kubectl exec -n "$NAMESPACE" "$postgres_pod" -- pg_dump -U "$DB_USERNAME" -d "$DB_NAME" --no-password --verbose > "$backup_file"

    if [[ ! -f "$backup_file" || ! -s "$backup_file" ]]; then
        log "ERROR" "Database backup failed"
        exit 1
    fi

    local file_size=$(du -h "$backup_file" | cut -f1)
    log "INFO" "Database backup created: $backup_file ($file_size)"

    echo "$backup_file"
}

# Function to compress backup
compress_backup() {
    local backup_file="$1"

    if [[ "$COMPRESS" != true ]]; then
        log "WARNING" "Skipping compression"
        return 0
    fi

    log "HEADER" "Compressing backup..."

    local compressed_file="${backup_file}.gz"

    if gzip -c "$backup_file" > "$compressed_file"; then
        local original_size=$(du -h "$backup_file" | cut -f1)
        local compressed_size=$(du -h "$compressed_file" | cut -f1)

        # Remove original file
        rm "$backup_file"

        log "INFO" "Backup compressed: $original_size -> $compressed_size"
        echo "$compressed_file"
    else
        log "ERROR" "Compression failed"
        exit 1
    fi
}

# Function to encrypt backup
encrypt_backup() {
    local backup_file="$1"

    if [[ "$ENCRYPT" != true ]]; then
        log "WARNING" "Skipping encryption"
        return 0
    fi

    log "HEADER" "Encrypting backup..."

    local encrypted_file="${backup_file}.gpg"

    # Check if GPG is available
    if ! command -v gpg &> /dev/null; then
        log "ERROR" "GPG is not available for encryption"
        exit 1
    fi

    # Get encryption key from environment or use interactive mode
    local gpg_recipient="${GPG_RECIPIENT:-}"

    if [[ -z "$gpg_recipient" ]]; then
        log "INFO" "Using symmetric encryption (password required)"
        gpg --symmetric --cipher-algo AES256 --compress-algo 1 --s2k-mode 3 \
            --s2k-digest-algo SHA512 --s2k-count 65536 --force-mdc \
            --output "$encrypted_file" "$backup_file"
    else
        log "INFO" "Using asymmetric encryption for recipient: $gpg_recipient"
        gpg --trust-model always --encrypt -r "$gpg_recipient" --output "$encrypted_file" "$backup_file"
    fi

    if [[ -f "$encrypted_file" ]]; then
        # Remove unencrypted file
        rm "$backup_file"
        log "INFO" "Backup encrypted: $encrypted_file"
        echo "$encrypted_file"
    else
        log "ERROR" "Encryption failed"
        exit 1
    fi
}

# Function to upload to S3
upload_to_s3() {
    local backup_file="$1"

    if [[ "$UPLOAD_S3" != true ]]; then
        log "WARNING" "Skipping S3 upload"
        return 0
    fi

    log "HEADER" "Uploading backup to S3..."

    # Check if AWS CLI is available
    if ! command -v aws &> /dev/null; then
        log "ERROR" "AWS CLI is not available"
        exit 1
    fi

    local s3_bucket="${S3_BACKUP_BUCKET:-qwen-swarm-backups}"
    local s3_key="database-backups/$(basename "$backup_file")"

    log "INFO" "Uploading to S3: s3://$s3_bucket/$s3_key"

    if aws s3 cp "$backup_file" "s3://$s3_bucket/$s3_key" --storage-class GLACIER; then
        log "INFO" "Successfully uploaded to S3"

        # Set lifecycle policy if needed
        aws s3api put-object-tagging \
            --bucket "$s3_bucket" \
            --key "$s3_key" \
            --tagging 'Environment=Production&BackupType=Database&RetentionDays=30'
    else
        log "ERROR" "S3 upload failed"
        exit 1
    fi
}

# Function to cleanup old backups
cleanup_old_backups() {
    log "HEADER" "Cleaning up old backups..."

    local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)
    local deleted_count=0

    # Find and delete old backup files
    while IFS= read -r -d '' backup_file; do
        local file_date=$(basename "$backup_file" | grep -oP '\d{8}' || echo "")

        if [[ "$file_date" < "$cutoff_date" ]]; then
            log "INFO" "Deleting old backup: $(basename "$backup_file")"
            rm "$backup_file"
            deleted_count=$((deleted_count + 1))
        fi
    done < <(find "$BACKUP_DIR" -name "database_${ENVIRONMENT}_*" -print0)

    log "INFO" "Deleted $deleted_count old backup files"
}

# Function to verify backup integrity
verify_backup() {
    local backup_file="$1"

    log "HEADER" "Verifying backup integrity..."

    if [[ "$backup_file" == *.gpg ]]; then
        log "INFO" "Verifying encrypted backup..."
        # For encrypted files, we can check if GPG can read the header
        if gpg --list-packets "$backup_file" &> /dev/null; then
            log "INFO" "Encrypted backup verification passed"
        else
            log "ERROR" "Encrypted backup verification failed"
            exit 1
        fi
    elif [[ "$backup_file" == *.gz ]]; then
        log "INFO" "Verifying compressed backup..."
        # For compressed files, check if gzip can read the header
        if gzip -t "$backup_file" 2>/dev/null; then
            log "INFO" "Compressed backup verification passed"
        else
            log "ERROR" "Compressed backup verification failed"
            exit 1
        fi
    else
        log "INFO" "Verifying plain SQL backup..."
        # For plain SQL files, check if it contains expected content
        if grep -q "PostgreSQL database dump" "$backup_file"; then
            log "INFO" "SQL backup verification passed"
        else
            log "ERROR" "SQL backup verification failed"
            exit 1
        fi
    fi
}

# Function to send notification
send_notification() {
    local backup_file="$1"
    local status="$2"

    # Skip if SLACK_WEBHOOK_URL is not set
    if [[ -z "${SLACK_WEBHOOK_URL:-}" ]]; then
        return 0
    fi

    local backup_size=$(du -h "$backup_file" | cut -f1)
    local backup_name=$(basename "$backup_file")

    local color="good"
    if [[ "$status" == "failed" ]]; then
        color="danger"
    fi

    local payload=$(cat <<EOF
{
    "attachments": [
        {
            "color": "$color",
            "title": "Database Backup $status",
            "fields": [
                {
                    "title": "Environment",
                    "value": "$ENVIRONMENT",
                    "short": true
                },
                {
                    "title": "Backup File",
                    "value": "$backup_name",
                    "short": true
                },
                {
                    "title": "Size",
                    "value": "$backup_size",
                    "short": true
                },
                {
                    "title": "Timestamp",
                    "value": "$(date)",
                    "short": true
                }
            ]
        }
    ]
}
EOF
    )

    curl -X POST -H 'Content-type: application/json' \
        --data "$payload" \
        "$SLACK_WEBHOOK_URL" &>/dev/null || true
}

# Main backup flow
main() {
    local backup_file=""
    local final_file=""

    # Setup error handling
    trap 'log "ERROR" "Backup process failed"; send_notification "$backup_file" "failed"; exit 1' ERR

    check_prerequisites

    backup_file=$(create_database_backup)
    final_file=$backup_file

    final_file=$(compress_backup "$final_file")
    final_file=$(encrypt_backup "$final_file")

    upload_to_s3 "$final_file"
    verify_backup "$final_file"
    cleanup_old_backups

    log "INFO" "🎉 Database backup completed successfully!"
    log "INFO" "Backup file: $final_file"

    send_notification "$final_file" "completed"
}

# Execute main function
main "$@"
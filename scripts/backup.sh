#!/bin/bash

# ChoreChomper Database Backup Script
# Run via cron: 0 2 * * * /opt/chorechomper/scripts/backup.sh

set -e

APP_DIR="/opt/chorechomper"
BACKUP_DIR="/opt/chorechomper/backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
RETENTION_DAYS=7

# Create backup directory
mkdir -p $BACKUP_DIR

# Load environment variables
source $APP_DIR/.env

# Create backup
echo "Creating backup: backup_$DATE.sql.gz"
docker exec chorechomper-db pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Delete old backups
echo "Removing backups older than $RETENTION_DAYS days..."
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# List current backups
echo "Current backups:"
ls -lh $BACKUP_DIR

echo "Backup complete!"

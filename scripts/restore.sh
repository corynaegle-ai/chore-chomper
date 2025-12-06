#!/bin/bash

# ChoreChomper Database Restore Script

set -e

APP_DIR="/opt/chorechomper"
BACKUP_DIR="/opt/chorechomper/backups"

# Load environment variables
source $APP_DIR/.env

# List available backups
echo "Available backups:"
ls -lt $BACKUP_DIR/*.sql.gz 2>/dev/null || { echo "No backups found!"; exit 1; }

echo ""
read -p "Enter backup filename to restore (e.g., backup_2024-01-01_02-00-00.sql.gz): " BACKUP_FILE

if [ ! -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_DIR/$BACKUP_FILE"
  exit 1
fi

echo ""
echo "WARNING: This will OVERWRITE the current database!"
read -p "Are you sure you want to continue? (type 'yes' to confirm): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Restore cancelled."
  exit 0
fi

echo "Restoring from $BACKUP_FILE..."

# Stop the backend to prevent writes during restore
docker-compose -f $APP_DIR/docker-compose.prod.yml stop backend

# Restore the database
gunzip -c $BACKUP_DIR/$BACKUP_FILE | docker exec -i chorechomper-db psql -U $DB_USER -d $DB_NAME

# Start the backend again
docker-compose -f $APP_DIR/docker-compose.prod.yml start backend

echo "Restore complete!"

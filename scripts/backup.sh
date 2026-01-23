#!/bin/bash
# Twin-AI - Database Backup Script

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

echo "💾 Starting database backup..."

# Node/Mobile DB Backup
node -e "require('./mobile/src/database/dbAdapter').backupDatabase('$BACKUP_DIR/mobile_db_$TIMESTAMP.db')"

# Supabase backup (requires CLI)
# npx supabase db dump -f $BACKUP_DIR/supabase_$TIMESTAMP.sql

echo "✅ Backup completed: $BACKUP_DIR"

#!/bin/bash
# Restore Phase 2A Backup

echo "⚠️  WARNING: This will restore database to previous state"
read -p "Continue? (y/n): " confirm

if [ "$confirm" != "y" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo "Stopping backend..."
docker-compose stop backend-api

echo "Restoring database..."
docker-compose exec -T postgres psql -U ibn_user ibn_db < database.sql

echo "Restarting backend..."
docker-compose up -d backend-api

echo "✅ Restore complete!"

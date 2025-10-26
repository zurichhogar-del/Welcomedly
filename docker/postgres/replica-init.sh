#!/bin/bash
# PostgreSQL Replica Initialization Script
# Configures replica database to follow primary

set -e

echo "🔧 Configuring PostgreSQL Replica..."

# Wait for primary to be ready
echo "Waiting for primary PostgreSQL to be ready..."
until PGPASSWORD=$REPLICATION_PASSWORD psql -h $PRIMARY_HOST -U replicator -c '\q' 2>/dev/null; do
  echo "Primary not ready yet, waiting..."
  sleep 5
done

echo "✓ Primary is ready"

# Check if data directory is already initialized
if [ -s "$PGDATA/PG_VERSION" ]; then
    echo "⚠️  Data directory already initialized, skipping base backup"
else
    echo "📦 Creating base backup from primary..."

    # Remove any existing data
    rm -rf ${PGDATA}/*

    # Create base backup from primary
    PGPASSWORD=$REPLICATION_PASSWORD pg_basebackup \
        -h $PRIMARY_HOST \
        -D ${PGDATA} \
        -U replicator \
        -v \
        -P \
        -X stream \
        -R

    echo "✓ Base backup completed"
fi

# Configure recovery settings (for PostgreSQL 12+)
cat > ${PGDATA}/postgresql.auto.conf <<EOF
# Standby Configuration
primary_conninfo = 'host=${PRIMARY_HOST} port=5432 user=replicator password=${REPLICATION_PASSWORD}'
hot_standby = on
EOF

# Create standby.signal file to indicate this is a replica
touch ${PGDATA}/standby.signal

echo "✓ Replica configuration complete"

# Set correct permissions
chmod 0700 ${PGDATA}
chown -R postgres:postgres ${PGDATA}

echo "✅ Replica PostgreSQL configured successfully!"
echo "🔄 Starting replica in standby mode..."

# Start PostgreSQL
exec docker-entrypoint.sh postgres

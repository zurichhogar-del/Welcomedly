#!/bin/bash
# PostgreSQL Primary Initialization Script
# Configures primary database for replication

set -e

echo "🔧 Configuring PostgreSQL Primary for Replication..."

# Wait for PostgreSQL to be ready
until pg_isready -U postgres; do
  echo "Waiting for PostgreSQL to be ready..."
  sleep 2
done

# Create replication user if not exists
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    -- Create replication user
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'replicator') THEN
            CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD '${REPLICATION_PASSWORD:-replicator_password}';
        END IF;
    END
    \$\$;

    -- Grant necessary permissions
    GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO replicator;
EOSQL

echo "✓ Replication user created"

# Configure postgresql.conf for replication
cat >> ${PGDATA}/postgresql.conf <<EOF

# Replication Configuration (added by init script)
wal_level = replica
max_wal_senders = 10
max_replication_slots = 10
hot_standby = on
wal_keep_size = 512
EOF

echo "✓ postgresql.conf configured for replication"

# Configure pg_hba.conf to allow replication connections
cat >> ${PGDATA}/pg_hba.conf <<EOF

# Replication connections
host    replication     replicator      all                 md5
EOF

echo "✓ pg_hba.conf configured for replication"

# Reload PostgreSQL configuration
pg_ctl reload

echo "✅ Primary PostgreSQL configured for replication!"

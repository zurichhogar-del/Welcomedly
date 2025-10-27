#!/bin/bash

# Test Script: Sprint 3.1.4 - Asterisk Infrastructure & Backend Configuration
# Tests telephony system infrastructure setup

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

TESTS_PASSED=0
TESTS_FAILED=0

print_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
    ((TESTS_PASSED++))
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
    ((TESTS_FAILED++))
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_header() {
    echo -e "\n${BLUE}===========================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===========================================================${NC}\n"
}

# ====================================================================================
# TEST 1: Validar configuración de Docker Compose para Asterisk
# ====================================================================================
print_header "TEST 1: Validar configuración de Docker Compose para Asterisk"

if [ ! -f "docker-compose.yml" ]; then
    print_error "docker-compose.yml no existe"
else
    print_test "Verificando servicio de Asterisk en docker-compose.yml..."

    if grep -q "asterisk:" docker-compose.yml; then
        print_success "Servicio asterisk definido en docker-compose.yml"
    else
        print_error "Servicio asterisk NO encontrado en docker-compose.yml"
    fi

    print_test "Verificando imagen de Asterisk..."
    if grep -q "andrius/asterisk:20" docker-compose.yml; then
        print_success "Imagen andrius/asterisk:20 configurada"
    else
        print_error "Imagen de Asterisk NO configurada correctamente"
    fi

    print_test "Verificando puertos de Asterisk..."
    if grep -q "5038:5038" docker-compose.yml; then
        print_success "Puerto AMI (5038) configurado"
    else
        print_error "Puerto AMI (5038) NO configurado"
    fi

    if grep -q "8089:8089" docker-compose.yml; then
        print_success "Puerto WebSocket WSS (8089) configurado"
    else
        print_error "Puerto WebSocket WSS (8089) NO configurado"
    fi

    if grep -q "5060:5060/udp" docker-compose.yml; then
        print_success "Puerto SIP (5060/udp) configurado"
    else
        print_error "Puerto SIP (5060/udp) NO configurado"
    fi
fi

# ====================================================================================
# TEST 2: Validar archivos de configuración de Asterisk
# ====================================================================================
print_header "TEST 2: Validar archivos de configuración de Asterisk"

ASTERISK_CONFIG_DIR="docker/asterisk"

print_test "Verificando existencia de directorio de configuración..."
if [ -d "$ASTERISK_CONFIG_DIR" ]; then
    print_success "Directorio $ASTERISK_CONFIG_DIR existe"
else
    print_error "Directorio $ASTERISK_CONFIG_DIR NO existe"
fi

print_test "Verificando manager.conf..."
if [ -f "$ASTERISK_CONFIG_DIR/manager.conf" ]; then
    print_success "manager.conf existe"

    if grep -q "\[welcomedly\]" "$ASTERISK_CONFIG_DIR/manager.conf"; then
        print_success "Usuario 'welcomedly' configurado en AMI"
    else
        print_error "Usuario 'welcomedly' NO configurado en AMI"
    fi
else
    print_error "manager.conf NO existe"
fi

print_test "Verificando pjsip.conf..."
if [ -f "$ASTERISK_CONFIG_DIR/pjsip.conf" ]; then
    print_success "pjsip.conf existe"

    if grep -q "\[transport-wss\]" "$ASTERISK_CONFIG_DIR/pjsip.conf"; then
        print_success "Transport WebSocket (WSS) configurado"
    else
        print_error "Transport WebSocket (WSS) NO configurado"
    fi

    if grep -q "\[agent-template\]" "$ASTERISK_CONFIG_DIR/pjsip.conf"; then
        print_success "Template de agente configurado"
    else
        print_error "Template de agente NO configurado"
    fi
else
    print_error "pjsip.conf NO existe"
fi

print_test "Verificando extensions.conf..."
if [ -f "$ASTERISK_CONFIG_DIR/extensions.conf" ]; then
    print_success "extensions.conf existe"

    if grep -q "\[welcomedly-agents\]" "$ASTERISK_CONFIG_DIR/extensions.conf"; then
        print_success "Contexto welcomedly-agents configurado"
    else
        print_error "Contexto welcomedly-agents NO configurado"
    fi

    if grep -q "\[welcomedly-outbound\]" "$ASTERISK_CONFIG_DIR/extensions.conf"; then
        print_success "Contexto welcomedly-outbound configurado"
    else
        print_error "Contexto welcomedly-outbound NO configurado"
    fi
else
    print_error "extensions.conf NO existe"
fi

print_test "Verificando queues.conf..."
if [ -f "$ASTERISK_CONFIG_DIR/queues.conf" ]; then
    print_success "queues.conf existe"
else
    print_error "queues.conf NO existe"
fi

# ====================================================================================
# TEST 3: Validar variables de entorno en .env.example
# ====================================================================================
print_header "TEST 3: Validar variables de entorno en .env.example"

if [ ! -f ".env.example" ]; then
    print_error ".env.example no existe"
else
    print_test "Verificando variables ASTERISK_* en .env.example..."

    REQUIRED_VARS=("ASTERISK_HOST" "ASTERISK_PORT" "ASTERISK_USER" "ASTERISK_PASSWORD" "ASTERISK_WSS_HOST" "ASTERISK_WSS_PORT")

    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^$var=" .env.example || grep -q "^# $var=" .env.example; then
            print_success "Variable $var encontrada en .env.example"
        else
            print_error "Variable $var NO encontrada en .env.example"
        fi
    done
fi

# ====================================================================================
# TEST 4: Validar integración de telephonyService en src/index.js
# ====================================================================================
print_header "TEST 4: Validar integración de telephonyService en src/index.js"

if [ ! -f "src/index.js" ]; then
    print_error "src/index.js no existe"
else
    print_test "Verificando import de telephonyService..."
    if grep -q "import.*telephonyService.*from.*'./services/telephonyService" src/index.js; then
        print_success "telephonyService importado correctamente"
    else
        print_error "telephonyService NO importado en src/index.js"
    fi

    print_test "Verificando inicialización de telephonyService..."
    if grep -q "telephonyService.initialize()" src/index.js; then
        print_success "telephonyService.initialize() encontrado"
    else
        print_error "telephonyService.initialize() NO encontrado"
    fi

    print_test "Verificando graceful shutdown..."
    if grep -q "telephonyService.shutdown()" src/index.js; then
        print_success "telephonyService.shutdown() configurado"
    else
        print_error "telephonyService.shutdown() NO configurado"
    fi
fi

# ====================================================================================
# TEST 5: Validar migraciones de base de datos
# ====================================================================================
print_header "TEST 5: Validar migraciones de base de datos"

print_test "Verificando archivos de migración..."

if [ -f "src/database/migrations/20251025_create_telephony_tables.js" ]; then
    print_success "Migración 20251025_create_telephony_tables.js existe"
else
    print_error "Migración 20251025_create_telephony_tables.js NO existe"
fi

if [ -f "src/database/migrations/20251025_create_trunks_table.js" ]; then
    print_success "Migración 20251025_create_trunks_table.js existe"
else
    print_error "Migración 20251025_create_trunks_table.js NO existe"
fi

print_test "Verificando que las tablas existen en la base de datos..."

# Verificar si PostgreSQL está disponible
if command -v psql &> /dev/null; then
    # Usar variables de entorno si existen, sino usar valores por defecto
    DB_HOST="${DB_HOST:-localhost}"
    DB_PORT="${DB_PORT:-5432}"
    DB_NAME="${DB_NAME:-miappdb}"
    DB_USER="${DB_USER:-postgres}"

    # Verificar tabla calls
    if PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'calls');" 2>/dev/null | grep -q "t"; then
        print_success "Tabla 'calls' existe en la base de datos"
    else
        print_error "Tabla 'calls' NO existe en la base de datos"
    fi

    # Verificar tabla sip_peers
    if PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sip_peers');" 2>/dev/null | grep -q "t"; then
        print_success "Tabla 'sip_peers' existe en la base de datos"
    else
        print_error "Tabla 'sip_peers' NO existe en la base de datos"
    fi

    # Verificar tabla trunks
    if PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'trunks');" 2>/dev/null | grep -q "t"; then
        print_success "Tabla 'trunks' existe en la base de datos"
    else
        print_error "Tabla 'trunks' NO existe en la base de datos"
    fi

    # Verificar tabla campaign_trunks
    if PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'campaign_trunks');" 2>/dev/null | grep -q "t"; then
        print_success "Tabla 'campaign_trunks' existe en la base de datos"
    else
        print_error "Tabla 'campaign_trunks' NO existe en la base de datos"
    fi
else
    print_warning "psql no disponible, saltando verificación de tablas"
fi

# ====================================================================================
# TEST 6: Validar modelos Sequelize de telefonía
# ====================================================================================
print_header "TEST 6: Validar modelos Sequelize de telefonía"

print_test "Verificando archivos de modelos..."

if [ -f "src/models/Call.js" ]; then
    print_success "Modelo Call.js existe"
else
    print_error "Modelo Call.js NO existe"
fi

if [ -f "src/models/SipPeer.js" ]; then
    print_success "Modelo SipPeer.js existe"
else
    print_error "Modelo SipPeer.js NO existe"
fi

if [ -f "src/models/Trunk.js" ]; then
    print_success "Modelo Trunk.js existe"
else
    print_error "Modelo Trunk.js NO existe"
fi

print_test "Verificando registro de modelos en src/models/index.js..."
if [ -f "src/models/index.js" ]; then
    if grep -q "Call" src/models/index.js; then
        print_success "Modelo Call registrado"
    else
        print_error "Modelo Call NO registrado"
    fi

    if grep -q "SipPeer" src/models/index.js; then
        print_success "Modelo SipPeer registrado"
    else
        print_error "Modelo SipPeer NO registrado"
    fi

    if grep -q "Trunk" src/models/index.js; then
        print_success "Modelo Trunk registrado"
    else
        print_error "Modelo Trunk NO registrado"
    fi
else
    print_error "src/models/index.js NO existe"
fi

# ====================================================================================
# RESUMEN DE RESULTADOS
# ====================================================================================
print_header "RESUMEN DE TESTS"

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))

echo -e "${BLUE}Total de tests:${NC} $TOTAL_TESTS"
echo -e "${GREEN}Tests aprobados:${NC} $TESTS_PASSED"
echo -e "${RED}Tests fallados:${NC} $TESTS_FAILED"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✅ TODOS LOS TESTS DE SPRINT 3.1.4 PASARON EXITOSAMENTE${NC}\n"
    exit 0
else
    echo -e "\n${RED}❌ ALGUNOS TESTS DE SPRINT 3.1.4 FALLARON${NC}\n"
    exit 1
fi

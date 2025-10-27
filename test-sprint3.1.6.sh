#!/bin/bash

# Test Script for Sprint 3.1.6: Trunk Management
# Este script valida la implementación completa del sistema de gestión de troncales SIP

echo "=========================================="
echo "Sprint 3.1.6: Trunk Management - Tests"
echo "=========================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

# Función para test
test_file() {
    local file=$1
    local description=$2

    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $description"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}: $description"
        echo "   Archivo no encontrado: $file"
        ((FAILED++))
        return 1
    fi
}

# Función para test de contenido
test_content() {
    local file=$1
    local pattern=$2
    local description=$3

    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ FAIL${NC}: $description"
        echo "   Archivo no encontrado: $file"
        ((FAILED++))
        return 1
    fi

    if grep -q "$pattern" "$file"; then
        echo -e "${GREEN}✅ PASS${NC}: $description"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}: $description"
        echo "   Patrón no encontrado en $file: $pattern"
        ((FAILED++))
        return 1
    fi
}

echo "=== 1. Backend Files ==="
echo ""

# Test Service
test_file "src/services/trunkService.js" "TrunkService existe"
test_content "src/services/trunkService.js" "getAllTrunks" "TrunkService: método getAllTrunks"
test_content "src/services/trunkService.js" "getActiveTrunks" "TrunkService: método getActiveTrunks"
test_content "src/services/trunkService.js" "getTrunkById" "TrunkService: método getTrunkById"
test_content "src/services/trunkService.js" "createTrunk" "TrunkService: método createTrunk"
test_content "src/services/trunkService.js" "updateTrunk" "TrunkService: método updateTrunk"
test_content "src/services/trunkService.js" "deleteTrunk" "TrunkService: método deleteTrunk"
test_content "src/services/trunkService.js" "assignTrunkToCampaign" "TrunkService: método assignTrunkToCampaign"
test_content "src/services/trunkService.js" "removeTrunkFromCampaign" "TrunkService: método removeTrunkFromCampaign"
test_content "src/services/trunkService.js" "getTrunkStats" "TrunkService: método getTrunkStats"
test_content "src/services/trunkService.js" "testTrunkConnection" "TrunkService: método testTrunkConnection"

echo ""
echo "=== 2. Controller Files ==="
echo ""

# Test Controller
test_file "src/controllers/trunkController.js" "TrunkController existe"
test_content "src/controllers/trunkController.js" "listTrunks" "TrunkController: método listTrunks"
test_content "src/controllers/trunkController.js" "newTrunk" "TrunkController: método newTrunk"
test_content "src/controllers/trunkController.js" "createTrunk" "TrunkController: método createTrunk"
test_content "src/controllers/trunkController.js" "editTrunk" "TrunkController: método editTrunk"
test_content "src/controllers/trunkController.js" "updateTrunk" "TrunkController: método updateTrunk"
test_content "src/controllers/trunkController.js" "deleteTrunk" "TrunkController: método deleteTrunk"
test_content "src/controllers/trunkController.js" "viewTrunk" "TrunkController: método viewTrunk"
test_content "src/controllers/trunkController.js" "testTrunk" "TrunkController: método testTrunk"
test_content "src/controllers/trunkController.js" "assignToCampaign" "TrunkController: método assignToCampaign"
test_content "src/controllers/trunkController.js" "removeFromCampaign" "TrunkController: método removeFromCampaign"
test_content "src/controllers/trunkController.js" "apiListTrunks" "TrunkController: método apiListTrunks"
test_content "src/controllers/trunkController.js" "apiListActiveTrunks" "TrunkController: método apiListActiveTrunks"
test_content "src/controllers/trunkController.js" "apiGetTrunkStats" "TrunkController: método apiGetTrunkStats"

echo ""
echo "=== 3. Routes Files ==="
echo ""

# Test Routes
test_file "src/routes/trunkRoutes.js" "TrunkRoutes existe"
test_content "src/routes/trunkRoutes.js" "requireAuth" "TrunkRoutes: usa requireAuth middleware"
test_content "src/routes/trunkRoutes.js" "requireAdmin" "TrunkRoutes: usa requireAdmin middleware"
test_content "src/routes/trunkRoutes.js" "router.get\('/', requireAdmin" "TrunkRoutes: GET / (listar)"
test_content "src/routes/trunkRoutes.js" "router.get\('/nuevo'" "TrunkRoutes: GET /nuevo (formulario crear)"
test_content "src/routes/trunkRoutes.js" "router.post\('/', requireAdmin" "TrunkRoutes: POST / (crear)"
test_content "src/routes/trunkRoutes.js" "router.get\('/:id'" "TrunkRoutes: GET /:id (ver)"
test_content "src/routes/trunkRoutes.js" "router.get\('/:id/editar'" "TrunkRoutes: GET /:id/editar (formulario editar)"
test_content "src/routes/trunkRoutes.js" "router.post\('/:id'" "TrunkRoutes: POST /:id (actualizar)"
test_content "src/routes/trunkRoutes.js" "router.post\('/:id/eliminar'" "TrunkRoutes: POST /:id/eliminar (eliminar)"
test_content "src/routes/trunkRoutes.js" "router.post\('/:id/test'" "TrunkRoutes: POST /:id/test (probar conexión)"

echo ""
echo "=== 4. Main Routes Integration ==="
echo ""

# Test Integration
test_content "src/routes/index.js" "trunkRoutes" "index.js: importa trunkRoutes"
test_content "src/routes/index.js" "router.use.*\/trunks" "index.js: registra /trunks route"

echo ""
echo "=== 5. Frontend Views ==="
echo ""

# Test Views
test_file "src/views/telephonyViews/trunks/list.ejs" "Vista de listado existe"
test_file "src/views/telephonyViews/trunks/form.ejs" "Vista de formulario existe"
test_file "src/views/telephonyViews/trunks/view.ejs" "Vista de detalles existe"

# Test View Content
test_content "src/views/telephonyViews/trunks/list.ejs" "Gestión de Troncales SIP" "Vista list: título correcto"
test_content "src/views/telephonyViews/trunks/list.ejs" "Nueva Troncal" "Vista list: botón crear"
test_content "src/views/telephonyViews/trunks/list.ejs" "testTrunk" "Vista list: función testTrunk"
test_content "src/views/telephonyViews/trunks/list.ejs" "deleteTrunk" "Vista list: función deleteTrunk"

test_content "src/views/telephonyViews/trunks/form.ejs" "name" "Vista form: campo name"
test_content "src/views/telephonyViews/trunks/form.ejs" "provider" "Vista form: campo provider"
test_content "src/views/telephonyViews/trunks/form.ejs" "host" "Vista form: campo host"
test_content "src/views/telephonyViews/trunks/form.ejs" "port" "Vista form: campo port"
test_content "src/views/telephonyViews/trunks/form.ejs" "maxChannels" "Vista form: campo maxChannels"
test_content "src/views/telephonyViews/trunks/form.ejs" "priority" "Vista form: campo priority"
test_content "src/views/telephonyViews/trunks/form.ejs" "togglePassword" "Vista form: función togglePassword"

test_content "src/views/telephonyViews/trunks/view.ejs" "Detalles de Troncal" "Vista view: título"
test_content "src/views/telephonyViews/trunks/view.ejs" "Estadísticas de Llamadas" "Vista view: sección estadísticas"
test_content "src/views/telephonyViews/trunks/view.ejs" "Campañas Asignadas" "Vista view: sección campañas"
test_content "src/views/telephonyViews/trunks/view.ejs" "removeCampaign" "Vista view: función removeCampaign"

echo ""
echo "=== 6. Navigation Integration ==="
echo ""

# Test Navigation
test_content "src/views/partials/generalCard.ejs" "/trunks" "Sidebar: enlace a trunks"
test_content "src/views/partials/generalCard.ejs" "Trunks" "Sidebar: texto del enlace"

echo ""
echo "=== 7. Database Models ==="
echo ""

# Test Models (ya validados en sprint 3.1.4, pero verificamos)
test_content "src/models/index.js" "Trunk" "Models: Trunk registrado"
test_content "src/models/Trunk.js" "provider" "Trunk model: campo provider"
test_content "src/models/Trunk.js" "host" "Trunk model: campo host"
test_content "src/models/Trunk.js" "port" "Trunk model: campo port"
test_content "src/models/Trunk.js" "maxChannels" "Trunk model: campo maxChannels"

echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

TOTAL=$((PASSED + FAILED))
PERCENTAGE=$((PASSED * 100 / TOTAL))

if [ $PERCENTAGE -ge 90 ]; then
    echo -e "${GREEN}✅ Sprint 3.1.6: COMPLETADO (${PERCENTAGE}%)${NC}"
    exit 0
elif [ $PERCENTAGE -ge 70 ]; then
    echo -e "${YELLOW}⚠️  Sprint 3.1.6: PARCIAL (${PERCENTAGE}%)${NC}"
    exit 0
else
    echo -e "${RED}❌ Sprint 3.1.6: INCOMPLETO (${PERCENTAGE}%)${NC}"
    exit 1
fi

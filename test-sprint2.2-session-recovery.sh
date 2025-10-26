#!/bin/bash

# Test de Sistema de Recuperación de Sesión - Sprint 2.2
# Valida que el sistema recupere correctamente el estado de la sesión

echo "🧪 Iniciando tests de Sprint 2.2: Sistema de Recuperación de Sesión"
echo ""

# Verificar que Redis está corriendo
echo "🔍 Verificando Redis..."
if ! redis-cli ping > /dev/null 2>&1; then
    echo "❌ Redis no está corriendo. Por favor inicia Redis primero:"
    echo "   redis-server"
    exit 1
fi
echo "✅ Redis está corriendo"
echo ""

# Verificar que el servidor está corriendo
echo "🔍 Verificando servidor en http://localhost:3000..."
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ El servidor no está corriendo. Por favor inicia el servidor primero:"
    echo "   npm run dev"
    exit 1
fi
echo "✅ Servidor está corriendo"
echo ""

# Ejecutar tests
echo "🚀 Ejecutando tests..."
echo ""
node test-sprint2.2-session-recovery.js

# Capturar código de salida
EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ TODOS LOS TESTS PASARON"
else
    echo "❌ ALGUNOS TESTS FALLARON"
fi

exit $EXIT_CODE

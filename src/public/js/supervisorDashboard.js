/**
 * Dashboard de Supervisor - Welcomedly
 * Auto-refresh cada 5 segundos, alertas en tiempo real
 */

// Estado global
let refreshInterval = null;
let currentFilter = 'all';
let lastAlerts = [];

/**
 * Inicialización del dashboard
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('📊 Dashboard de Supervisor cargado');

    // Cargar datos inmediatamente
    loadDashboardData();

    // Configurar auto-refresh cada 5 segundos
    startAutoRefresh();

    // Configurar filtros de estado
    setupStatusFilters();

    // Limpiar interval al salir
    window.addEventListener('beforeunload', () => {
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }
    });
});

/**
 * Inicia el auto-refresh de datos
 */
function startAutoRefresh() {
    refreshInterval = setInterval(() => {
        loadDashboardData();
    }, 5000); // 5 segundos

    console.log('✅ Auto-refresh activado (cada 5s)');
}

/**
 * Carga los datos del dashboard desde la API
 */
async function loadDashboardData() {
    try {
        const response = await fetch('/api/agent/supervisor/metrics');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Error al cargar datos');
        }

        const data = result.data;

        // Actualizar timestamp
        updateLastUpdateTime();

        // Actualizar cards de resumen
        updateSummaryCards(data.summary);

        // Actualizar tabla de agentes
        updateAgentsTable(data.agents);

        // Procesar alertas
        processAlerts(data.alerts);

    } catch (error) {
        console.error('Error cargando datos del dashboard:', error);
        showToast('Error', 'No se pudieron cargar los datos del dashboard', 'error');
    }
}

/**
 * Actualiza el timestamp de última actualización
 */
function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('es-ES');
    document.getElementById('last-update').textContent = timeString;
}

/**
 * Actualiza las cards de resumen
 */
function updateSummaryCards(summary) {
    // Total agentes
    updateCardValue('total-agents', summary.totalAgents);

    // Disponibles
    updateCardValue('available-count', summary.byStatus.available || 0);

    // En llamada
    updateCardValue('incall-count', summary.byStatus.in_call || 0);

    // En pausa
    updateCardValue('pause-count', summary.byStatus.on_pause || 0);

    // Eficiencia promedio
    updateCardValue('avg-efficiency', summary.avgEfficiency);
    document.getElementById('efficiency-bar').style.width = summary.avgEfficiency + '%';

    // Total de llamadas
    updateCardValue('total-calls', summary.totalCalls);

    // Tiempo productivo promedio
    const avgProductiveTime = Math.floor(summary.totalProductiveTime / summary.totalAgents);
    const hours = Math.floor(avgProductiveTime / 3600);
    const minutes = Math.floor((avgProductiveTime % 3600) / 60);
    updateCardValue('avg-productive-time', `${hours}h ${minutes}m`);
}

/**
 * Actualiza el valor de una card con animación
 */
function updateCardValue(elementId, newValue) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const oldValue = element.textContent;

    if (oldValue !== String(newValue)) {
        element.textContent = newValue;
        element.classList.add('updated');
        setTimeout(() => {
            element.classList.remove('updated');
        }, 300);
    }
}

/**
 * Actualiza la tabla de agentes
 */
function updateAgentsTable(agents) {
    const tbody = document.getElementById('agents-tbody');
    const loadingRow = document.getElementById('loading-row');
    const emptyState = document.getElementById('empty-state');

    // Ocultar loading
    if (loadingRow) {
        loadingRow.classList.add('d-none');
    }

    // Verificar si hay agentes
    if (!agents || agents.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('d-none');
        return;
    }

    emptyState.classList.add('d-none');

    // Filtrar agentes según el filtro actual
    const filteredAgents = currentFilter === 'all'
        ? agents
        : agents.filter(agent => agent.currentStatus === currentFilter);

    // Generar HTML para cada agente
    const rows = filteredAgents.map(agent => createAgentRow(agent)).join('');
    tbody.innerHTML = rows;
}

/**
 * Crea una fila HTML para un agente
 */
function createAgentRow(agent) {
    const statusClass = agent.currentStatus || 'offline';
    const statusText = getStatusText(statusClass);
    const statusBadgeClass = getStatusBadgeClass(statusClass);
    const efficiencyClass = getEfficiencyClass(agent.efficiency);
    const timeInStatus = formatDuration(agent.statusDuration);
    const productiveTime = formatDuration(agent.metrics.productiveTime);

    // Determinar si hay alerta (más de 15 min en pausa)
    const isLongPause = statusClass === 'on_pause' && agent.statusDuration > 900;
    const rowClass = isLongPause ? 'status-row-alert' : `status-row-${statusClass}`;

    return `
        <tr class="${rowClass}">
            <td class="text-center">
                <span class="status-indicator ${statusClass}"></span>
            </td>
            <td>
                <strong>${agent.agentName || 'Sin nombre'}</strong>
                <br>
                <small class="text-muted">${agent.correo || ''}</small>
            </td>
            <td>
                <span class="badge badge-status ${statusClass}">${statusText}</span>
            </td>
            <td class="time-display">${timeInStatus}</td>
            <td class="text-center">${agent.metrics.calls || 0}</td>
            <td class="time-display">${productiveTime}</td>
            <td class="text-center">
                <span class="efficiency-badge ${efficiencyClass}">${agent.efficiency}%</span>
            </td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-primary btn-action" onclick="viewAgentDetails(${agent.agentId})" title="Ver detalles">
                    <i class="bi bi-eye"></i>
                </button>
            </td>
        </tr>
    `;
}

/**
 * Obtiene el texto legible del estado
 */
function getStatusText(status) {
    const statusMap = {
        available: 'Disponible',
        in_call: 'En Llamada',
        on_pause: 'En Pausa',
        after_call_work: 'Post-llamada',
        training: 'Entrenamiento',
        meeting: 'Reunión',
        offline: 'Desconectado'
    };
    return statusMap[status] || status;
}

/**
 * Obtiene la clase CSS para el badge de estado
 */
function getStatusBadgeClass(status) {
    return status; // Las clases CSS ya están definidas en el CSS
}

/**
 * Obtiene la clase CSS para el badge de eficiencia
 */
function getEfficiencyClass(efficiency) {
    if (efficiency >= 80) return 'efficiency-high';
    if (efficiency >= 60) return 'efficiency-medium';
    return 'efficiency-low';
}

/**
 * Formatea una duración en segundos a formato legible
 */
function formatDuration(seconds) {
    if (!seconds || seconds === 0) return '0m';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

/**
 * Procesa y muestra alertas
 */
function processAlerts(alerts) {
    const container = document.getElementById('alerts-container');

    // Si no hay alertas, limpiar contenedor
    if (!alerts || alerts.length === 0) {
        container.innerHTML = '';
        lastAlerts = [];
        return;
    }

    // Verificar si hay nuevas alertas
    const newAlerts = alerts.filter(alert =>
        !lastAlerts.some(old => old.agentId === alert.agentId)
    );

    // Mostrar toast para nuevas alertas
    newAlerts.forEach(alert => {
        showToast('Alerta', alert.message, 'warning');
    });

    // Actualizar contenedor de alertas
    const alertsHTML = alerts.map(alert => {
        const minutes = Math.floor(alert.pauseDuration / 60);
        return `
            <div class="alert alert-warning alert-box alert-dismissible fade show" role="alert">
                <i class="bi bi-exclamation-triangle-fill"></i>
                <strong>Pausa prolongada:</strong> ${alert.agentName} en pausa por ${minutes} minutos
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
    }).join('');

    container.innerHTML = alertsHTML;

    // Guardar alertas actuales
    lastAlerts = alerts;
}

/**
 * Muestra un toast de notificación
 */
function showToast(title, message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');

    const iconMap = {
        success: 'check-circle-fill',
        error: 'x-circle-fill',
        warning: 'exclamation-triangle-fill',
        info: 'info-circle-fill'
    };

    const bgMap = {
        success: 'bg-success',
        error: 'bg-danger',
        warning: 'bg-warning',
        info: 'bg-info'
    };

    const icon = iconMap[type] || iconMap.info;
    const bgClass = bgMap[type] || bgMap.info;

    const toastId = `toast-${Date.now()}`;
    const toastHTML = `
        <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header ${bgClass} text-white">
                <i class="bi bi-${icon} me-2"></i>
                <strong class="me-auto">${title}</strong>
                <small>ahora</small>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', toastHTML);

    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 5000 });
    toast.show();

    // Remover del DOM después de ocultarse
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

/**
 * Configura los filtros de estado
 */
function setupStatusFilters() {
    const filterButtons = document.querySelectorAll('[data-filter]');

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remover clase active de todos los botones
            filterButtons.forEach(btn => btn.classList.remove('active'));

            // Agregar clase active al botón clickeado
            button.classList.add('active');

            // Actualizar filtro actual
            currentFilter = button.getAttribute('data-filter');

            // Recargar datos para aplicar filtro
            loadDashboardData();
        });
    });
}

/**
 * Ver detalles de un agente
 */
function viewAgentDetails(agentId) {
    console.log('Ver detalles del agente:', agentId);
    showToast('Información', `Detalles del agente ${agentId} (función en desarrollo)`, 'info');
    // TODO: Abrir modal con detalles del agente
}

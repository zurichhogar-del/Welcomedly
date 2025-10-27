/**
 * Analytics Dashboard
 * Sprint 3.3: Reportes y Analytics
 */

class AnalyticsDashboard {
    constructor() {
        this.charts = {};
        this.currentData = {
            agents: [],
            campaigns: [],
        };

        this.init();
    }

    async init() {
        console.log('[AnalyticsDashboard] Initializing...');

        // Establecer fechas por defecto (último mes)
        this.setDefaultDates();

        // Cargar selectores
        await this.loadCampaignSelector();
        await this.loadAgentSelector();

        // Setup event listeners
        this.setupEventListeners();

        // Cargar datos iniciales
        await this.loadAgentsComparison();
    }

    setDefaultDates() {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        document.getElementById('start-date').valueAsDate = startDate;
        document.getElementById('end-date').valueAsDate = endDate;
        document.getElementById('hourly-date').valueAsDate = endDate;
    }

    setupEventListeners() {
        // Aplicar filtros
        document.getElementById('btn-apply-filters').addEventListener('click', () => {
            this.loadAgentsComparison();
        });

        // Resetear filtros
        document.getElementById('btn-reset-filters').addEventListener('click', () => {
            this.setDefaultDates();
            this.loadAgentsComparison();
        });

        // Exportar agentes a CSV
        document.getElementById('btn-export-agents-csv').addEventListener('click', () => {
            this.exportAgentsToCSV();
        });

        // Exportar campaña a CSV
        document.getElementById('btn-export-campaign-csv').addEventListener('click', () => {
            this.exportCampaignToCSV();
        });

        // Selector de campaña
        document.getElementById('campaign-selector').addEventListener('change', (e) => {
            const campaignId = e.target.value;
            if (campaignId) {
                this.loadCampaignMetrics(campaignId);
            } else {
                document.getElementById('campaign-metrics-section').style.display = 'none';
                document.getElementById('campaign-trend-section').style.display = 'none';
            }
        });

        // Selector de agente para análisis horario
        document.getElementById('hourly-agent-selector').addEventListener('change', (e) => {
            const agentId = e.target.value;
            if (agentId) {
                this.loadHourlyMetrics(agentId);
            } else {
                document.getElementById('hourly-chart-section').style.display = 'none';
            }
        });

        // Fecha de análisis horario
        document.getElementById('hourly-date').addEventListener('change', () => {
            const agentId = document.getElementById('hourly-agent-selector').value;
            if (agentId) {
                this.loadHourlyMetrics(agentId);
            }
        });
    }

    getDateRange() {
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        return { startDate, endDate };
    }

    async loadCampaignSelector() {
        try {
            const response = await fetch('/campaign/campanas');
            const html = await response.text();

            // Parse HTML to extract campaigns (basic approach)
            // In a real scenario, you'd have a dedicated API endpoint
            // For now, we'll create a placeholder
            const selector = document.getElementById('campaign-selector');
            selector.innerHTML = '<option value="">-- Seleccione una campaña --</option>';

            // TODO: Implement proper campaign list API
            console.log('[AnalyticsDashboard] Campaign selector loaded');
        } catch (error) {
            console.error('[AnalyticsDashboard] Error loading campaigns:', error);
        }
    }

    async loadAgentSelector() {
        try {
            // Load agents for hourly analysis
            const { startDate, endDate } = this.getDateRange();
            const response = await fetch(
                `/analytics/api/agents/compare?startDate=${startDate}&endDate=${endDate}`
            );
            const data = await response.json();

            if (data.success) {
                const selector = document.getElementById('hourly-agent-selector');
                selector.innerHTML = '<option value="">-- Seleccione un agente --</option>';

                data.comparison.forEach((agent) => {
                    const option = document.createElement('option');
                    option.value = agent.agentId;
                    option.textContent = agent.agentName;
                    selector.appendChild(option);
                });
            }
        } catch (error) {
            console.error('[AnalyticsDashboard] Error loading agents:', error);
        }
    }

    async loadAgentsComparison() {
        try {
            const { startDate, endDate } = this.getDateRange();

            if (!startDate || !endDate) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Fechas requeridas',
                    text: 'Por favor selecciona un rango de fechas',
                });
                return;
            }

            const response = await fetch(
                `/analytics/api/agents/compare?startDate=${startDate}&endDate=${endDate}`
            );
            const data = await response.json();

            if (data.success) {
                this.currentData.agents = data.comparison;
                this.renderAgentsChart(data.comparison);
                this.renderAgentsTable(data.comparison);
                await this.loadAgentSelector(); // Refresh agent selector
            }
        } catch (error) {
            console.error('[AnalyticsDashboard] Error loading agents comparison:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron cargar las métricas de agentes',
            });
        }
    }

    renderAgentsChart(agents) {
        const ctx = document.getElementById('agents-comparison-chart');

        // Destroy existing chart
        if (this.charts.agentsComparison) {
            this.charts.agentsComparison.destroy();
        }

        const labels = agents.map((a) => a.agentName);
        const callsData = agents.map((a) => a.calls.total);
        const salesData = agents.map((a) => a.sales.count);

        this.charts.agentsComparison = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Llamadas Totales',
                        data: callsData,
                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1,
                    },
                    {
                        label: 'Ventas',
                        data: salesData,
                        backgroundColor: 'rgba(75, 192, 192, 0.5)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                    },
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Comparación de Llamadas y Ventas por Agente',
                    },
                },
            },
        });
    }

    renderAgentsTable(agents) {
        const tbody = document.getElementById('agents-metrics-tbody');
        tbody.innerHTML = '';

        if (agents.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted">
                        No hay datos disponibles para el período seleccionado
                    </td>
                </tr>
            `;
            return;
        }

        agents.forEach((agent) => {
            const row = document.createElement('tr');

            // Status badge
            const statusBadge = this.getStatusBadge(agent.status);

            row.innerHTML = `
                <td><strong>${agent.agentName}</strong><br><small class="text-muted">${agent.agentEmail}</small></td>
                <td>${statusBadge}</td>
                <td>${agent.calls.total}</td>
                <td>${agent.calls.answered}</td>
                <td>${agent.calls.answerRate}%</td>
                <td>${agent.sales.count}</td>
                <td>${agent.sales.conversionRate}%</td>
                <td>${this.formatDuration(agent.time.avgCallDuration)}</td>
            `;

            tbody.appendChild(row);
        });
    }

    getStatusBadge(status) {
        const badges = {
            DISPONIBLE: '<span class="badge bg-success">Disponible</span>',
            EN_LLAMADA: '<span class="badge bg-primary">En Llamada</span>',
            PAUSADO: '<span class="badge bg-warning">Pausado</span>',
            AFTER_CALL_WORK: '<span class="badge bg-info">Post-llamada</span>',
            OFFLINE: '<span class="badge bg-secondary">Offline</span>',
        };
        return badges[status] || '<span class="badge bg-secondary">Desconocido</span>';
    }

    formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${String(secs).padStart(2, '0')}`;
    }

    async loadCampaignMetrics(campaignId) {
        try {
            const { startDate, endDate } = this.getDateRange();

            const response = await fetch(
                `/analytics/api/campaign/${campaignId}?startDate=${startDate}&endDate=${endDate}`
            );
            const data = await response.json();

            if (data.success) {
                const metrics = data.metrics;

                // Update summary cards
                document.getElementById('campaign-total-leads').textContent = metrics.leads.total;
                document.getElementById('campaign-contacted').textContent = metrics.leads.contacted;
                document.getElementById('campaign-successful').textContent = metrics.calls.successful;
                document.getElementById('campaign-conversion-rate').textContent =
                    `${metrics.conversion.rate }%`;

                // Show sections
                document.getElementById('campaign-metrics-section').style.display = 'flex';
                document.getElementById('campaign-trend-section').style.display = 'block';

                // Load trend data
                await this.loadCampaignTrend(campaignId);
            }
        } catch (error) {
            console.error('[AnalyticsDashboard] Error loading campaign metrics:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron cargar las métricas de la campaña',
            });
        }
    }

    async loadCampaignTrend(campaignId) {
        try {
            const { startDate, endDate } = this.getDateRange();

            const response = await fetch(
                `/analytics/api/campaign/${campaignId}/trend?startDate=${startDate}&endDate=${endDate}`
            );
            const data = await response.json();

            if (data.success) {
                this.renderCampaignTrendChart(data.trend);
            }
        } catch (error) {
            console.error('[AnalyticsDashboard] Error loading campaign trend:', error);
        }
    }

    renderCampaignTrendChart(trendData) {
        const ctx = document.getElementById('campaign-trend-chart');

        // Destroy existing chart
        if (this.charts.campaignTrend) {
            this.charts.campaignTrend.destroy();
        }

        const labels = trendData.map((d) => new Date(d.timestamp).toLocaleDateString());
        const successfulData = trendData.map((d) => d.successful);
        const failedData = trendData.map((d) => d.failed);

        this.charts.campaignTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Llamadas Exitosas',
                        data: successfulData,
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        tension: 0.4,
                    },
                    {
                        label: 'Llamadas Fallidas',
                        data: failedData,
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        tension: 0.4,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                    },
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                    },
                },
            },
        });
    }

    async loadHourlyMetrics(agentId) {
        try {
            const date = document.getElementById('hourly-date').value;

            if (!date) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Fecha requerida',
                    text: 'Por favor selecciona una fecha',
                });
                return;
            }

            const response = await fetch(
                `/analytics/api/agent/${agentId}/hourly?date=${date}`
            );
            const data = await response.json();

            if (data.success) {
                document.getElementById('hourly-chart-section').style.display = 'block';
                this.renderHourlyChart(data.hourlyMetrics);
            }
        } catch (error) {
            console.error('[AnalyticsDashboard] Error loading hourly metrics:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron cargar las métricas por hora',
            });
        }
    }

    renderHourlyChart(hourlyData) {
        const ctx = document.getElementById('hourly-productivity-chart');

        // Destroy existing chart
        if (this.charts.hourlyProductivity) {
            this.charts.hourlyProductivity.destroy();
        }

        const labels = hourlyData.map((d) => `${d.hour}:00`);
        const callsData = hourlyData.map((d) => d.calls);
        const answeredData = hourlyData.map((d) => d.answered);

        this.charts.hourlyProductivity = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Llamadas Totales',
                        data: callsData,
                        borderColor: 'rgba(54, 162, 235, 1)',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        tension: 0.4,
                    },
                    {
                        label: 'Llamadas Contestadas',
                        data: answeredData,
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        tension: 0.4,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                        },
                    },
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Distribución de Llamadas por Hora',
                    },
                },
            },
        });
    }

    exportAgentsToCSV() {
        const { startDate, endDate } = this.getDateRange();

        if (!startDate || !endDate) {
            Swal.fire({
                icon: 'warning',
                title: 'Fechas requeridas',
                text: 'Por favor selecciona un rango de fechas',
            });
            return;
        }

        const url = `/analytics/export/agents/csv?startDate=${startDate}&endDate=${endDate}`;
        window.location.href = url;
    }

    exportCampaignToCSV() {
        const campaignId = document.getElementById('campaign-selector').value;
        const { startDate, endDate } = this.getDateRange();

        if (!campaignId) {
            Swal.fire({
                icon: 'warning',
                title: 'Campaña requerida',
                text: 'Por favor selecciona una campaña',
            });
            return;
        }

        if (!startDate || !endDate) {
            Swal.fire({
                icon: 'warning',
                title: 'Fechas requeridas',
                text: 'Por favor selecciona un rango de fechas',
            });
            return;
        }

        const url = `/analytics/export/campaign/${campaignId}/csv?startDate=${startDate}&endDate=${endDate}`;
        window.location.href = url;
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.analyticsDashboard = new AnalyticsDashboard();
});

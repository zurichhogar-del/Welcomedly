/**
 * Sistema de workstation para agentes - Fase 1 + Sprint 2.2
 * Gestiona tiempo productivo, pausas y estado del agente con recuperación automática
 */
class AgentWorkstation {
    constructor() {
        this.socket = null;
        this.currentUser = null;
        this.currentStatus = 'offline';
        this.currentPause = null;
        this.productiveTimer = null;
        this.pauseTimer = null;
        this.syncInterval = null; // Sprint 1.2: Interval para sincronización con backend
        this.sessionStartTime = null;
        this.counters = {
            productive: 0,
            pause: 0,
            calls: 0,
            sales: 0
        };

        // Sprint 2.2: Variables para reconexión robusta
        this.reconnectionAttempts = 0;
        this.maxReconnectionAttempts = 10;
        this.baseReconnectionDelay = 1000; // 1 segundo
        this.maxReconnectionDelay = 30000; // 30 segundos
        this.isReconnecting = false;
        this.reconnectionTimer = null;
        this.wasConnected = false;

        this.init();
    }

    /**
     * Inicializar el sistema
     * Sprint 2.2: Con recuperación de sesión activa
     */
    async init() {
        try {
            // Sprint 2.2: Intentar recuperar sesión activa antes de conectar
            const session = await this.recoverActiveSession();

            if (session) {
                console.log('✅ Sesión recuperada:', session);
                this.currentStatus = session.status;
                this.counters.productive = session.productiveTime;
                this.counters.pause = session.pauseTime;
                this.counters.calls = session.calls;
                this.counters.sales = session.sales;
                this.sessionStartTime = new Date(session.loginTime);
            }

            // Conectar a WebSocket
            await this.connectWebSocket();

            // Obtener usuario actual
            this.currentUser = await this.getCurrentUser();

            // Inicializar UI
            this.initializeUI();

            // Configurar event listeners
            this.setupEventListeners();

            // Iniciar tracking de tiempo
            this.startTimeTracking();

            console.log('🚀 AgentWorkstation inicializado correctamente');
        } catch (error) {
            console.error('❌ Error inicializando AgentWorkstation:', error);
            this.showError('Error al inicializar la estación de trabajo');
        }
    }

    /**
     * Conectar a WebSocket
     * Sprint 2.2: Con reconnection automática y backoff exponencial
     */
    async connectWebSocket() {
        return new Promise((resolve, reject) => {
            try {
                this.socket = io({
                    transports: ['websocket', 'polling'],
                    upgrade: true,
                    rememberUpgrade: true,
                    // Sprint 2.2: Deshabilitar reconexión automática de Socket.IO
                    // Usaremos nuestra propia lógica con backoff exponencial
                    reconnection: false,
                    timeout: 10000
                });

                this.socket.on('connect', () => {
                    console.log('✅ Conectado al servidor WebSocket');
                    this.wasConnected = true;
                    this.reconnectionAttempts = 0;
                    this.isReconnecting = false;

                    // Ocultar modal de reconexión si estaba visible
                    this.hideReconnectionModal();

                    // Autenticar con sesión actual
                    this.socket.emit('authenticate', {
                        sessionCookie: document.cookie
                    });
                });

                this.socket.on('authenticated', (data) => {
                    if (data.success) {
                        console.log('✅ Autenticado en WebSocket');
                        resolve();
                    } else {
                        console.error('❌ Error de autenticación:', data.error);
                        reject(new Error(data.error));
                    }
                });

                this.socket.on('initial_status', (data) => {
                    this.updateStatus(data.agentStatus);
                    this.updateSession(data.workSession);
                    this.updatePause(data.activePause);
                });

                this.socket.on('agent:status_updated', (data) => {
                    if (data.agentId === this.currentUser.id) {
                        this.updateStatus(data);
                    }
                });

                this.socket.on('pause:started', (data) => {
                    this.onPauseStarted(data);
                });

                this.socket.on('pause:ended', (data) => {
                    this.onPauseEnded(data);
                });

                this.socket.on('error', (data) => {
                    console.error('❌ Error WebSocket:', data);
                    this.showError(data.message || 'Error de conexión');
                });

                // Sprint 2.2: Manejar desconexión con reconexión automática
                this.socket.on('disconnect', (reason) => {
                    console.warn('⚠️ Desconectado del servidor WebSocket. Razón:', reason);

                    // Solo intentar reconectar si la desconexión no fue intencional
                    if (reason !== 'io client disconnect' && this.wasConnected) {
                        this.handleDisconnection();
                    }
                });

                this.socket.on('connect_error', (error) => {
                    console.error('❌ Error de conexión WebSocket:', error);

                    // Si ya estábamos conectados antes, intentar reconectar
                    if (this.wasConnected) {
                        this.handleDisconnection();
                    } else {
                        reject(error);
                    }
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Sprint 2.2: Manejar desconexión con reconexión automática y backoff exponencial
     */
    handleDisconnection() {
        if (this.isReconnecting) {return;} // Ya estamos intentando reconectar

        this.isReconnecting = true;
        this.showReconnectionModal();

        this.attemptReconnection();
    }

    /**
     * Sprint 2.2: Intentar reconexión con backoff exponencial
     */
    async attemptReconnection() {
        if (this.reconnectionAttempts >= this.maxReconnectionAttempts) {
            console.error('❌ Máximo de intentos de reconexión alcanzado');
            this.showReconnectionError();
            return;
        }

        this.reconnectionAttempts++;

        // Calcular delay con backoff exponencial: delay = baseDelay * 2^attempts
        const delay = Math.min(
            this.baseReconnectionDelay * Math.pow(2, this.reconnectionAttempts - 1),
            this.maxReconnectionDelay
        );

        console.log(`🔄 Intento de reconexión ${this.reconnectionAttempts}/${this.maxReconnectionAttempts} en ${delay}ms...`);

        this.updateReconnectionModal(this.reconnectionAttempts, delay);

        // Esperar el delay antes de intentar reconectar
        this.reconnectionTimer = setTimeout(async () => {
            try {
                // Intentar reconectar el socket
                this.socket.connect();

                // Esperar un momento para verificar si la conexión fue exitosa
                await new Promise(resolve => setTimeout(resolve, 2000));

                if (!this.socket.connected) {
                    // Si no se conectó, intentar de nuevo
                    this.attemptReconnection();
                } else {
                    // Conexión exitosa - recuperar sesión
                    console.log('🔄 Reconectado exitosamente, recuperando estado...');
                    await this.recoverActiveSession();
                    this.hideReconnectionModal();
                    this.showSuccess('Conexión restaurada correctamente');
                }

            } catch (error) {
                console.error('Error en intento de reconexión:', error);
                this.attemptReconnection();
            }
        }, delay);
    }

    /**
     * Sprint 2.2: Mostrar modal de reconexión
     */
    showReconnectionModal() {
        // Crear modal si no existe
        let modal = document.getElementById('reconnection-modal');

        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'reconnection-modal';
            modal.className = 'reconnection-modal';
            modal.innerHTML = `
                <div class="reconnection-content">
                    <div class="reconnection-spinner"></div>
                    <h3>Conexión perdida</h3>
                    <p id="reconnection-message">Intentando reconectar...</p>
                    <p id="reconnection-attempt" class="text-muted">Intento 1</p>
                    <button id="manual-reconnect-btn" class="btn btn-primary btn-sm" style="display: none;">
                        Reintentar ahora
                    </button>
                </div>
            `;
            document.body.appendChild(modal);

            // Event listener para botón de reintento manual
            document.getElementById('manual-reconnect-btn').addEventListener('click', () => {
                this.cancelReconnection();
                this.reconnectionAttempts = 0;
                this.attemptReconnection();
            });
        }

        modal.style.display = 'flex';
    }

    /**
     * Sprint 2.2: Actualizar modal de reconexión
     */
    updateReconnectionModal(attempt, delay) {
        const attemptEl = document.getElementById('reconnection-attempt');
        const messageEl = document.getElementById('reconnection-message');

        if (attemptEl) {
            attemptEl.textContent = `Intento ${attempt}/${this.maxReconnectionAttempts}`;
        }

        if (messageEl) {
            const seconds = Math.ceil(delay / 1000);
            messageEl.textContent = `Reconectando en ${seconds} segundo${seconds !== 1 ? 's' : ''}...`;
        }
    }

    /**
     * Sprint 2.2: Ocultar modal de reconexión
     */
    hideReconnectionModal() {
        const modal = document.getElementById('reconnection-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Sprint 2.2: Mostrar error de reconexión (máximo de intentos alcanzado)
     */
    showReconnectionError() {
        const messageEl = document.getElementById('reconnection-message');
        const attemptEl = document.getElementById('reconnection-attempt');
        const manualBtn = document.getElementById('manual-reconnect-btn');

        if (messageEl) {
            messageEl.textContent = 'No se pudo restablecer la conexión';
            messageEl.className = 'text-danger';
        }

        if (attemptEl) {
            attemptEl.textContent = 'Verifica tu conexión a internet';
        }

        if (manualBtn) {
            manualBtn.style.display = 'block';
        }

        // Mostrar alerta al usuario
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Error de Conexión',
                text: 'No se pudo restablecer la conexión con el servidor. Por favor, recarga la página.',
                showCancelButton: true,
                confirmButtonText: 'Recargar página',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.reload();
                }
            });
        }
    }

    /**
     * Sprint 2.2: Cancelar intento de reconexión en curso
     */
    cancelReconnection() {
        if (this.reconnectionTimer) {
            clearTimeout(this.reconnectionTimer);
            this.reconnectionTimer = null;
        }
    }

    /**
     * Sprint 2.2: Recuperar sesión activa al refrescar navegador
     */
    async recoverActiveSession() {
        try {
            const response = await fetch('/api/agent/session/active');
            const data = await response.json();

            if (data.success && data.session) {
                console.log('📥 Recuperando sesión activa...', data.session);
                return data.session;
            }

            console.log('ℹ️ No hay sesión activa para recuperar');
            return null;
        } catch (error) {
            console.error('Error recuperando sesión activa:', error);
            return null;
        }
    }

    /**
     * Obtener usuario actual de la sesión
     */
    async getCurrentUser() {
        try {
            const response = await fetch('/api/session/current');
            const data = await response.json();

            if (data.success) {
                return data.usuario;
            } else {
                throw new Error('No se pudo obtener el usuario actual');
            }
        } catch (error) {
            console.error('Error obteniendo usuario:', error);
            // Fallback: usar datos del DOM si existen
            return {
                id: document.querySelector('[data-agent-id]')?.dataset.agentId,
                nombre: document.querySelector('[data-agent-name]')?.dataset.agentName
            };
        }
    }

    /**
     * Inicializar elementos de la UI
     */
    initializeUI() {
        // Configurar contador de tiempo productivo
        this.setupProductiveTimer();

        // Configurar selector de pausas
        this.setupPauseSelector();

        // Configurar botones de acción
        this.setupActionButtons();

        // Inicializar indicadores de estado
        this.updateStatusIndicators();

        // Configurar elementos de métricas
        this.updateMetricsDisplay();
    }

    /**
     * Configurar contador de tiempo productivo
     */
    setupProductiveTimer() {
        const timerElement = document.getElementById('productive-timer');
        if (timerElement) {
            timerElement.textContent = this.formatTime(0);
        }
    }

    /**
     * Configurar selector de pausas
     */
    setupPauseSelector() {
        const pauseSelect = document.getElementById('pause-type');
        if (pauseSelect) {
            // Habilitar/deshabilitar según estado
            this.updatePauseControls();
        }
    }

    /**
     * Configurar botones de acción
     */
    setupActionButtons() {
        const togglePauseBtn = document.getElementById('toggle-pause');
        const statusAvailableBtn = document.getElementById('status-available');
        const statusOfflineBtn = document.getElementById('status-offline');

        if (togglePauseBtn) {
            togglePauseBtn.addEventListener('click', () => {
                if (this.currentPause) {
                    this.endPause();
                } else {
                    this.startPause();
                }
            });
        }

        if (statusAvailableBtn) {
            statusAvailableBtn.addEventListener('click', () => {
                this.changeStatus('available');
            });
        }

        if (statusOfflineBtn) {
            statusOfflineBtn.addEventListener('click', () => {
                this.changeStatus('offline');
            });
        }
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        // Heartbeat para mantener conexión activa
        setInterval(() => {
            if (this.socket && this.socket.connected) {
                this.socket.emit('heartbeat');
            }
        }, 30000);

        // Eventos antes de cerrar página
        window.addEventListener('beforeunload', () => {
            if (this.currentStatus !== 'offline') {
                this.changeStatus('offline', 'Cierre de navegador');
            }
        });

        // Eventos de visibilidad de página
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stopTimeTracking();
            } else {
                this.startTimeTracking();
            }
        });
    }

    /**
     * Iniciar tracking de tiempo
     */
    async startTimeTracking() {
        if (this.productiveTimer) {return;}

        // Sprint 1.2: Obtener métricas iniciales del backend
        await this.loadInitialMetrics();

        this.productiveTimer = setInterval(() => {
            if (this.currentStatus === 'available' || this.currentStatus === 'in_call') {
                this.counters.productive++;
                this.updateProductiveTimer();
            }

            if (this.currentPause && this.currentStatus === 'on_pause') {
                this.counters.pause++;
                this.updatePauseTimer();
            }
        }, 1000);

        // Sprint 1.2: Sincronizar con backend cada 10 segundos
        this.startBackendSync();

        this.sessionStartTime = Date.now();
    }

    /**
     * Sprint 1.2: Cargar métricas iniciales desde el backend
     */
    async loadInitialMetrics() {
        try {
            const response = await fetch('/api/agent/metrics/current');
            const data = await response.json();

            if (data.success && data.data) {
                // Cargar métricas desde Redis
                this.counters.productive = data.data.metrics.productiveTime || 0;
                this.counters.pause = data.data.metrics.pauseTime || 0;
                this.counters.calls = data.data.metrics.calls || 0;
                this.counters.sales = data.data.metrics.sales || 0;

                console.log('✅ Métricas iniciales cargadas desde backend:', this.counters);
                this.updateMetricsDisplay();
            }
        } catch (error) {
            console.error('❌ Error cargando métricas iniciales:', error);
            // Continuar con valores locales si hay error
        }
    }

    /**
     * Sprint 1.2: Iniciar sincronización periódica con backend
     */
    startBackendSync() {
        if (this.syncInterval) {return;}

        this.syncInterval = setInterval(async () => {
            await this.syncMetricsWithBackend();
        }, 10000); // Cada 10 segundos
    }

    /**
     * Sprint 1.2: Sincronizar métricas con backend
     */
    async syncMetricsWithBackend() {
        try {
            const response = await fetch('/api/agent/metrics/current');
            const data = await response.json();

            if (data.success && data.data) {
                // Actualizar métricas desde Redis sin perder el contador local
                const backendMetrics = data.data.metrics;

                // Solo actualizar si los valores del backend son mayores
                // Esto previene retrocesos en el contador
                if (backendMetrics.productiveTime > this.counters.productive) {
                    this.counters.productive = backendMetrics.productiveTime;
                }
                if (backendMetrics.pauseTime > this.counters.pause) {
                    this.counters.pause = backendMetrics.pauseTime;
                }
                if (backendMetrics.calls > this.counters.calls) {
                    this.counters.calls = backendMetrics.calls;
                }
                if (backendMetrics.sales > this.counters.sales) {
                    this.counters.sales = backendMetrics.sales;
                }

                this.updateMetricsDisplay();

                console.log('🔄 Métricas sincronizadas con backend:', this.counters);
            }
        } catch (error) {
            console.error('❌ Error sincronizando métricas:', error);
            // El contador local sigue funcionando
        }
    }

    /**
     * Detener tracking de tiempo
     */
    stopTimeTracking() {
        if (this.productiveTimer) {
            clearInterval(this.productiveTimer);
            this.productiveTimer = null;
        }

        // Sprint 1.2: Detener sincronización con backend
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    /**
     * Cambiar estado del agente
     */
    async changeStatus(status, reason = '') {
        try {
            this.showLoading('Cambiando estado...');

            const response = await fetch('/api/agent/status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': this.getCSRFToken()
                },
                body: JSON.stringify({
                    status,
                    reason,
                    metadata: {
                        timestamp: new Date().toISOString()
                    }
                })
            });

            const data = await response.json();

            if (data.success) {
                this.currentStatus = status;
                this.updateStatusIndicators();
                this.showSuccess(`Estado cambiado a: ${this.getStatusLabel(status)}`);
            } else {
                throw new Error(data.error || 'Error cambiando estado');
            }

        } catch (error) {
            console.error('Error en changeStatus:', error);
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Iniciar pausa
     */
    async startPause() {
        try {
            const pauseSelect = document.getElementById('pause-type');
            const pauseReason = document.getElementById('pause-reason');

            const pauseType = pauseSelect?.value;
            const reason = pauseReason?.value || '';

            if (!pauseType) {
                this.showError('Debe seleccionar un tipo de pausa');
                return;
            }

            this.showLoading('Iniciando pausa...');

            const response = await fetch('/api/agent/pause/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': this.getCSRFToken()
                },
                body: JSON.stringify({
                    pauseType,
                    reason
                })
            });

            const data = await response.json();

            if (data.success) {
                // El evento 'pause:started' actualiza la UI
                this.showSuccess(`Pausa iniciada: ${this.getPauseLabel(pauseType)}`);
            } else {
                throw new Error(data.error || 'Error iniciando pausa');
            }

        } catch (error) {
            console.error('Error en startPause:', error);
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Finalizar pausa
     */
    async endPause() {
        try {
            this.showLoading('Finalizando pausa...');

            const response = await fetch('/api/agent/pause/end', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': this.getCSRFToken()
                }
            });

            const data = await response.json();

            if (data.success) {
                // El evento 'pause:ended' actualiza la UI
                this.showSuccess('Pausa finalizada');
            } else {
                throw new Error(data.error || 'Error finalizando pausa');
            }

        } catch (error) {
            console.error('Error en endPause:', error);
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Manejar evento de pausa iniciada
     */
    onPauseStarted(data) {
        this.currentPause = {
            type: data.pauseType,
            startTime: new Date(data.startTime)
        };

        this.currentStatus = 'on_pause';
        this.updatePauseControls();
        this.updateStatusIndicators();

        // Resetear contador de pausa
        this.counters.pause = 0;
    }

    /**
     * Manejar evento de pausa finalizada
     */
    onPauseEnded(data) {
        this.currentPause = null;
        this.currentStatus = 'available';

        this.updatePauseControls();
        this.updateStatusIndicators();

        // Limpiar campos de pausa
        const pauseReason = document.getElementById('pause-reason');
        if (pauseReason) {
            pauseReason.value = '';
        }
    }

    /**
     * Actualizar estado desde evento WebSocket
     */
    updateStatus(statusData) {
        this.currentStatus = statusData.status;
        this.updateStatusIndicators();
        this.updateStatusDisplay(statusData);
    }

    /**
     * Actualizar controles de pausa
     */
    updatePauseControls() {
        const togglePauseBtn = document.getElementById('toggle-pause');
        const pauseSelect = document.getElementById('pause-type');

        if (togglePauseBtn) {
            if (this.currentPause) {
                togglePauseBtn.textContent = 'Finalizar Pausa';
                togglePauseBtn.className = 'btn btn-success';
                togglePauseBtn.disabled = false;
            } else {
                togglePauseBtn.textContent = 'Iniciar Pausa';
                togglePauseBtn.className = 'btn btn-warning';
                togglePauseBtn.disabled = this.currentStatus === 'in_call';
            }
        }

        if (pauseSelect) {
            pauseSelect.disabled = !!this.currentPause;
        }
    }

    /**
     * Actualizar indicadores de estado
     */
    updateStatusIndicators() {
        // Actualizar botones de estado
        const statusButtons = document.querySelectorAll('[data-status]');
        statusButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.status === this.currentStatus);
        });

        // Actualizar clase de estado en body
        document.body.className = document.body.className.replace(/status-\w+/g, '');
        document.body.classList.add(`status-${this.currentStatus}`);
    }

    /**
     * Actualizar display de estado
     */
    updateStatusDisplay(statusData) {
        const statusElement = document.getElementById('current-status');
        const statusReason = document.getElementById('status-reason');

        if (statusElement) {
            statusElement.textContent = this.getStatusLabel(statusData.status);
        }

        if (statusReason) {
            statusReason.textContent = statusData.reason || '';
        }
    }

    /**
     * Actualizar timer productivo
     */
    updateProductiveTimer() {
        const timerElement = document.getElementById('productive-timer');
        if (timerElement) {
            timerElement.textContent = this.formatTime(this.counters.productive);
        }

        this.updateMetricsDisplay();
    }

    /**
     * Actualizar timer de pausa
     */
    updatePauseTimer() {
        const timerElement = document.getElementById('pause-timer');
        if (timerElement && this.currentPause) {
            timerElement.textContent = this.formatTime(this.counters.pause);
        }
    }

    /**
     * Actualizar display de métricas
     */
    updateMetricsDisplay() {
        // Actualizar contador de llamadas
        const callsElement = document.getElementById('calls-count');
        if (callsElement) {
            callsElement.textContent = this.counters.calls;
        }

        // Actualizar contador de ventas
        const salesElement = document.getElementById('sales-count');
        if (salesElement) {
            salesElement.textContent = this.counters.sales;
        }

        // Actualizar tiempo de trabajo total
        if (this.sessionStartTime) {
            const totalWorkTime = Math.floor((Date.now() - this.sessionStartTime) / 1000);
            const workTimeElement = document.getElementById('work-time');
            if (workTimeElement) {
                workTimeElement.textContent = this.formatTime(totalWorkTime);
            }
        }

        // Sprint 3.2.5: Cargar métricas de llamadas del día
        this.loadCallMetrics();
    }

    /**
     * Sprint 3.2.5: Cargar métricas de llamadas desde la API
     */
    async loadCallMetrics() {
        try {
            // Get today's date range
            const startDate = new Date();
            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date();
            endDate.setHours(23, 59, 59, 999);

            const response = await fetch(`/api/telephony/calls/stats?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);
            const data = await response.json();

            if (data.success && data.stats) {
                const stats = data.stats;

                // Update call metrics in UI
                const callsCountEl = document.getElementById('calls-count');
                if (callsCountEl) {
                    callsCountEl.textContent = stats.totalCalls || 0;
                }

                const answeredEl = document.getElementById('calls-answered');
                if (answeredEl) {
                    answeredEl.textContent = stats.answered || 0;
                }

                const answerRateEl = document.getElementById('answer-rate');
                if (answerRateEl) {
                    answerRateEl.textContent = `${stats.answerRate || 0}%`;
                }

                const avgDurationEl = document.getElementById('avg-duration');
                if (avgDurationEl) {
                    const minutes = Math.floor((stats.avgDuration || 0) / 60);
                    const seconds = (stats.avgDuration || 0) % 60;
                    avgDurationEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                }

                console.log('[AgentWorkstation] Call metrics updated:', stats);
            }
        } catch (error) {
            console.error('[AgentWorkstation] Error loading call metrics:', error);
        }
    }

    /**
     * Formatear tiempo en HH:MM:SS
     */
    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        return [
            hours.toString().padStart(2, '0'),
            minutes.toString().padStart(2, '0'),
            secs.toString().padStart(2, '0')
        ].join(':');
    }

    /**
     * Obtener etiqueta de estado
     */
    getStatusLabel(status) {
        const labels = {
            'available': 'Disponible',
            'in_call': 'En llamada',
            'on_pause': 'En pausa',
            'after_call_work': 'Trabajo post-llamada',
            'training': 'En capacitación',
            'meeting': 'En reunión',
            'offline': 'Desconectado'
        };

        return labels[status] || status;
    }

    /**
     * Obtener etiqueta de pausa
     */
    getPauseLabel(pauseType) {
        const labels = {
            'bathroom': 'Baño',
            'lunch': 'Almuerzo',
            'break': 'Break',
            'coaching': 'Coaching',
            'system_issue': 'Problemas técnicos',
            'personal': 'Personal'
        };

        return labels[pauseType] || pauseType;
    }

    /**
     * Obtener token CSRF
     */
    getCSRFToken() {
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        return metaTag ? metaTag.getAttribute('content') : '';
    }

    /**
     * Mostrar mensaje de éxito
     */
    showSuccess(message) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'Éxito',
                text: message,
                timer: 3000,
                showConfirmButton: false
            });
        } else {
            alert(message);
        }
    }

    /**
     * Mostrar mensaje de error
     */
    showError(message) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: message,
                timer: 5000
            });
        } else {
            alert(message);
        }
    }

    /**
     * Mostrar mensaje de advertencia
     */
    showWarning(message) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning',
                title: 'Advertencia',
                text: message,
                timer: 3000,
                showConfirmButton: false
            });
        } else {
            console.warn(message);
        }
    }

    /**
     * Mostrar indicador de carga
     */
    showLoading(message = 'Cargando...') {
        const loader = document.getElementById('loading-overlay');
        if (loader) {
            loader.style.display = 'flex';
            const text = loader.querySelector('.loading-text');
            if (text) {
                text.textContent = message;
            }
        }
    }

    /**
     * Ocultar indicador de carga
     */
    hideLoading() {
        const loader = document.getElementById('loading-overlay');
        if (loader) {
            loader.style.display = 'none';
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Solo inicializar en páginas de agente
    if (document.querySelector('.agent-workstation') ||
        document.querySelector('[data-page="agent-dashboard"]')) {
        window.agentWorkstation = new AgentWorkstation();
    }
});

// Exportar para uso global
window.AgentWorkstation = AgentWorkstation;
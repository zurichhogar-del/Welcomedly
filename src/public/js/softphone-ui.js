/**
 * Welcomedly Softphone UI Controller
 * Sprint 3.1.4 - Manages the softphone user interface
 *
 * This module handles UI updates and user interactions
 */

class SoftphoneUI {
    constructor(softphone) {
        this.softphone = softphone;
        this.isMinimized = false;
        this.dialpadVisible = false;
        this.currentNumber = '';
        this.callTimer = null;
        this.callDuration = 0;

        // DOM elements (will be initialized after render)
        this.elements = {};

        // State
        this.state = {
            isRegistered: false,
            hasActiveCall: false,
            isIncoming: false,
            isMuted: false,
            isOnHold: false
        };
    }

    /**
     * Initialize the UI
     */
    async init() {
        // Render HTML
        this.render();

        // Cache DOM elements
        this.cacheElements();

        // Setup event listeners
        this.setupEventListeners();

        // Fetch SIP credentials and initialize softphone
        await this.initializeSoftphone();
    }

    /**
     * Render the softphone HTML
     */
    render() {
        const html = `
            <div class="softphone-container" id="softphone">
                <!-- Header -->
                <div class="softphone-header">
                    <div class="softphone-title">
                        <i class="fas fa-phone"></i>
                        <span>Softphone</span>
                    </div>
                    <div class="softphone-status">
                        <span class="softphone-status-indicator disconnected" id="status-indicator"></span>
                        <span id="status-text">Desconectado</span>
                    </div>
                    <div class="softphone-controls">
                        <button class="softphone-btn-icon" id="btn-minimize" title="Minimizar">
                            <i class="fas fa-minus"></i>
                        </button>
                    </div>
                </div>

                <!-- Body -->
                <div class="softphone-body">
                    <!-- Extension Display -->
                    <div class="softphone-extension">
                        <div class="softphone-extension-label">Extensión</div>
                        <div class="softphone-extension-number" id="extension-number">----</div>
                    </div>

                    <!-- Incoming Call Alert -->
                    <div class="softphone-incoming-call" id="incoming-call">
                        <div class="softphone-incoming-call-text">
                            <div class="softphone-incoming-call-label">Llamada entrante</div>
                            <div class="softphone-incoming-call-number" id="incoming-number"></div>
                        </div>
                        <div class="softphone-incoming-call-actions">
                            <button class="softphone-btn-call softphone-btn-answer" id="btn-answer">
                                <i class="fas fa-phone"></i>
                                Contestar
                            </button>
                            <button class="softphone-btn-call softphone-btn-hangup" id="btn-reject">
                                <i class="fas fa-phone-slash"></i>
                                Rechazar
                            </button>
                        </div>
                    </div>

                    <!-- Call Info -->
                    <div class="softphone-call-info" id="call-info">
                        <div class="softphone-call-number" id="call-number"></div>
                        <div class="softphone-call-status" id="call-status">En llamada</div>
                        <div class="softphone-call-duration" id="call-duration">00:00:00</div>
                    </div>

                    <!-- Call Controls -->
                    <div class="softphone-call-controls" id="call-controls">
                        <button class="softphone-btn-control" id="btn-mute">
                            <i class="fas fa-microphone"></i>
                            <span>Silenciar</span>
                        </button>
                        <button class="softphone-btn-control" id="btn-hold">
                            <i class="fas fa-pause"></i>
                            <span>Pausar</span>
                        </button>
                        <button class="softphone-btn-control" id="btn-keypad">
                            <i class="fas fa-th"></i>
                            <span>Teclado</span>
                        </button>
                    </div>

                    <!-- Phone Number Input -->
                    <div class="softphone-input-group" id="input-group">
                        <input
                            type="text"
                            class="softphone-input"
                            id="phone-input"
                            placeholder="Ingresa el número"
                            maxlength="20"
                        />
                    </div>

                    <!-- Call/Hangup Button -->
                    <button class="softphone-btn-call" id="btn-call">
                        <i class="fas fa-phone"></i>
                        <span>Llamar</span>
                    </button>

                    <!-- Toggle Dialpad -->
                    <button class="softphone-btn-toggle-dialpad" id="btn-toggle-dialpad">
                        <i class="fas fa-th"></i>
                        <span>Mostrar teclado</span>
                    </button>
                </div>

                <!-- Dialpad -->
                <div class="softphone-dialpad" id="dialpad">
                    <div class="softphone-dialpad-grid">
                        <button class="softphone-dialpad-btn" data-digit="1">
                            <div class="softphone-dialpad-btn-number">1</div>
                            <div class="softphone-dialpad-btn-letters"></div>
                        </button>
                        <button class="softphone-dialpad-btn" data-digit="2">
                            <div class="softphone-dialpad-btn-number">2</div>
                            <div class="softphone-dialpad-btn-letters">ABC</div>
                        </button>
                        <button class="softphone-dialpad-btn" data-digit="3">
                            <div class="softphone-dialpad-btn-number">3</div>
                            <div class="softphone-dialpad-btn-letters">DEF</div>
                        </button>
                        <button class="softphone-dialpad-btn" data-digit="4">
                            <div class="softphone-dialpad-btn-number">4</div>
                            <div class="softphone-dialpad-btn-letters">GHI</div>
                        </button>
                        <button class="softphone-dialpad-btn" data-digit="5">
                            <div class="softphone-dialpad-btn-number">5</div>
                            <div class="softphone-dialpad-btn-letters">JKL</div>
                        </button>
                        <button class="softphone-dialpad-btn" data-digit="6">
                            <div class="softphone-dialpad-btn-number">6</div>
                            <div class="softphone-dialpad-btn-letters">MNO</div>
                        </button>
                        <button class="softphone-dialpad-btn" data-digit="7">
                            <div class="softphone-dialpad-btn-number">7</div>
                            <div class="softphone-dialpad-btn-letters">PQRS</div>
                        </button>
                        <button class="softphone-dialpad-btn" data-digit="8">
                            <div class="softphone-dialpad-btn-number">8</div>
                            <div class="softphone-dialpad-btn-letters">TUV</div>
                        </button>
                        <button class="softphone-dialpad-btn" data-digit="9">
                            <div class="softphone-dialpad-btn-number">9</div>
                            <div class="softphone-dialpad-btn-letters">WXYZ</div>
                        </button>
                        <button class="softphone-dialpad-btn" data-digit="*">
                            <div class="softphone-dialpad-btn-number">*</div>
                        </button>
                        <button class="softphone-dialpad-btn" data-digit="0">
                            <div class="softphone-dialpad-btn-number">0</div>
                            <div class="softphone-dialpad-btn-letters">+</div>
                        </button>
                        <button class="softphone-dialpad-btn" data-digit="#">
                            <div class="softphone-dialpad-btn-number">#</div>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            container: document.getElementById('softphone'),
            statusIndicator: document.getElementById('status-indicator'),
            statusText: document.getElementById('status-text'),
            extensionNumber: document.getElementById('extension-number'),
            phoneInput: document.getElementById('phone-input'),
            btnCall: document.getElementById('btn-call'),
            btnMinimize: document.getElementById('btn-minimize'),
            btnToggleDialpad: document.getElementById('btn-toggle-dialpad'),
            dialpad: document.getElementById('dialpad'),
            dialpadBtns: document.querySelectorAll('.softphone-dialpad-btn'),
            incomingCall: document.getElementById('incoming-call'),
            incomingNumber: document.getElementById('incoming-number'),
            btnAnswer: document.getElementById('btn-answer'),
            btnReject: document.getElementById('btn-reject'),
            callInfo: document.getElementById('call-info'),
            callNumber: document.getElementById('call-number'),
            callStatus: document.getElementById('call-status'),
            callDuration: document.getElementById('call-duration'),
            callControls: document.getElementById('call-controls'),
            btnMute: document.getElementById('btn-mute'),
            btnHold: document.getElementById('btn-hold'),
            btnKeypad: document.getElementById('btn-keypad'),
            inputGroup: document.getElementById('input-group')
        };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Minimize/Maximize
        this.elements.btnMinimize.addEventListener('click', () => this.toggleMinimize());
        this.elements.container.addEventListener('dblclick', (e) => {
            if (e.target === this.elements.container || e.target.closest('.softphone-header')) {
                this.toggleMinimize();
            }
        });

        // Call button
        this.elements.btnCall.addEventListener('click', () => this.handleCallButton());

        // Phone input
        this.elements.phoneInput.addEventListener('input', (e) => {
            this.currentNumber = e.target.value;
        });

        this.elements.phoneInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleCallButton();
            }
        });

        // Dialpad toggle
        this.elements.btnToggleDialpad.addEventListener('click', () => this.toggleDialpad());

        // Dialpad buttons
        this.elements.dialpadBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const digit = btn.getAttribute('data-digit');
                this.handleDialpadPress(digit);
            });
        });

        // Incoming call actions
        this.elements.btnAnswer.addEventListener('click', () => this.answerCall());
        this.elements.btnReject.addEventListener('click', () => this.rejectCall());

        // Call controls
        this.elements.btnMute.addEventListener('click', () => this.toggleMute());
        this.elements.btnHold.addEventListener('click', () => this.toggleHold());
        this.elements.btnKeypad.addEventListener('click', () => this.toggleDialpad());

        // Softphone event callbacks
        this.softphone.on('registered', () => this.onRegistered());
        this.softphone.on('unregistered', () => this.onUnregistered());
        this.softphone.on('incomingCall', (data) => this.onIncomingCall(data));
        this.softphone.on('callEstablished', () => this.onCallEstablished());
        this.softphone.on('callEnded', (stats) => this.onCallEnded(stats));
        this.softphone.on('callFailed', (error) => this.onCallFailed(error));
        this.softphone.on('registrationFailed', (error) => this.onRegistrationFailed(error));
    }

    /**
     * Initialize softphone with credentials from API
     */
    async initializeSoftphone() {
        try {
            // Show loading state
            this.updateStatus('connecting', 'Conectando...');

            // Fetch SIP credentials
            const response = await fetch('/api/telephony/sip/credentials');
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'No se pudieron obtener las credenciales SIP');
            }

            // Display extension
            this.elements.extensionNumber.textContent = data.credentials.extension;

            // Initialize softphone
            await this.softphone.initialize({
                sipServer: data.credentials.sipServer,
                sipPort: data.credentials.sipPort,
                username: data.credentials.username,
                password: data.credentials.password,
                extension: data.credentials.extension,
                displayName: data.credentials.displayName
            });

        } catch (error) {
            console.error('[SoftphoneUI] Initialization error:', error);
            this.updateStatus('error', 'Error de conexión');
            this.showNotification('Error', error.message, 'error');
        }
    }

    /**
     * Handle call button click
     */
    async handleCallButton() {
        if (this.state.hasActiveCall) {
            // Hangup
            await this.hangupCall();
        } else {
            // Make call
            await this.makeCall();
        }
    }

    /**
     * Make an outbound call
     */
    async makeCall() {
        try {
            const number = this.currentNumber.trim();

            if (!number) {
                this.showNotification('Error', 'Ingresa un número telefónico', 'error');
                return;
            }

            // Update UI
            this.updateStatus('calling', 'Llamando...');
            this.elements.callNumber.textContent = number;
            this.showCallInterface();

            // Make call
            await this.softphone.call(number);

        } catch (error) {
            console.error('[SoftphoneUI] Call error:', error);
            this.showNotification('Error', error.message, 'error');
            this.hideCallInterface();
        }
    }

    /**
     * Hangup call
     */
    async hangupCall() {
        try {
            await this.softphone.hangup();
        } catch (error) {
            console.error('[SoftphoneUI] Hangup error:', error);
        }
    }

    /**
     * Answer incoming call
     */
    async answerCall() {
        try {
            await this.softphone.answer();
            this.elements.incomingCall.classList.remove('active');
        } catch (error) {
            console.error('[SoftphoneUI] Answer error:', error);
            this.showNotification('Error', error.message, 'error');
        }
    }

    /**
     * Reject incoming call
     */
    async rejectCall() {
        await this.hangupCall();
        this.elements.incomingCall.classList.remove('active');
    }

    /**
     * Toggle mute
     */
    toggleMute() {
        const isMuted = this.softphone.toggleMute();
        this.elements.btnMute.classList.toggle('active', isMuted);

        const icon = this.elements.btnMute.querySelector('i');
        const text = this.elements.btnMute.querySelector('span');

        if (isMuted) {
            icon.className = 'fas fa-microphone-slash';
            text.textContent = 'Activar';
        } else {
            icon.className = 'fas fa-microphone';
            text.textContent = 'Silenciar';
        }
    }

    /**
     * Toggle hold
     */
    async toggleHold() {
        try {
            const isOnHold = await this.softphone.toggleHold();
            this.elements.btnHold.classList.toggle('active', isOnHold);

            const icon = this.elements.btnHold.querySelector('i');
            const text = this.elements.btnHold.querySelector('span');

            if (isOnHold) {
                icon.className = 'fas fa-play';
                text.textContent = 'Reanudar';
                this.elements.callStatus.textContent = 'En espera';
            } else {
                icon.className = 'fas fa-pause';
                text.textContent = 'Pausar';
                this.elements.callStatus.textContent = 'En llamada';
            }
        } catch (error) {
            console.error('[SoftphoneUI] Hold error:', error);
        }
    }

    /**
     * Toggle dialpad visibility
     */
    toggleDialpad() {
        this.dialpadVisible = !this.dialpadVisible;
        this.elements.dialpad.classList.toggle('active', this.dialpadVisible);

        const text = this.elements.btnToggleDialpad.querySelector('span');
        text.textContent = this.dialpadVisible ? 'Ocultar teclado' : 'Mostrar teclado';
    }

    /**
     * Handle dialpad button press
     */
    handleDialpadPress(digit) {
        // If in call, send DTMF
        if (this.state.hasActiveCall) {
            this.softphone.sendDTMF(digit);
        } else {
            // Add to input
            this.currentNumber += digit;
            this.elements.phoneInput.value = this.currentNumber;
        }
    }

    /**
     * Toggle minimize/maximize
     */
    toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        this.elements.container.classList.toggle('minimized', this.isMinimized);

        const icon = this.elements.btnMinimize.querySelector('i');
        icon.className = this.isMinimized ? 'fas fa-expand' : 'fas fa-minus';
    }

    /**
     * Update status indicator
     */
    updateStatus(status, text) {
        this.elements.statusIndicator.className = `softphone-status-indicator ${status}`;
        this.elements.statusText.textContent = text;
    }

    /**
     * Show call interface
     */
    showCallInterface() {
        this.state.hasActiveCall = true;
        this.elements.callInfo.classList.add('active');
        this.elements.callControls.classList.add('active');
        this.elements.inputGroup.style.display = 'none';
        this.elements.btnToggleDialpad.style.display = 'none';

        // Change call button to hangup
        this.elements.btnCall.classList.add('softphone-btn-hangup');
        this.elements.btnCall.innerHTML = '<i class="fas fa-phone-slash"></i><span>Colgar</span>';
    }

    /**
     * Hide call interface
     */
    hideCallInterface() {
        this.state.hasActiveCall = false;
        this.elements.callInfo.classList.remove('active');
        this.elements.callControls.classList.remove('active');
        this.elements.inputGroup.style.display = 'block';
        this.elements.btnToggleDialpad.style.display = 'flex';

        // Reset call button
        this.elements.btnCall.classList.remove('softphone-btn-hangup');
        this.elements.btnCall.innerHTML = '<i class="fas fa-phone"></i><span>Llamar</span>';

        // Reset controls
        this.elements.btnMute.classList.remove('active');
        this.elements.btnHold.classList.remove('active');

        // Stop timer
        this.stopCallTimer();

        // Clear input
        this.currentNumber = '';
        this.elements.phoneInput.value = '';
    }

    /**
     * Start call timer
     */
    startCallTimer() {
        this.callDuration = 0;
        this.updateCallDuration();

        this.callTimer = setInterval(() => {
            this.callDuration++;
            this.updateCallDuration();
        }, 1000);
    }

    /**
     * Stop call timer
     */
    stopCallTimer() {
        if (this.callTimer) {
            clearInterval(this.callTimer);
            this.callTimer = null;
        }
        this.callDuration = 0;
    }

    /**
     * Update call duration display
     */
    updateCallDuration() {
        const hours = Math.floor(this.callDuration / 3600);
        const minutes = Math.floor((this.callDuration % 3600) / 60);
        const seconds = this.callDuration % 60;

        const formatted = [hours, minutes, seconds]
            .map(v => v.toString().padStart(2, '0'))
            .join(':');

        this.elements.callDuration.textContent = formatted;
    }

    /**
     * Show notification
     */
    showNotification(title, message, type = 'info') {
        // Using SweetAlert2 if available
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: type,
                title: title,
                text: message,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
        } else {
            alert(`${title}: ${message}`);
        }
    }

    // ==================== SOFTPHONE EVENT HANDLERS ====================

    onRegistered() {
        console.log('[SoftphoneUI] Registered');
        this.state.isRegistered = true;
        this.updateStatus('', 'Conectado');
        this.showNotification('Conectado', 'Softphone registrado correctamente', 'success');
    }

    onUnregistered() {
        console.log('[SoftphoneUI] Unregistered');
        this.state.isRegistered = false;
        this.updateStatus('disconnected', 'Desconectado');
    }

    async onIncomingCall(data) {
        console.log('[SoftphoneUI] Incoming call:', data);
        this.state.isIncoming = true;
        this.elements.incomingNumber.textContent = data.displayName || data.from;
        this.elements.incomingCall.classList.add('active');

        // Sprint 3.2.5: Lookup customer information automatically
        await this.lookupAndDisplayCustomerInfo(data.from);

        // Play ringtone (implement if needed)
        this.showNotification('Llamada entrante', `De: ${data.displayName || data.from}`, 'info');
    }

    /**
     * Lookup customer information by phone number
     * Sprint 3.2.5: Automatic customer popup
     */
    async lookupAndDisplayCustomerInfo(phoneNumber) {
        try {
            console.log('[SoftphoneUI] Looking up customer info for:', phoneNumber);

            const response = await fetch(`/api/telephony/lookup/customer/${encodeURIComponent(phoneNumber)}`);
            const data = await response.json();

            if (data.success && data.found) {
                // Show customer popup
                this.showCustomerPopup(data.customer);

                // Update customer panel in Agent Workstation
                this.updateCustomerPanel(data.customer);
            } else {
                console.log('[SoftphoneUI] No customer found for this number');
                this.showCustomerPopup(null); // Show "New Customer" popup
            }

        } catch (error) {
            console.error('[SoftphoneUI] Error looking up customer:', error);
        }
    }

    /**
     * Show customer information popup
     * Sprint 3.2.5
     */
    showCustomerPopup(customer) {
        if (!customer) {
            // New customer
            Swal.fire({
                title: 'Nuevo Cliente',
                html: `
                    <div class="customer-popup-new">
                        <i class="fas fa-user-plus fa-3x text-info mb-3"></i>
                        <p>Este número no está registrado en el sistema.</p>
                        <p><strong>¿Deseas crear un nuevo lead?</strong></p>
                    </div>
                `,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Crear Lead',
                cancelButtonText: 'Continuar sin crear',
                allowOutsideClick: false
            }).then((result) => {
                if (result.isConfirmed) {
                    // TODO: Open create lead modal
                    console.log('TODO: Abrir modal para crear lead');
                }
            });
            return;
        }

        // Existing customer
        const callHistoryHtml = customer.callHistory && customer.callHistory.length > 0 ?
            customer.callHistory.map(call => `
                <div class="call-history-item">
                    <i class="fas fa-phone ${call.direction === 'inbound' ? 'text-success' : 'text-primary'}"></i>
                    ${call.direction === 'inbound' ? 'Entrante' : 'Saliente'} -
                    ${new Date(call.date).toLocaleDateString()} -
                    ${call.duration}s
                    ${call.disposition ? `(${call.disposition})` : ''}
                </div>
            `).join('')
            : '<p class="text-muted">Sin historial de llamadas</p>';

        Swal.fire({
            title: customer.nombre,
            html: `
                <div class="customer-popup">
                    <div class="customer-info">
                        <div class="info-row">
                            <strong><i class="fas fa-phone"></i> Teléfono:</strong>
                            <span>${customer.telefono}</span>
                        </div>
                        <div class="info-row">
                            <strong><i class="fas fa-envelope"></i> Email:</strong>
                            <span>${customer.correo}</span>
                        </div>
                        <div class="info-row">
                            <strong><i class="fas fa-briefcase"></i> Campaña:</strong>
                            <span>${customer.campana}</span>
                        </div>
                        <div class="info-row">
                            <strong><i class="fas fa-clipboard-check"></i> Última Disposición:</strong>
                            <span>${customer.ultimaDisposicion}</span>
                        </div>
                        <div class="info-row">
                            <strong><i class="fas fa-redo"></i> Intentos:</strong>
                            <span>${customer.intentosLlamada}</span>
                        </div>
                        <div class="info-row">
                            <strong><i class="fas fa-user"></i> Agente Asignado:</strong>
                            <span>${customer.agente}</span>
                        </div>
                    </div>

                    <hr />

                    <div class="call-history">
                        <h6><i class="fas fa-history"></i> Historial de Llamadas</h6>
                        ${callHistoryHtml}
                    </div>
                </div>
            `,
            icon: 'info',
            confirmButtonText: 'Entendido',
            allowOutsideClick: false,
            width: '600px',
            customClass: {
                popup: 'customer-info-popup'
            }
        });
    }

    /**
     * Update customer panel in Agent Workstation
     * Sprint 3.2.5
     */
    updateCustomerPanel(customer) {
        // Update #customer-panel in Agent Workstation
        const customerPanel = document.getElementById('customer-panel');
        if (customerPanel) {
            customerPanel.style.display = 'block';

            // Update fields
            const updateElement = (id, value) => {
                const el = document.getElementById(id);
                if (el) {el.textContent = value || 'N/A';}
            };

            updateElement('customer-name', customer.nombre);
            updateElement('customer-phone', customer.telefono);
            updateElement('customer-last-interaction', customer.ultimaActualizacion ?
                new Date(customer.ultimaActualizacion).toLocaleDateString() : 'N/A');

            // Update call history
            const historyContainer = document.getElementById('customer-contact-history');
            if (historyContainer && customer.callHistory) {
                historyContainer.innerHTML = customer.callHistory.length > 0 ?
                    customer.callHistory.map(call => `
                        <div class="history-item">
                            <span class="badge bg-${call.direction === 'inbound' ? 'success' : 'primary'}">
                                ${call.direction === 'inbound' ? 'Entrante' : 'Saliente'}
                            </span>
                            ${new Date(call.date).toLocaleDateString()} - ${call.duration}s
                        </div>
                    `).join('')
                    : '<p class="text-muted">Sin historial</p>';
            }
        }
    }

    onCallEstablished() {
        console.log('[SoftphoneUI] Call established');
        this.updateStatus('', 'En llamada');
        this.elements.callStatus.textContent = 'En llamada';
        this.showCallInterface();
        this.startCallTimer();
    }

    onCallEnded(stats) {
        console.log('[SoftphoneUI] Call ended:', stats);
        this.updateStatus('', 'Conectado');
        this.hideCallInterface();
        this.elements.incomingCall.classList.remove('active');

        const duration = Math.floor(stats.duration);
        this.showNotification('Llamada finalizada', `Duración: ${duration} segundos`, 'info');
    }

    onCallFailed(error) {
        console.error('[SoftphoneUI] Call failed:', error);
        this.updateStatus('error', 'Error');
        this.hideCallInterface();
        this.showNotification('Error de llamada', error.message, 'error');
    }

    onRegistrationFailed(error) {
        console.error('[SoftphoneUI] Registration failed:', error);
        this.updateStatus('error', 'Error de registro');
        this.showNotification('Error de registro', error.message, 'error');
    }
}

// Export
if (typeof window !== 'undefined') {
    window.SoftphoneUI = SoftphoneUI;
}

export default SoftphoneUI;

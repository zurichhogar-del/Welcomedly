/**
 * Softphone - Agent Status Integration
 * Sprint 3.1.5 - Integrates call events with agent status
 *
 * This module automatically changes agent status based on call events:
 * - Call starting → in_call
 * - Call ended → after_call_work
 * - ACW complete → available
 */

class SoftphoneAgentIntegration {
    constructor(softphone, agentId) {
        this.softphone = softphone;
        this.agentId = agentId;
        this.currentCallId = null;
        this.acwTimer = null;
        this.acwDuration = 30; // 30 seconds default ACW time

        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Setup softphone event listeners
     */
    setupEventListeners() {
        // When call is established, change to in_call
        this.softphone.on('callEstablished', () => {
            this.handleCallEstablished();
        });

        // When call ends, change to after_call_work
        this.softphone.on('callEnded', (stats) => {
            this.handleCallEnded(stats);
        });

        console.log('[SoftphoneAgentIntegration] Event listeners configured');
    }

    /**
     * Handle call established event
     */
    async handleCallEstablished() {
        try {
            console.log('[SoftphoneAgentIntegration] Call established, changing status to in_call');

            // Change agent status to in_call
            await this.changeAgentStatus('in_call', 'Call started via softphone');

            // Show notification
            this.showNotification('Llamada activa', 'Tu estado cambió a "En llamada"', 'info');

        } catch (error) {
            console.error('[SoftphoneAgentIntegration] Error handling call established:', error);
        }
    }

    /**
     * Handle call ended event
     * @param {Object} stats - Call statistics
     */
    async handleCallEnded(stats) {
        try {
            console.log('[SoftphoneAgentIntegration] Call ended, changing status to after_call_work');

            // Change agent status to after_call_work
            await this.changeAgentStatus('after_call_work', 'Completing call documentation');

            // Show notification with ACW timer
            this.showNotification(
                'Trabajo post-llamada',
                `Tiempo para completar disposición: ${this.acwDuration}s`,
                'info'
            );

            // Start ACW timer (auto-return to available after ACW time)
            this.startACWTimer();

        } catch (error) {
            console.error('[SoftphoneAgentIntegration] Error handling call ended:', error);
        }
    }

    /**
     * Start After Call Work timer
     */
    startACWTimer() {
        // Clear existing timer
        if (this.acwTimer) {
            clearTimeout(this.acwTimer);
        }

        // Set new timer to automatically return to available
        this.acwTimer = setTimeout(async () => {
            try {
                console.log('[SoftphoneAgentIntegration] ACW time expired, returning to available');

                // Check if still in ACW state
                const currentState = await this.getCurrentAgentStatus();

                if (currentState === 'after_call_work') {
                    await this.changeAgentStatus('available', 'ACW time completed');
                    this.showNotification(
                        'Disponible',
                        'Volviste a estar disponible automáticamente',
                        'success'
                    );
                }
            } catch (error) {
                console.error('[SoftphoneAgentIntegration] Error ending ACW:', error);
            }
        }, this.acwDuration * 1000);
    }

    /**
     * Cancel ACW timer (when agent manually changes status)
     */
    cancelACWTimer() {
        if (this.acwTimer) {
            clearTimeout(this.acwTimer);
            this.acwTimer = null;
            console.log('[SoftphoneAgentIntegration] ACW timer cancelled');
        }
    }

    /**
     * Change agent status via API
     * @param {string} newStatus - New status
     * @param {string} reason - Reason for change
     */
    async changeAgentStatus(newStatus, reason = '') {
        try {
            const response = await fetch('/api/agent/status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': window.csrfToken || ''
                },
                body: JSON.stringify({
                    status: newStatus,
                    reason: reason,
                    source: 'softphone'
                })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Error cambiando estado');
            }

            console.log('[SoftphoneAgentIntegration] Status changed:', newStatus);

            // Emit custom event for UI updates
            window.dispatchEvent(new CustomEvent('agent-status-changed', {
                detail: {
                    status: newStatus,
                    reason: reason,
                    source: 'softphone'
                }
            }));

            return data;

        } catch (error) {
            console.error('[SoftphoneAgentIntegration] Error changing status:', error);
            throw error;
        }
    }

    /**
     * Get current agent status
     * @returns {Promise<string>}
     */
    async getCurrentAgentStatus() {
        try {
            const response = await fetch(`/api/agent/status/${this.agentId}`);
            const data = await response.json();

            if (data.success && data.status) {
                return data.status.status;
            }

            return 'offline';

        } catch (error) {
            console.error('[SoftphoneAgentIntegration] Error getting current status:', error);
            return 'offline';
        }
    }

    /**
     * Set ACW duration
     * @param {number} seconds - ACW duration in seconds
     */
    setACWDuration(seconds) {
        this.acwDuration = seconds;
        console.log('[SoftphoneAgentIntegration] ACW duration set to', seconds, 'seconds');
    }

    /**
     * Show notification
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, info, warning)
     */
    showNotification(title, message, type = 'info') {
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
            console.log(`[Notification] ${title}: ${message}`);
        }
    }

    /**
     * Cleanup integration (call before destroying)
     */
    cleanup() {
        this.cancelACWTimer();
        console.log('[SoftphoneAgentIntegration] Cleaned up');
    }
}

// Export
if (typeof window !== 'undefined') {
    window.SoftphoneAgentIntegration = SoftphoneAgentIntegration;
}

export default SoftphoneAgentIntegration;

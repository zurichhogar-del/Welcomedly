/**
 * Welcomedly WebRTC Softphone Module
 * Sprint 3.1.4 - WebRTC Softphone Implementation
 *
 * This module handles SIP registration and call control using SIP.js
 */

import { UserAgent, Registerer, Inviter, SessionState } from 'sip.js';

class WelcomedlySoftphone {
    constructor() {
        this.userAgent = null;
        this.registerer = null;
        this.currentSession = null;
        this.isRegistered = false;
        this.isMuted = false;
        this.isOnHold = false;

        // Audio elements
        this.remoteAudio = null;
        this.localAudio = null;

        // Event callbacks
        this.callbacks = {
            onRegistered: null,
            onUnregistered: null,
            onIncomingCall: null,
            onCallEstablished: null,
            onCallEnded: null,
            onCallFailed: null,
            onRegistrationFailed: null
        };

        // Call statistics
        this.callStats = {
            startTime: null,
            duration: 0,
            direction: null
        };
    }

    /**
     * Initialize the softphone with SIP credentials
     * @param {Object} config - SIP configuration
     * @param {string} config.sipServer - WebSocket SIP server
     * @param {string} config.sipPort - WebSocket port
     * @param {string} config.username - SIP username
     * @param {string} config.password - SIP password
     * @param {string} config.extension - Agent extension
     * @param {string} config.displayName - Display name for calls
     */
    async initialize(config) {
        try {
            console.log('[Softphone] Initializing with config:', {
                server: config.sipServer,
                port: config.sipPort,
                username: config.username,
                extension: config.extension
            });

            // Build WebSocket URI
            const wsServer = `wss://${config.sipServer}:${config.sipPort}/ws`;
            const sipUri = `sip:${config.username}@${config.sipServer}`;

            // Create UserAgent configuration
            const userAgentOptions = {
                uri: UserAgent.makeURI(sipUri),
                transportOptions: {
                    server: wsServer,
                    connectionTimeout: 10
                },
                authorizationUsername: config.username,
                authorizationPassword: config.password,
                displayName: config.displayName || config.extension,
                sessionDescriptionHandlerFactoryOptions: {
                    constraints: {
                        audio: true,
                        video: false
                    },
                    peerConnectionConfiguration: {
                        iceServers: [
                            { urls: 'stun:stun.l.google.com:19302' },
                            { urls: 'stun:stun1.l.google.com:19302' }
                        ]
                    }
                },
                logLevel: 'warn',
                delegate: {
                    onInvite: (invitation) => this.handleIncomingCall(invitation)
                }
            };

            // Create UserAgent
            this.userAgent = new UserAgent(userAgentOptions);

            // Setup audio elements
            this.setupAudioElements();

            // Start UserAgent
            await this.userAgent.start();
            console.log('[Softphone] UserAgent started');

            // Create registerer
            this.registerer = new Registerer(this.userAgent);

            // Setup registerer event handlers
            this.registerer.stateChange.addListener((state) => {
                console.log('[Softphone] Registration state:', state);

                if (state === 'Registered') {
                    this.isRegistered = true;
                    if (this.callbacks.onRegistered) {
                        this.callbacks.onRegistered();
                    }
                } else if (state === 'Unregistered') {
                    this.isRegistered = false;
                    if (this.callbacks.onUnregistered) {
                        this.callbacks.onUnregistered();
                    }
                }
            });

            // Register
            await this.registerer.register();
            console.log('[Softphone] Registration sent');

            return true;

        } catch (error) {
            console.error('[Softphone] Initialization error:', error);
            if (this.callbacks.onRegistrationFailed) {
                this.callbacks.onRegistrationFailed(error);
            }
            throw error;
        }
    }

    /**
     * Setup audio elements for remote and local audio
     */
    setupAudioElements() {
        // Remote audio (incoming audio from call)
        this.remoteAudio = document.createElement('audio');
        this.remoteAudio.id = 'softphone-remote-audio';
        this.remoteAudio.autoplay = true;
        document.body.appendChild(this.remoteAudio);

        // Local audio (outgoing audio - for monitoring)
        this.localAudio = document.createElement('audio');
        this.localAudio.id = 'softphone-local-audio';
        this.localAudio.muted = true; // Muted to prevent feedback
        document.body.appendChild(this.localAudio);

        console.log('[Softphone] Audio elements created');
    }

    /**
     * Make an outbound call
     * @param {string} number - Phone number to call
     * @returns {Promise<boolean>}
     */
    async call(number) {
        try {
            if (!this.isRegistered) {
                throw new Error('Not registered. Cannot make call.');
            }

            if (this.currentSession) {
                throw new Error('Already in a call');
            }

            console.log('[Softphone] Initiating call to:', number);

            // Create target URI
            const targetUri = UserAgent.makeURI(`sip:${number}@${this.userAgent.configuration.uri.host}`);

            if (!targetUri) {
                throw new Error('Invalid phone number');
            }

            // Create inviter
            const inviter = new Inviter(this.userAgent, targetUri);
            this.currentSession = inviter;

            // Setup session state change listener
            inviter.stateChange.addListener((state) => {
                console.log('[Softphone] Call state:', state);
                this.handleSessionStateChange(state);
            });

            // Send INVITE
            await inviter.invite({
                sessionDescriptionHandlerOptions: {
                    constraints: {
                        audio: true,
                        video: false
                    }
                }
            });

            // Setup media once session is established
            this.setupSessionMedia(inviter);

            // Update call stats
            this.callStats.startTime = new Date();
            this.callStats.direction = 'outbound';

            console.log('[Softphone] Call initiated successfully');
            return true;

        } catch (error) {
            console.error('[Softphone] Call error:', error);
            if (this.callbacks.onCallFailed) {
                this.callbacks.onCallFailed(error);
            }
            throw error;
        }
    }

    /**
     * Handle incoming call invitation
     * @param {Invitation} invitation - SIP.js invitation
     */
    handleIncomingCall(invitation) {
        console.log('[Softphone] Incoming call from:', invitation.remoteIdentity.uri.user);

        if (this.currentSession) {
            console.log('[Softphone] Already in call, rejecting');
            invitation.reject();
            return;
        }

        this.currentSession = invitation;

        // Setup session state change listener
        invitation.stateChange.addListener((state) => {
            console.log('[Softphone] Call state:', state);
            this.handleSessionStateChange(state);
        });

        // Notify application
        if (this.callbacks.onIncomingCall) {
            this.callbacks.onIncomingCall({
                from: invitation.remoteIdentity.uri.user,
                displayName: invitation.remoteIdentity.displayName
            });
        }
    }

    /**
     * Answer incoming call
     * @returns {Promise<boolean>}
     */
    async answer() {
        try {
            if (!this.currentSession) {
                throw new Error('No incoming call to answer');
            }

            console.log('[Softphone] Answering call');

            await this.currentSession.accept({
                sessionDescriptionHandlerOptions: {
                    constraints: {
                        audio: true,
                        video: false
                    }
                }
            });

            // Setup media
            this.setupSessionMedia(this.currentSession);

            // Update call stats
            this.callStats.startTime = new Date();
            this.callStats.direction = 'inbound';

            console.log('[Softphone] Call answered');
            return true;

        } catch (error) {
            console.error('[Softphone] Answer error:', error);
            throw error;
        }
    }

    /**
     * Hangup current call
     * @returns {Promise<boolean>}
     */
    async hangup() {
        try {
            if (!this.currentSession) {
                console.log('[Softphone] No active session to hangup');
                return false;
            }

            console.log('[Softphone] Hanging up call');

            // End session based on state
            const state = this.currentSession.state;

            if (state === SessionState.Initial || state === SessionState.Establishing) {
                // Call hasn't been answered yet
                if (this.currentSession instanceof Inviter) {
                    await this.currentSession.cancel();
                } else {
                    await this.currentSession.reject();
                }
            } else if (state === SessionState.Established) {
                // Call is active
                await this.currentSession.bye();
            }

            // Calculate call duration
            if (this.callStats.startTime) {
                this.callStats.duration = Math.floor((new Date() - this.callStats.startTime) / 1000);
            }

            this.currentSession = null;
            this.isMuted = false;
            this.isOnHold = false;

            console.log('[Softphone] Call ended. Duration:', this.callStats.duration, 'seconds');

            if (this.callbacks.onCallEnded) {
                this.callbacks.onCallEnded(this.callStats);
            }

            return true;

        } catch (error) {
            console.error('[Softphone] Hangup error:', error);
            throw error;
        }
    }

    /**
     * Mute/unmute microphone
     * @returns {boolean} - New muted state
     */
    toggleMute() {
        if (!this.currentSession) {
            console.log('[Softphone] No active call to mute');
            return false;
        }

        try {
            const pc = this.currentSession.sessionDescriptionHandler.peerConnection;
            const senders = pc.getSenders();

            senders.forEach(sender => {
                if (sender.track && sender.track.kind === 'audio') {
                    sender.track.enabled = this.isMuted;
                }
            });

            this.isMuted = !this.isMuted;
            console.log('[Softphone] Mute toggled:', this.isMuted);

            return this.isMuted;

        } catch (error) {
            console.error('[Softphone] Mute error:', error);
            return this.isMuted;
        }
    }

    /**
     * Hold/unhold call
     * @returns {Promise<boolean>} - New hold state
     */
    async toggleHold() {
        if (!this.currentSession) {
            console.log('[Softphone] No active call to hold');
            return false;
        }

        try {
            if (this.isOnHold) {
                // Unhold
                await this.currentSession.sessionDescriptionHandler.unhold();
                this.isOnHold = false;
                console.log('[Softphone] Call resumed');
            } else {
                // Hold
                await this.currentSession.sessionDescriptionHandler.hold();
                this.isOnHold = true;
                console.log('[Softphone] Call on hold');
            }

            return this.isOnHold;

        } catch (error) {
            console.error('[Softphone] Hold error:', error);
            return this.isOnHold;
        }
    }

    /**
     * Send DTMF tones
     * @param {string} tone - DTMF tone (0-9, *, #, A-D)
     */
    sendDTMF(tone) {
        if (!this.currentSession || this.currentSession.state !== SessionState.Established) {
            console.log('[Softphone] No established call to send DTMF');
            return;
        }

        try {
            this.currentSession.sessionDescriptionHandler.sendDtmf(tone);
            console.log('[Softphone] DTMF sent:', tone);
        } catch (error) {
            console.error('[Softphone] DTMF error:', error);
        }
    }

    /**
     * Handle session state changes
     * @param {SessionState} state - New session state
     */
    handleSessionStateChange(state) {
        switch (state) {
            case SessionState.Establishing:
                console.log('[Softphone] Call establishing...');
                break;

            case SessionState.Established:
                console.log('[Softphone] Call established');
                if (this.callbacks.onCallEstablished) {
                    this.callbacks.onCallEstablished();
                }
                break;

            case SessionState.Terminated:
                console.log('[Softphone] Call terminated');

                // Calculate duration
                if (this.callStats.startTime) {
                    this.callStats.duration = Math.floor((new Date() - this.callStats.startTime) / 1000);
                }

                if (this.callbacks.onCallEnded) {
                    this.callbacks.onCallEnded(this.callStats);
                }

                // Cleanup
                this.currentSession = null;
                this.isMuted = false;
                this.isOnHold = false;
                break;
        }
    }

    /**
     * Setup media streams for session
     * @param {Session} session - SIP session
     */
    setupSessionMedia(session) {
        const pc = session.sessionDescriptionHandler.peerConnection;

        // Attach remote stream to audio element
        pc.ontrack = (event) => {
            console.log('[Softphone] Remote track added');
            this.remoteAudio.srcObject = event.streams[0];
        };

        console.log('[Softphone] Session media setup complete');
    }

    /**
     * Unregister and disconnect
     */
    async disconnect() {
        try {
            console.log('[Softphone] Disconnecting...');

            // Hangup any active call
            if (this.currentSession) {
                await this.hangup();
            }

            // Unregister
            if (this.registerer) {
                await this.registerer.unregister();
            }

            // Stop UserAgent
            if (this.userAgent) {
                await this.userAgent.stop();
            }

            // Remove audio elements
            if (this.remoteAudio) {
                this.remoteAudio.remove();
            }
            if (this.localAudio) {
                this.localAudio.remove();
            }

            console.log('[Softphone] Disconnected');
            return true;

        } catch (error) {
            console.error('[Softphone] Disconnect error:', error);
            throw error;
        }
    }

    /**
     * Set event callback
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (this.callbacks.hasOwnProperty(`on${event.charAt(0).toUpperCase()}${event.slice(1)}`)) {
            this.callbacks[`on${event.charAt(0).toUpperCase()}${event.slice(1)}`] = callback;
        }
    }

    /**
     * Get current call state
     * @returns {Object}
     */
    getState() {
        return {
            isRegistered: this.isRegistered,
            hasActiveCall: !!this.currentSession,
            isMuted: this.isMuted,
            isOnHold: this.isOnHold,
            callStats: this.callStats
        };
    }
}

// Export as global for use in EJS templates
if (typeof window !== 'undefined') {
    window.WelcomedlySoftphone = WelcomedlySoftphone;
}

export default WelcomedlySoftphone;

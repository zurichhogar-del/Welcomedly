/**
 * Telephony Service - Sprint 3.1.3
 * Manages Asterisk AMI integration and call operations
 */

import AsteriskManager from 'asterisk-manager';
import db from '../models/index.js';
import { EventEmitter } from 'events';

const { Call, SipPeer, Trunk, User, Campana, BaseCampana } = db;

class TelephonyService extends EventEmitter {
    constructor() {
        super();
        this.ami = null;
        this.connected = false;
        this.activeCalls = new Map(); // callId => callData
        this.config = {
            host: process.env.ASTERISK_HOST || 'localhost',
            port: parseInt(process.env.ASTERISK_PORT) || 5038,
            username: process.env.ASTERISK_USER || 'admin',
            password: process.env.ASTERISK_PASSWORD || 'secret',
            reconnect: true,
            reconnect_after: 3000
        };
    }

    /**
     * Initialize AMI connection
     */
    async initialize() {
        try {
            console.log('📞 Inicializando servicio de telefonía...');
            console.log(`📡 Conectando a Asterisk AMI: ${this.config.host}:${this.config.port}`);

            this.ami = new AsteriskManager(
                this.config.port,
                this.config.host,
                this.config.username,
                this.config.password,
                true // keepalive
            );

            this.setupEventListeners();

            // Connect to AMI
            this.ami.connect();

            console.log('✅ Servicio de telefonía inicializado');
        } catch (error) {
            console.error('❌ Error inicializando servicio de telefonía:', error);
            throw error;
        }
    }

    /**
     * Setup AMI event listeners
     */
    setupEventListeners() {
        // Connection events
        this.ami.on('connect', () => {
            console.log('✅ Conectado a Asterisk AMI');
            this.connected = true;
            this.emit('ami:connected');
        });

        this.ami.on('close', () => {
            console.log('⚠️  Conexión AMI cerrada');
            this.connected = false;
            this.emit('ami:disconnected');
        });

        this.ami.on('error', (error) => {
            console.error('❌ Error AMI:', error);
            this.emit('ami:error', error);
        });

        // Call events
        this.ami.on('newchannel', (event) => this.handleNewChannel(event));
        this.ami.on('newstate', (event) => this.handleNewState(event));
        this.ami.on('dial', (event) => this.handleDial(event));
        this.ami.on('bridge', (event) => this.handleBridge(event));
        this.ami.on('hangup', (event) => this.handleHangup(event));

        // SIP Peer events
        this.ami.on('peerentry', (event) => this.handlePeerEntry(event));
        this.ami.on('peerstatus', (event) => this.handlePeerStatus(event));

        // Trunk registration events
        this.ami.on('registry', (event) => this.handleRegistry(event));
    }

    /**
     * Handle new channel created
     */
    async handleNewChannel(event) {
        console.log('📞 New Channel:', event.channel, event.uniqueid);

        const callData = {
            callId: event.uniqueid,
            channel: event.channel,
            state: event.channelstate,
            startTime: new Date(),
            direction: this.determineDirection(event.channel)
        };

        this.activeCalls.set(event.uniqueid, callData);
        this.emit('call:new', callData);
    }

    /**
     * Handle channel state change
     */
    async handleNewState(event) {
        const callData = this.activeCalls.get(event.uniqueid);
        if (callData) {
            callData.state = event.channelstate;
            callData.stateDesc = event.channelstatedesc;

            // If answered (state 6)
            if (event.channelstate === '6' && !callData.answerTime) {
                callData.answerTime = new Date();
                this.emit('call:answered', callData);
            }

            this.emit('call:state', callData);
        }
    }

    /**
     * Handle dial event
     */
    async handleDial(event) {
        console.log('📱 Dial:', event.subevent, event.uniqueid);

        const callData = this.activeCalls.get(event.uniqueid);
        if (callData) {
            callData.dialStatus = event.dialstatus;
            callData.destChannel = event.destination;

            this.emit('call:dial', callData);
        }
    }

    /**
     * Handle bridge (call answered and connected)
     */
    async handleBridge(event) {
        console.log('🔗 Bridge:', event.uniqueid1, event.uniqueid2);

        const callData1 = this.activeCalls.get(event.uniqueid1);
        const callData2 = this.activeCalls.get(event.uniqueid2);

        if (callData1) {
            callData1.bridged = true;
            callData1.bridgeId = event.bridgeuniqueid;
            this.emit('call:bridge', callData1);
        }

        if (callData2) {
            callData2.bridged = true;
            callData2.bridgeId = event.bridgeuniqueid;
            this.emit('call:bridge', callData2);
        }
    }

    /**
     * Handle hangup
     */
    async handleHangup(event) {
        console.log('📴 Hangup:', event.uniqueid, event.cause, event.causeTxt);

        const callData = this.activeCalls.get(event.uniqueid);
        if (callData) {
            callData.endTime = new Date();
            callData.hangupCause = event.cause;
            callData.hangupCauseText = event.causeTxt;

            // Calculate durations
            if (callData.startTime) {
                callData.duration = Math.floor((callData.endTime - callData.startTime) / 1000);
            }
            if (callData.answerTime) {
                callData.billsec = Math.floor((callData.endTime - callData.answerTime) / 1000);
            }

            // Determine disposition
            callData.disposition = this.determineDisposition(event.cause);

            // Save to database
            await this.saveCallRecord(callData);

            this.emit('call:hangup', callData);
            this.activeCalls.delete(event.uniqueid);
        }
    }

    /**
     * Handle SIP peer entry (from SIPPeers command)
     */
    async handlePeerEntry(event) {
        // Update SIP peer registration status
        if (event.objectname) {
            const sipPeer = await SipPeer.findByUsername(event.objectname);
            if (sipPeer) {
                const registered = event.status === 'OK';
                await sipPeer.updateRegistration(registered, event.ipaddress, event.useragent);
            }
        }
    }

    /**
     * Handle SIP peer status change
     */
    async handlePeerStatus(event) {
        console.log('👤 Peer Status:', event.peer, event.peerstatus);

        if (event.peer) {
            const peerName = event.peer.split('/')[1];
            const sipPeer = await SipPeer.findByUsername(peerName);
            if (sipPeer) {
                const registered = event.peerstatus === 'Registered';
                await sipPeer.updateRegistration(registered, event.address);
                this.emit('sip:peerstatus', { sipPeer, status: event.peerstatus });
            }
        }
    }

    /**
     * Handle trunk registration event
     */
    async handleRegistry(event) {
        console.log('📡 Registry:', event.username, event.status);

        // Find trunk by username
        const trunk = await Trunk.findOne({ where: { username: event.username } });
        if (trunk) {
            if (event.status === 'Registered') {
                await trunk.updateRegistration(true);
            } else {
                await trunk.recordError(`Registration failed: ${event.cause || 'Unknown'}`);
            }
            this.emit('trunk:registry', { trunk, status: event.status });
        }
    }

    /**
     * Originate outbound call
     */
    async originateCall(options) {
        const {
            agentExtension,
            customerPhone,
            campaignId,
            leadId,
            agentId
        } = options;

        try {
            console.log(`📞 Originando llamada: ${agentExtension} → ${customerPhone}`);

            // Get best available trunk
            const trunk = await Trunk.getBestAvailable();
            if (!trunk) {
                throw new Error('No hay troncales disponibles');
            }

            // Generate unique call ID
            const callId = `WLCM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            // Originate call via AMI
            const response = await new Promise((resolve, reject) => {
                this.ami.action({
                    action: 'Originate',
                    channel: `PJSIP/${agentExtension}`,
                    exten: customerPhone,
                    context: 'welcomedly-outbound',
                    priority: 1,
                    callerid: `Agent ${agentExtension}`,
                    timeout: 30000,
                    async: true,
                    variable: {
                        CAMPAIGN_ID: campaignId,
                        LEAD_ID: leadId,
                        AGENT_ID: agentId,
                        TRUNK_ID: trunk.id,
                        CALL_ID: callId
                    }
                }, (err, res) => {
                    if (err) reject(err);
                    else resolve(res);
                });
            });

            // Create call record
            const call = await Call.create({
                callId,
                agentId,
                campaignId,
                leadId,
                trunkId: trunk.id,
                direction: 'outbound',
                callerNumber: agentExtension,
                calleeNumber: customerPhone,
                startTime: new Date(),
                disposition: null
            });

            console.log('✅ Llamada originada exitosamente:', callId);

            return {
                success: true,
                callId,
                trunk: trunk.name,
                call
            };

        } catch (error) {
            console.error('❌ Error originando llamada:', error);
            throw error;
        }
    }

    /**
     * Hangup active call
     */
    async hangupCall(channel) {
        try {
            console.log(`📴 Colgando llamada: ${channel}`);

            await new Promise((resolve, reject) => {
                this.ami.action({
                    action: 'Hangup',
                    channel
                }, (err, res) => {
                    if (err) reject(err);
                    else resolve(res);
                });
            });

            return { success: true };
        } catch (error) {
            console.error('❌ Error colgando llamada:', error);
            throw error;
        }
    }

    /**
     * Get SIP peer status
     */
    async getSIPPeerStatus(peer) {
        try {
            const response = await new Promise((resolve, reject) => {
                this.ami.action({
                    action: 'SIPshowpeer',
                    peer
                }, (err, res) => {
                    if (err) reject(err);
                    else resolve(res);
                });
            });

            return response;
        } catch (error) {
            console.error('❌ Error obteniendo estado SIP peer:', error);
            throw error;
        }
    }

    /**
     * Get active channels
     */
    async getActiveChannels() {
        try {
            const response = await new Promise((resolve, reject) => {
                this.ami.action({
                    action: 'CoreShowChannels'
                }, (err, res) => {
                    if (err) reject(err);
                    else resolve(res);
                });
            });

            return response;
        } catch (error) {
            console.error('❌ Error obteniendo canales activos:', error);
            throw error;
        }
    }

    /**
     * Save call record to database
     */
    async saveCallRecord(callData) {
        try {
            // Find or create call record
            let call = await Call.findOne({ where: { callId: callData.callId } });

            if (call) {
                // Update existing record
                await call.update({
                    answerTime: callData.answerTime,
                    endTime: callData.endTime,
                    duration: callData.duration || 0,
                    billsec: callData.billsec || 0,
                    disposition: callData.disposition
                });

                // Update trunk statistics
                if (call.trunkId) {
                    const trunk = await Trunk.findByPk(call.trunkId);
                    if (trunk) {
                        const success = callData.disposition === 'ANSWERED';
                        await trunk.recordCall(success);
                    }
                }
            }

            console.log('✅ Registro de llamada guardado:', callData.callId);
            return call;
        } catch (error) {
            console.error('❌ Error guardando registro de llamada:', error);
            throw error;
        }
    }

    /**
     * Determine call direction from channel
     */
    determineDirection(channel) {
        // If channel starts with PJSIP and contains agent extension, it's outbound
        // This is a simplified logic - adjust based on your dialplan
        if (channel && channel.includes('PJSIP')) {
            return 'outbound';
        }
        return 'inbound';
    }

    /**
     * Determine call disposition from hangup cause
     */
    determineDisposition(cause) {
        const causeCode = parseInt(cause);

        switch (causeCode) {
            case 16: // Normal clearing
                return 'ANSWERED';
            case 17: // User busy
                return 'BUSY';
            case 19: // No answer
            case 21: // Call rejected
                return 'NO ANSWER';
            case 34: // Circuit congestion
            case 38: // Network out of order
            case 41: // Temporary failure
            case 42: // Switching equipment congestion
                return 'FAILED';
            default:
                return 'CANCELLED';
        }
    }

    /**
     * Transfer call to another extension
     * Sprint 3.2.5: Call transfer functionality
     *
     * @param {string} channel - Current channel
     * @param {string} targetExtension - Target extension to transfer to
     * @param {string} transferType - 'cold' (blind) or 'warm' (attended)
     */
    async transferCall(channel, targetExtension, transferType = 'cold') {
        try {
            if (!this.ami || !this.connected) {
                throw new Error('Servicio de telefonía no está conectado');
            }

            console.log(`[TelephonyService] Transfiriendo llamada ${channel} a extensión ${targetExtension} (${transferType})`);

            if (transferType === 'cold' || transferType === 'blind') {
                // Blind transfer (cold transfer)
                const response = await new Promise((resolve, reject) => {
                    this.ami.action({
                        action: 'Redirect',
                        channel: channel,
                        exten: targetExtension,
                        context: 'welcomedly-internal',
                        priority: 1
                    }, (err, res) => {
                        if (err) {
                            return reject(err);
                        }
                        resolve(res);
                    });
                });

                return {
                    type: 'blind_transfer',
                    success: true,
                    targetExtension,
                    response
                };

            } else if (transferType === 'warm' || transferType === 'attended') {
                // Attended transfer (warm transfer)
                // First, create a bridge to the target
                const response = await new Promise((resolve, reject) => {
                    this.ami.action({
                        action: 'Atxfer',
                        channel: channel,
                        exten: targetExtension,
                        context: 'welcomedly-internal',
                        priority: 1
                    }, (err, res) => {
                        if (err) {
                            return reject(err);
                        }
                        resolve(res);
                    });
                });

                return {
                    type: 'attended_transfer',
                    success: true,
                    targetExtension,
                    response
                };
            }

            throw new Error(`Tipo de transferencia no válido: ${transferType}`);

        } catch (error) {
            console.error('[TelephonyService] Error en transferencia:', error);
            throw error;
        }
    }

    /**
     * Get statistics
     */
    getStatistics() {
        return {
            connected: this.connected,
            activeCalls: this.activeCalls.size,
            callsInProgress: Array.from(this.activeCalls.values()).filter(c => !c.endTime).length
        };
    }

    /**
     * Shutdown service
     */
    async shutdown() {
        console.log('🛑 Cerrando servicio de telefonía...');
        if (this.ami) {
            this.ami.disconnect();
        }
        this.connected = false;
        this.activeCalls.clear();
    }
}

// Create singleton instance
const telephonyService = new TelephonyService();

export default telephonyService;

/**
 * Telephony Controller - Sprint 3.1.3
 * API endpoints for call control and telephony operations
 */

import telephonyService from '../services/telephonyService.js';
import db from '../models/index.js';

const { Call, SipPeer, Trunk } = db;

class TelephonyController {
    /**
     * POST /api/telephony/call/originate
     * Originate outbound call
     */
    async originateCall(req, res) {
        try {
            const { agentExtension, customerPhone, campaignId, leadId } = req.body;
            const agentId = req.session.usuario.id;

            // Validation
            if (!agentExtension || !customerPhone) {
                return res.status(400).json({
                    success: false,
                    message: 'Agent extension and customer phone are required'
                });
            }

            // Originate call
            const result = await telephonyService.originateCall({
                agentExtension,
                customerPhone,
                campaignId,
                leadId,
                agentId
            });

            res.json({
                success: true,
                message: 'Call originated successfully',
                data: result
            });

        } catch (error) {
            console.error('Error originating call:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error originating call'
            });
        }
    }

    /**
     * POST /api/telephony/call/hangup
     * Hangup active call
     */
    async hangupCall(req, res) {
        try {
            const { channel } = req.body;

            if (!channel) {
                return res.status(400).json({
                    success: false,
                    message: 'Channel is required'
                });
            }

            await telephonyService.hangupCall(channel);

            res.json({
                success: true,
                message: 'Call hung up successfully'
            });

        } catch (error) {
            console.error('Error hanging up call:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error hanging up call'
            });
        }
    }

    /**
     * GET /api/telephony/calls/active
     * Get active calls
     */
    async getActiveCalls(req, res) {
        try {
            const activeCalls = Array.from(telephonyService.activeCalls.values());

            res.json({
                success: true,
                count: activeCalls.length,
                calls: activeCalls
            });

        } catch (error) {
            console.error('Error getting active calls:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error getting active calls'
            });
        }
    }

    /**
     * GET /api/telephony/calls/history
     * Get call history for agent
     */
    async getCallHistory(req, res) {
        try {
            const agentId = req.session.usuario.id;
            const { limit = 50, offset = 0 } = req.query;

            const result = await Call.getByAgent(agentId, {
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

            res.json({
                success: true,
                count: result.count,
                calls: result.rows
            });

        } catch (error) {
            console.error('Error getting call history:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error getting call history'
            });
        }
    }

    /**
     * GET /api/telephony/calls/stats
     * Get call statistics for agent
     */
    async getCallStats(req, res) {
        try {
            const agentId = req.session.usuario.id;
            const { startDate, endDate } = req.query;

            const stats = await Call.getAgentStats(
                agentId,
                startDate ? new Date(startDate) : null,
                endDate ? new Date(endDate) : null
            );

            res.json({
                success: true,
                stats
            });

        } catch (error) {
            console.error('Error getting call stats:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error getting call stats'
            });
        }
    }

    /**
     * GET /api/telephony/sip/status
     * Get SIP peer status for current user
     */
    async getSIPStatus(req, res) {
        try {
            const userId = req.session.usuario.id;

            const sipPeer = await SipPeer.findByUserId(userId);

            if (!sipPeer) {
                return res.status(404).json({
                    success: false,
                    message: 'SIP peer not found for this user'
                });
            }

            res.json({
                success: true,
                sipPeer: {
                    username: sipPeer.sipUsername,
                    extension: sipPeer.extension,
                    status: sipPeer.status,
                    registered: sipPeer.registered,
                    lastRegisteredAt: sipPeer.lastRegisteredAt,
                    userAgent: sipPeer.userAgent,
                    ipAddress: sipPeer.ipAddress
                }
            });

        } catch (error) {
            console.error('Error getting SIP status:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error getting SIP status'
            });
        }
    }

    /**
     * GET /api/telephony/sip/credentials
     * Get SIP credentials for WebRTC softphone
     */
    async getSIPCredentials(req, res) {
        try {
            const userId = req.session.usuario.id;

            const sipPeer = await SipPeer.findByUserId(userId);

            if (!sipPeer) {
                return res.status(404).json({
                    success: false,
                    message: 'SIP peer not found for this user. Contact administrator.'
                });
            }

            res.json({
                success: true,
                credentials: {
                    sipServer: process.env.ASTERISK_WSS_HOST || 'localhost',
                    sipPort: process.env.ASTERISK_WSS_PORT || '8089',
                    username: sipPeer.sipUsername,
                    password: sipPeer.sipPassword, // In production, use temporary tokens
                    extension: sipPeer.extension,
                    displayName: req.session.usuario.nombre
                }
            });

        } catch (error) {
            console.error('Error getting SIP credentials:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error getting SIP credentials'
            });
        }
    }

    /**
     * GET /api/telephony/trunks
     * Get available trunks (admin only)
     */
    async getTrunks(req, res) {
        try {
            // Check if user is admin
            if (req.session.usuario.rol !== 'ADMIN') {
                return res.status(403).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }

            const trunks = await Trunk.findAll({
                attributes: ['id', 'name', 'provider', 'status', 'registered',
                            'maxChannels', 'priority', 'totalCalls',
                            'successfulCalls', 'failedCalls'],
                order: [['priority', 'ASC']]
            });

            res.json({
                success: true,
                count: trunks.length,
                trunks
            });

        } catch (error) {
            console.error('Error getting trunks:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error getting trunks'
            });
        }
    }

    /**
     * GET /api/telephony/status
     * Get telephony service status
     */
    async getServiceStatus(req, res) {
        try {
            const stats = telephonyService.getStatistics();

            res.json({
                success: true,
                status: {
                    connected: stats.connected,
                    activeCalls: stats.activeCalls,
                    callsInProgress: stats.callsInProgress
                }
            });

        } catch (error) {
            console.error('Error getting service status:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error getting service status'
            });
        }
    }

    /**
     * POST /api/telephony/sip/create
     * Create SIP peer for user (admin only)
     */
    async createSIPPeer(req, res) {
        try {
            // Check if user is admin
            if (req.session.usuario.rol !== 'ADMIN') {
                return res.status(403).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }

            const { userId, primerNombre, primerApellido } = req.body;

            // Check if SIP peer already exists
            const existing = await SipPeer.findByUserId(userId);
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'SIP peer already exists for this user'
                });
            }

            // Create SIP peer
            const sipPeer = await SipPeer.createForUser(userId, primerNombre, primerApellido);

            res.json({
                success: true,
                message: 'SIP peer created successfully',
                sipPeer: {
                    sipUsername: sipPeer.sipUsername,
                    extension: sipPeer.extension,
                    status: sipPeer.status
                }
            });

        } catch (error) {
            console.error('Error creating SIP peer:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error creating SIP peer'
            });
        }
    }

    /**
     * GET /api/telephony/lookup/customer/:phone
     * Lookup customer information by phone number
     * Sprint 3.2.5: Customer popup on incoming call
     */
    async lookupCustomer(req, res) {
        try {
            const { phone } = req.params;

            if (!phone) {
                return res.status(400).json({
                    success: false,
                    message: 'Phone number is required'
                });
            }

            // Normalize phone number (remove spaces, dashes, etc.)
            const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');

            // Search in BaseCampana for this phone number
            const { BaseCampana, Campana, Disposicion, User } = db;

            const leads = await BaseCampana.findAll({
                where: {
                    telefono: {
                        [db.Sequelize.Op.like]: `%${normalizedPhone}%`
                    }
                },
                include: [
                    {
                        model: Campana,
                        as: 'campana',
                        attributes: ['id', 'nombre', 'estado']
                    },
                    {
                        model: Disposicion,
                        as: 'disposicion',
                        attributes: ['id', 'nombre', 'tipo']
                    },
                    {
                        model: User,
                        as: 'agente',
                        attributes: ['id', 'primerNombre', 'primerApellido']
                    }
                ],
                order: [['fechaActualizacion', 'DESC']],
                limit: 10
            });

            if (leads.length === 0) {
                return res.json({
                    success: true,
                    found: false,
                    message: 'No customer found with this phone number'
                });
            }

            // Get the most recent lead
            const mostRecentLead = leads[0];

            // Get call history for this phone number
            const { Call } = db;
            const callHistory = await Call.findAll({
                where: {
                    [db.Sequelize.Op.or]: [
                        { callerNumber: { [db.Sequelize.Op.like]: `%${normalizedPhone}%` } },
                        { calleeNumber: { [db.Sequelize.Op.like]: `%${normalizedPhone}%` } }
                    ]
                },
                order: [['startTime', 'DESC']],
                limit: 5,
                attributes: ['id', 'direction', 'disposition', 'startTime', 'endTime', 'duration']
            });

            // Prepare customer data
            const customerData = {
                id: mostRecentLead.id,
                nombre: mostRecentLead.nombre || 'N/A',
                telefono: mostRecentLead.telefono,
                correo: mostRecentLead.correo || 'N/A',
                campana: mostRecentLead.campana ? mostRecentLead.campana.nombre : 'N/A',
                campanaId: mostRecentLead.campanaId,
                ultimaDisposicion: mostRecentLead.disposicion ? mostRecentLead.disposicion.nombre : 'Sin disposición',
                intentosLlamada: mostRecentLead.intentosLlamada || 0,
                ultimaActualizacion: mostRecentLead.fechaActualizacion,
                agente: mostRecentLead.agente ?
                    `${mostRecentLead.agente.primerNombre} ${mostRecentLead.agente.primerApellido}` :
                    'Sin asignar',
                otrosCampos: mostRecentLead.otrosCampos || {},
                callHistory: callHistory.map(call => ({
                    id: call.id,
                    direction: call.direction,
                    disposition: call.disposition,
                    date: call.startTime,
                    duration: call.duration
                })),
                allLeads: leads.length // Total leads with this phone
            };

            res.json({
                success: true,
                found: true,
                customer: customerData
            });

        } catch (error) {
            console.error('Error looking up customer:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error looking up customer'
            });
        }
    }

    /**
     * POST /api/telephony/call/transfer
     * Transfer active call to another agent
     * Sprint 3.2.5: Call transfer functionality
     */
    async transferCall(req, res) {
        try {
            const { channel, targetExtension, transferType = 'cold' } = req.body;

            if (!channel || !targetExtension) {
                return res.status(400).json({
                    success: false,
                    message: 'Channel and target extension are required'
                });
            }

            // Initiate transfer via telephony service
            const result = await telephonyService.transferCall(channel, targetExtension, transferType);

            res.json({
                success: true,
                message: `Call transferred successfully (${transferType} transfer)`,
                data: result
            });

        } catch (error) {
            console.error('Error transferring call:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error transferring call'
            });
        }
    }
}

export default new TelephonyController();

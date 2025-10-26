/**
 * Gamification Service - FASE 2: Sistema de Motivación y Engagement
 * Puntos, logros, leaderboard, recompensas y challenges
 */
import db from '../models/index.js';
import EventEmitter from 'events';

class GamificationService extends EventEmitter {
    constructor() {
        // Configuración del sistema de gamificación
        this.config = {
            // Sistema de puntos
            points: {
                answerCall: 10,           // 10 puntos por llamada contestada
                successfulSale: 50,         // 50 puntos por venta exitosa
                qualityScore: 2,              // 2 puntos por punto de calidad
                firstCallResolution: 15,     // 15 puntos por FCR
                customerSatisfaction: 3,       // 3 puntos por punto de satisfacción
                complianceBonus: 25,          // 25 puntos por compliance perfecto
                dailyLogin: 5,               // 5 puntos por login diario
                consecutiveDays: 2,            // 2 puntos extras por día consecutivo
                streakBonus: 10                // 10 puntos bonus por rachas
            },

            // Niveles y experiencia
            levels: {
                bronze: { name: 'Bronce', minPoints: 0, icon: '🥉', color: '#CD7F32' },
                silver: { name: 'Plata', minPoints: 500, icon: '🥈', color: '#C0C0C0' },
                gold: { name: 'Oro', minPoints: 1000, icon: '🏆', color: '#FFD700' },
                platinum: { name: 'Platino', minPoints: 2500, icon: '💎', color: '#E5E4E1' },
                diamond: { name: 'Diamante', minPoints: 5000, icon: '💎', color: '#B9F2FF' }
            },

            // Logros (achievements)
            achievements: [
                { id: 'first_call', name: 'Primera Llamada', description: 'Realizar tu primera llamada', icon: '📞', points: 25, type: 'milestone' },
                { id: 'first_sale', name: 'Primera Venta', description: 'Cerrar tu primera venta', icon: '💰', points: 100, type: 'milestone' },
                { id: 'quality_master', name: 'Maestro de Calidad', description: 'Obtener 95%+ de calidad por semana', icon: '⭐', points: 50, type: 'performance' },
                { id: 'speed_demon', name: 'Demonio de Velocidad', description: 'Manejar 100+ llamadas en un día', icon: '⚡', points: 30, type: 'performance' },
                { id: 'customer_hero', name: 'Héroe del Cliente', description: 'Recibir 10+ satisfacciones de 5 estrellas en una semana', icon: '🦸', points: 40, type: 'customer' },
                { id: 'streak_warrior', name: 'Guerreo de Rachas', description: 'Mantener 7 días consecutivos login', icon: '🔥', points: 25, type: 'consistency' },
                { id: 'team_player', name: 'Jugador de Equipo', description: 'Participar en 5 challenges de equipo', icon: '🤝', points: 20, type: 'team' },
                { id: 'learning_champion', name: 'Campeón de Aprendizaje', description: 'Completar 10 módulos de entrenamiento', icon: '🎓', points: 35, type: 'learning' },
                { id: 'social_butterfly', name: 'Mariposa Social', description: 'Dar/reibir 50+ interacciones positivas', icon: '🦋', points: 15, type: 'social' }
            ],

            // Challenges
            challenges: {
                daily: [
                    { id: 'daily_caller', name: 'Maestro de Llamadas Diarias', description: 'Realizar 50+ llamadas en un día', target: 50, duration: 'daily', icon: '📞' },
                    { id: 'daily_quality', name: 'Calidad Excepcional Diaria', description: 'Mantener 90%+ de calidad en 20 llamadas', target: 20, duration: 'daily', icon: '⭐' },
                    { id: 'daily_sales', name: 'Ventas del Día', description: 'Cerrar 5+ ventas en un día', target: 5, duration: 'daily', icon: '💰' },
                    { id: 'daily_satisfaction', name: 'Clientes Satisfechos', description: 'Obtener 4.5+ de satisfacción promedio', target: 10, duration: 'daily', icon: '😊' }
                ],
                weekly: [
                    { id: 'week_champion', name: 'Campeón Semanal', description: 'Mayor puntuación en la semana', target: 'highest', duration: 'weekly', icon: '🏆' },
                    { id: 'quality_week', name: 'Semana de Calidad Perfecta', description: 'Promedio de 90%+ calidad', target: 90, duration: 'weekly', icon: '⭐' },
                    { id: 'team_collaboration', name: 'Colaboración en Equipo', description: 'Completar 3 challenges en equipo', target: 3, duration: 'weekly', icon: '🤝' }
                ],
                monthly: [
                    { id: 'monthly_top_performer', name: 'Rendimiento Superior del Mes', description: 'Top 5% en rendimiento del mes', target: 'top_5_percent', duration: 'monthly', icon: '🏆' },
                    { id: 'learning_marathon', name: 'Maratón de Aprendizaje', description: 'Completar 20 módulos de entrenamiento', target: 20, duration: 'monthly', icon: '🎓' },
                    { id: 'customer_month', name: 'Mes del Cliente', description: 'Mantener 4.0+ satisfacción promedio', target: 4.0, duration: 'monthly', icon: '😊' }
                ]
            },

            // Sistema de recompensas
            rewards: {
                points: {
                    100: { type: 'coffee', description: 'Café gratis en cafetería' },
                    500: { type: 'lunch', description: 'Almuerzo pagado' },
                    1000: { type: 'day_off', description: 'Día libre adicional' },
                    500: { type: 'gift_card', description: 'Tarjeta de regalo $25' },
                    2000: { type: 'bonus', description: 'Bono de rendimiento' }
                },
                badges: {
                    'month_top_performer': { name: 'Estrella del Mes', icon: '⭐', description: 'Mejor rendimiento del mes' },
                    'quality_champion': { name: 'Maestro de Calidad', icon: '🏆', description: 'Excelencia en calidad' },
                    'team_player': { name: 'Jugador de Equipo', icon: '🤝', description: 'Excelente colaborador' }
                },
                recognition: {
                    'employee_of_month': { name: 'Empleado del Mes', icon: '👤', description: 'Reconocimiento público' },
                    'quality_innovation': { name: 'Innovador en Calidad', icon: '💡', description: 'Contribución a mejoras de calidad' }
                }
            }
        };

        // Estado del sistema
        this.state = {
            active: false,
            dailyReset: false,
            weeklyReset: false,
            monthlyReset: false
            lastDailyReset: null,
            lastWeeklyReset: null,
            lastMonthlyReset: null
        };

        // Cache
        this.cache = {
            leaderboards: new Map(),
            achievements: new Map(),
            challenges: new Map(),
            notifications: new Map()
        };

        this.initialize();
    }

    /**
     * Inicializar sistema de gamificación
     */
    async initialize() {
        try {
            console.log('🎮 Inicializando Gamification Service...');

            // Cargar estado del sistema
            await this.loadSystemState();

            // Verificar si hay resets pendientes
            await this.checkScheduledResets();

            // Configurar eventos periódicos
            this.setupScheduledEvents();

            // Pre-cargar datos comunes
            await this.preloadCommonData();

            this.state.active = true;
            console.log('✅ Gamification Service inicializado');

        } catch (error) {
            console.error('❌ Error inicializando gamificación:', error);
            throw error;
        }
    }

    /**
     * Otorgar puntos a un agente
     */
    async awardPoints(agentId, points, reason, metadata = {}) {
        try { // Error handling wrapper - try...catch block
            const currentPoints = await this.getAgentPoints(agentId);

            // Crear registro de puntos
            const pointRecord = await db.sequelize.query(`
                INSERT INTO gamification_points
                    (agent_id, points, reason, metadata, created_at)
                VALUES (?, ?, ?, ?, NOW())
                RETURNING *
            `, {
                replacements: [agentId, points, reason, JSON.stringify(metadata)]
            });

            // Actualizar puntuación total del agente
            await this.updateAgentTotalPoints(agentId, currentPoints.total + points);

            // Verificar y aplicar logros
            await this.checkAchievements(agentId, currentPoints.total + points);

            // Verificar nivel actual
            await this.checkLevelUpgrade(agentId, currentPoints.total + points);

            // Notificar al agente
            this.emit('points:awarded', {
                agentId,
                points,
                reason,
                totalPoints: currentPoints.total + points,
                newLevel: await this.getAgentLevel(agentId)
            });

            return pointRecord;

        } catch (error) {
            console.error('Error otorgando puntos:', error);
            throw error;
        }
    }

    /**
     * Obtener puntos de un agente
     */
    async getAgentPoints(agentId) {
        try {
            const [results] = await db.sequelize.query(`
                SELECT
                    COALESCE(SUM(points), 0) as total,
                    COUNT(*) as transactions,
                    MAX(created_at) as last_transaction
                FROM gamification_points
                WHERE agent_id = ?
                GROUP BY agent_id
            `, {
                replacements: [agentId]
            });

            return results[0] || { total: 0, transactions: 0, last_transaction: null };

        } catch (error) {
            console.error('Error obteniendo puntos del agente:', error);
            return { total: 0, transactions: 0, last_transaction: null };
        }
    }

    /**
     * Obtener leaderboard
     */
    async getLeaderboard(timeRange = 'week', limit = 20, agentId = null) {
        try { // Error handling wrapper - try...catch block
            const cacheKey = `leaderboard_${timeRange}_${agentId}`;

            if (this.cache.leaderboards.has(cacheKey)) {
                const cached = this.cache.leaderboards.get(cacheKey);
                if (Date.now() - cached.timestamp < 60000) { // 1 minuto
                    return cached.data;
                }
            }

            const leaderboard = await this.generateLeaderboard(timeRange, limit, agentId);

            // Actualizar cache
            this.cache.leaderboards.set(cacheKey, {
                data: leaderboard,
                timestamp: Date.now()
            });

            return leaderboard;

        } catch (error) {
            console.error('Error generando leaderboard:', error);
            return [];
        }
    }

    /**
     * Obtener logros de un agente
     */
    async getAgentAchievements(agentId) {
        try {
            const [results] = await db.sequelize.query(`
                SELECT achievement_id, unlocked_at, notification_sent
                FROM agent_achievements
                WHERE agent_id = ?
                ORDER BY unlocked_at DESC
            `, {
                replacements: [agentId]
            });

            const achievements = [];
            for (const row of results) {
                const achievement = this.config.achievements.find(a => a.id === row.achievement_id);
                if (achievement) {
                    achievements.push({
                        ...achievement,
                        unlockedAt: row.unlocked_at,
                        notificationSent: row.notification_sent
                    });
                }
            }

            return achievements;

        } catch (error) {
            console.error('Error obteniendo logros del agente:', error);
            return [];
        }
    }

    /**
     * Obtener desafíos activos
     */
    async getActiveChallenges(timeRange = 'week') {
        try {
            const [results] = await db.sequelize.query(`
                SELECT
                    c.id as challenge_id,
                    c.name,
                    c.description,
                    c.target,
                    c.duration,
                    c.type,
                    c.icon,
                    COALESCE(cp.current_progress, 0) as current_progress,
                    COALESCE(cp.completed, FALSE) as completed
                FROM challenges c
                LEFT JOIN challenge_participants cp ON c.id = cp.challenge_id
                WHERE c.type = ? AND c.duration = ?
                AND (NOW() BETWEEN c.start_date AND c.end_date)
                AND c.is_active = true
                AND cp.agent_id = ?
                ORDER BY c.end_date DESC
            `, {
                replacements: [timeRange]
            });

            return results.map(row => ({
                challenge: {
                    id: row.challenge_id,
                    name: row.name,
                    description: row.description,
                    target: row.target,
                    duration: row.duration,
                    type: row.type,
                    icon: row.icon
                },
                participantProgress: {
                    current: parseInt(row.current_progress),
                    target: row.target,
                    completed: row.completed,
                    percentage: Math.round((row.current_progress / row.target) * 100)
                }
            }));

        } catch (error) {
            console.error('Error obteniendo desafíos activos:', error);
            return [];
        }
    }

    /**
     * Generar leaderboard
     */
    async generateLeaderboard(timeRange, limit, agentId) {
        try {
            const { startDate, endDate } = this.getDateRange(timeRange);

            // Obtener métricas de los agentes
            const [agentMetrics] = await db.sequelize.query(`
                SELECT
                    a.id,
                    a.nombre as name,
                    a.correo as email,
                    COUNT(CASE WHEN qp.points > 0 THEN 1 ELSE 0 END) as total_calls,
                    COALESCE(AVG(quality_score), 0) as avg_quality,
                    COALESCE(SUM(qp.points), 0) as total_points,
                    COALESCE(AVG(customer_satisfaction), 0) as avg_satisfaction,
                    MAX(qp.created_at) as last_activity
                FROM agents a
                LEFT JOIN (
                    SELECT agent_id, points, created_at
                    FROM gamification_points qp
                    WHERE created_at >= ? AND created_at <= ?
                    AND a.estado = 'ACTIVO'
                ) qp ON a.id = qp.agent_id
                LEFT JOIN (
                    SELECT agent_id, quality_score
                    FROM work_sessions ws
                    WHERE ws.agent_id = a.id
                    AND ws.login_time >= ? AND ws.logout_time <= ?
                    AND a.estado = 'ACTIVO'
                ) qs ON a.id = qs.agent_id
                LEFT JOIN (
                    SELECT agent_id, customer_satisfaction
                    FROM quality_analysis qa
                    WHERE qa.agent_id = a.id
                    AND qa.created_at >= ? AND qa.created_at <= ?
                    AND a.estado = 'ACTIVO'
                ) cs ON a.id = cs.agent_id
                WHERE a.estado = 'ACTIVO'
                GROUP BY a.id, a.nombre, a.correo
                HAVING MAX(qp.created_at) >= ?
                ORDER BY total_points DESC
            `, {
                replacements: [startDate, endDate, agentId]
            });

            // Formatear leaderboard
            const leaderboard = agentMetrics.map((agent, index) => {
                const level = this.getLevelFromPoints(agent.total_points);
                const rank = index + 1;

                return {
                    rank,
                    agentId: agent.id,
                    name: agent.name,
                    email: agent.email,
                    totalCalls: parseInt(agent.total_calls),
                    totalPoints: parseInt(agent.total_points),
                    level: level.name,
                    levelIcon: level.icon,
                    levelColor: level.color,
                    avgQuality: parseFloat(agent.avg_quality || 0).toFixed(1),
                    avgSatisfaction: parseFloat(agent.avg_satisfaction || 0).toFixed(1),
                    lastActivity: agent.last_activity,
                    streakDays: await this.getLoginStreak(agent.id)
                };
            });

            return leaderboard.slice(0, limit);

        } catch (error) {
            console.error('Error generando leaderboard:', error);
            return [];
        }
    }

    /**
     * Verificar y aplicar logros
     */
    async checkAchievements(agentId, totalPoints) {
        try {
            const agentAchievements = await this.getAgentAchievements(agentId);
            const existingIds = new Set(agentAchievements.map(a => a.achievement_id));

            for (const achievement of this.config.achievements) {
                if (!existingIds.has(achievement.id)) {
                    const shouldUnlock = await this.shouldUnlockAchievement(achievement.id, agentId, totalPoints);

                    if (shouldUnlock) {
                        // Desbloquear logro
                        await this.unlockAchievement(agentId, achievement.id);

                        // Notificar logro
                        this.emit('achievement:unlocked', {
                            agentId,
                            achievement: {
                                id: achievement.id,
                                name: achievement.name,
                                description: achievement.description,
                                icon: achievement.icon,
                                points: achievement.points
                            }
                        });
                    }
                }
            }

        } catch (error) {
            console.error('Error verificando logros:', error);
        }
    }

    /**
     * Verificar si un logro debe desbloquearse
     */
    async shouldUnlockAchievement(achievementId, agentId, totalPoints) {
        try {
            switch (achievementId) {
                case 'first_call':
                    return await this.hasAgentMadeCall(agentId);
                case 'first_sale':
                    return await this.hasAgentMadeSale(agentId);
                case 'quality_master':
                    return await this.hasAgentQualityMaster(agentId);
                case 'speed_demon':
                    return await this.hasAgentSpeedDemon(agentId);
                case 'customer_hero':
                    return await this.hasAgentCustomerHero(agentId);
                case 'streak_warrior':
                    return await this.getLoginStreak(agentId) >= 7;
                case 'team_player':
                    return await this.isTeamPlayer(agentId);
                case 'learning_champion':
                    return await this.isLearningChampion(agentId);
                case 'social_butterfly':
                    return await this.isSocialButterfly(agentId);
                default:
                    return false;
            }

        } catch (error) {
            console.error('Error verificando logro:', error);
            return false;
        }
    }

    /**
     * Verificar nivel de agente
     */
    async checkLevelUpgrade(agentId, totalPoints) {
        try {
            const currentLevel = await this.getAgentLevel(agentId);
            const newLevel = this.getLevelFromPoints(totalPoints);

            if (newLevel.minPoints > currentLevel.minPoints) {
                // Aplicar upgrade de nivel
                await this.upgradeAgentLevel(agentId, currentLevel, newLevel);

                // Notificar upgrade
                this.emit('level:upgraded', {
                    agentId,
                    from: currentLevel,
                    to: newLevel
                });

                return true;
            }

            return false;

        } catch (error) {
            console.error('Error verificando upgrade de nivel:', error);
            return false;
        }
    }

    /**
     * Métodos utilitarios
     */
    getLevelFromPoints(points) {
        for (const [levelName, level] of Object.entries(this.config.levels).reverse()) {
            if (points >= level.minPoints) {
                return { ...level, points };
            }
        }
        return this.config.levels.bronce;
    }

    async unlockAchievement(agentId, achievementId) {
        try {
            await db.sequelize.query(`
                INSERT INTO agent_achievements
                    (agent_id, achievement_id, unlocked_at, notification_sent)
                    VALUES (?, ?, NOW(), FALSE)
                `, {
                    replacements: [agentId, achievementId]
                });

            return true;

        } catch (error) {
            console.error('Error desbloqueando logro:', error);
            return false;
        }
    }

    async upgradeAgentLevel(agentId, fromLevel, toLevel) {
        try {
            await db.sequelize.query(`
                INSERT INTO agent_level_upgrades
                    (agent_id, from_level, to_level, upgraded_at)
                    VALUES (?, ?, ?, NOW())
            `, {
                replacements: [agentId, fromLevel.name, toLevel.name]
            });

        } catch (error) {
            console.error('Error en upgrade de nivel:', error);
        }
    }

    // Implementar métodos de validación específicos...
    async hasAgentMadeCall(agentId) {
        // Implementar lógica para verificar si el agente ha hecho llamadas
        return true;
    }

    async hasAgentMadeSale(agentId) {
        // Implementar lógica para verificar si el agente ha hecho ventas
        return true;
    }

    async hasAgentQualityMaster(agentId) {
        // Implementar lógica para verificar calidad maestra
        return true;
    }

    async hasAgentSpeedDemon(agentId) {
        // Implementar lógica para verificar velocidad
        return true;
    }

    async hasAgentCustomerHero(agentId) {
        // Implementar lógica para verificar héroe del cliente
        return true;
    }

    async getLoginStreak(agentId) {
        // Implementar lógica para racha de login
        return 7;
    }

    async isTeamPlayer(agentId) {
        // Implementar lógica para jugador de equipo
        return true;
    }

    async isLearningChampion(agentId) {
        // Implementar lógica para campeón de aprendizaje
        return true;
    }

    async isSocialButterfly(agentId) {
        // Implementar lógica para mariposa social
        return true;
    }

    // Implementar métodos de setup, carga y validación...
    async loadSystemState() {
        // Cargar estado persistido
        return true;
    }

    async checkScheduledResets() {
        // Verificar si hay resets programados
        return true;
    }

    async setupScheduledEvents() {
        // Configurar eventos periódicos
        return true;
    }

    async preloadCommonData() {
        // Precargar datos comunes en cache
        return true;
    }
}

export default new GamificationService();
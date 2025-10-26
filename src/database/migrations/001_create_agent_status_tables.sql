-- Migración para crear tablas de tracking de agentes
-- Welcomedly - Fase 1: Fundamentos Operativos

-- Tabla de log de estados de agentes
CREATE TABLE IF NOT EXISTS agent_status_log (
    id SERIAL PRIMARY KEY,
    agente_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('available', 'in_call', 'on_pause', 'after_call_work', 'training', 'meeting', 'offline')),
    previous_status VARCHAR(20) CHECK (previous_status IN ('available', 'in_call', 'on_pause', 'after_call_work', 'training', 'meeting', 'offline', NULL)),
    reason TEXT,
    metadata JSONB DEFAULT '{}',
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para agent_status_log
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_status_active ON agent_status_log (agente_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_agent_status_agent_time ON agent_status_log (agente_id, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_status_status ON agent_status_log (status);
CREATE INDEX IF NOT EXISTS idx_agent_status_start_time ON agent_status_log (start_time);

-- Tabla de historial de pausas
CREATE TABLE IF NOT EXISTS pause_history (
    id SERIAL PRIMARY KEY,
    agente_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    pause_type VARCHAR(20) NOT NULL CHECK (pause_type IN ('bathroom', 'lunch', 'break', 'coaching', 'system_issue', 'personal')),
    reason TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    supervisor_approved BOOLEAN NOT NULL DEFAULT FALSE,
    supervisor_id INTEGER REFERENCES usuarios(id),
    notes TEXT,
    alert_sent BOOLEAN NOT NULL DEFAULT FALSE,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para pause_history
CREATE UNIQUE INDEX IF NOT EXISTS idx_pause_active ON pause_history (agente_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_pause_agent_time ON pause_history (agente_id, created_at);
CREATE INDEX IF NOT EXISTS idx_pause_type ON pause_history (pause_type);
CREATE INDEX IF NOT EXISTS idx_pause_start_time ON pause_history (start_time);
CREATE INDEX IF NOT EXISTS idx_pause_supervisor ON pause_history (supervisor_id);

-- Tabla de sesiones de trabajo
CREATE TABLE IF NOT EXISTS work_sessions (
    id SERIAL PRIMARY KEY,
    agente_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    login_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    logout_time TIMESTAMP WITH TIME ZONE,
    total_duration INTEGER,
    productive_time INTEGER DEFAULT 0,
    pause_time INTEGER DEFAULT 0,
    call_time INTEGER DEFAULT 0,
    after_call_work_time INTEGER DEFAULT 0,
    calls_handled INTEGER DEFAULT 0,
    sales_count INTEGER DEFAULT 0,
    quality_score DECIMAL(5,2) CHECK (quality_score >= 0 AND quality_score <= 100),
    customer_satisfaction DECIMAL(3,1) CHECK (customer_satisfaction >= 0 AND customer_satisfaction <= 5),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    campaign_id INTEGER REFERENCES campanas(id),
    ip_address INET,
    user_agent TEXT,
    login_type VARCHAR(20) NOT NULL DEFAULT 'regular' CHECK (login_type IN ('regular', 'remote', 'vpn')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para work_sessions
CREATE UNIQUE INDEX IF NOT EXISTS idx_session_active ON work_sessions (agente_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_session_agent_time ON work_sessions (agente_id, login_time);
CREATE INDEX IF NOT EXISTS idx_session_campaign ON work_sessions (campaign_id);
CREATE INDEX IF NOT EXISTS idx_session_login_time ON work_sessions (login_time);

-- Comentarios descriptivos
COMMENT ON TABLE agent_status_log IS 'Registro histórico de cambios de estado de los agentes para tracking en tiempo real';
COMMENT ON TABLE pause_history IS 'Historial detallado de pausas tomadas por los agentes con control de duración y aprobación';
COMMENT ON TABLE work_sessions IS 'Sesiones de trabajo de agentes con métricas de productividad y rendimiento';

-- Crear función para actualizar duración automáticamente
CREATE OR REPLACE FUNCTION update_status_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.end_time IS NOT NULL AND NEW.duration IS NULL THEN
        NEW.duration := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers para actualización automática de duración
DROP TRIGGER IF EXISTS trg_agent_status_duration ON agent_status_log;
CREATE TRIGGER trg_agent_status_duration
    BEFORE UPDATE ON agent_status_log
    FOR EACH ROW
    EXECUTE FUNCTION update_status_duration();

DROP TRIGGER IF EXISTS trg_pause_duration ON pause_history;
CREATE TRIGGER trg_pause_duration
    BEFORE UPDATE ON pause_history
    FOR EACH ROW
    EXECUTE FUNCTION update_status_duration();

-- Crear vista para reportes de productividad
CREATE OR REPLACE VIEW agent_productivity_view AS
SELECT
    u.id as agent_id,
    u.nombre as agent_name,
    u.correo as agent_email,
    COUNT(ws.id) as total_sessions,
    COALESCE(SUM(ws.total_duration), 0) as total_work_time,
    COALESCE(SUM(ws.productive_time), 0) as total_productive_time,
    COALESCE(SUM(ws.pause_time), 0) as total_pause_time,
    COALESCE(SUM(ws.call_time), 0) as total_call_time,
    COALESCE(SUM(ws.calls_handled), 0) as total_calls,
    COALESCE(SUM(ws.sales_count), 0) as total_sales,
    COALESCE(AVG(ws.quality_score), 0) as avg_quality_score,
    COALESCE(AVG(ws.customer_satisfaction), 0) as avg_satisfaction,
    MAX(ws.login_time) as last_login_date,
    CASE
        WHEN SUM(ws.total_duration) > 0 THEN
            ROUND((SUM(ws.productive_time)::DECIMAL / SUM(ws.total_duration)::DECIMAL * 100, 2)
        ELSE 0
    END as efficiency_percentage
FROM usuarios u
LEFT JOIN work_sessions ws ON u.id = ws.agente_id
WHERE u.estado = 'ACTIVO'
    AND u.rol = 'AGENTE'
    AND ws.login_time >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY u.id, u.nombre, u.correo;

-- Vista para pausas del día actual
CREATE OR REPLACE VIEW today_pauses_view AS
SELECT
    u.nombre as agent_name,
    ph.pause_type,
    ph.reason,
    ph.start_time,
    ph.end_time,
    ph.duration,
    ph.supervisor_approved,
    CASE
        WHEN ph.is_active THEN 'Activa'
        ELSE 'Finalizada'
    END as status
FROM pause_history ph
JOIN usuarios u ON ph.agente_id = u.id
WHERE DATE(ph.start_time) = CURRENT_DATE
ORDER BY ph.start_time DESC;

-- Insertar datos de ejemplo para testing (opcional)
-- Estos datos se pueden eliminar con TRUNCATE en producción
INSERT INTO agent_status_log (agente_id, status, start_time, is_active)
SELECT id, 'available', NOW(), TRUE
FROM usuarios
WHERE rol = 'AGENTE' AND estado = 'ACTIVO'
LIMIT 5;
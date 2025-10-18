export default (sequelize, DataTypes) => {
    const BaseCampana = sequelize.define('BaseCampana', {
        nombre: {
            type: DataTypes.STRING,
            allowNull: false
        },
        telefono: {
            type: DataTypes.STRING,
            allowNull: false
        },
        correo: {
            type: DataTypes.STRING,
            allowNull: false
        },
        otrosCampos: {
            type: DataTypes.JSONB,
            allowNull: true
        },
        agenteId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        tipificacion: {
            type: DataTypes.STRING,
            allowNull: true
        }, // Tipificación (formulario personalizado)
        disposicionId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Código de disposición de la llamada'
        },
        callbackDate: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Fecha y hora agendada para volver a llamar'
        },
        callbackNotas: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Notas para el callback agendado'
        },
        intentosLlamada: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: 'Número de intentos de contacto'
        },
        ultimaLlamada: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Timestamp del último intento de llamada'
        },
        campanaId: {
        type: DataTypes.INTEGER,
        allowNull: false, // No permitir valores nulos
        references: {
            model: 'campanas', // Nombre de la tabla en PostgreSQL
            key: 'id'
                }
            }
        }, {
            underscored: true, // Si usas snake_case en la BD
            indexes: [
                // Índice en campanaId para consultas frecuentes
                {
                    fields: ['campana_id']
                },
                // Índice en agenteId para filtrar por agente
                {
                    fields: ['agente_id']
                },
                // Índice en tipificación para reportes
                {
                    fields: ['tipificacion']
                },
                // Índice compuesto para reportes por campaña y tipificación
                {
                    fields: ['campana_id', 'tipificacion']
                },
                // Índice en correo para búsquedas
                {
                    fields: ['correo']
                },
                // Índice en callback_date para filtrar callbacks pendientes
                {
                    fields: ['callback_date']
                },
                // Índice en disposicion_id
                {
                    fields: ['disposicion_id']
                },
                // Índice compuesto para callbacks pendientes por agente
                {
                    fields: ['agente_id', 'callback_date']
                }
            ]
        });
        
    BaseCampana.associate = (models) => {
        BaseCampana.belongsTo(models.Campana, {
            foreignKey: 'campanaId',
            as: 'campana'
        });
        BaseCampana.belongsTo(models.User, {
            foreignKey: 'agenteId',
            as: 'agente'
        });
        BaseCampana.belongsTo(models.Disposicion, {
            foreignKey: 'disposicionId',
            as: 'disposicion'
        });
    };

    return BaseCampana;
};

/**
 * Modelo de Disposición (Códigos de cierre de llamada)
 * Ejemplos: "No contesta", "Número equivocado", "Ocupado", "Venta cerrada", etc.
 */
export default (sequelize, DataTypes) => {
    const Disposicion = sequelize.define('Disposicion', {
        nombre: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
            validate: {
                notEmpty: true,
                len: [2, 100]
            }
        },
        descripcion: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        color: {
            type: DataTypes.STRING(20),
            allowNull: true,
            defaultValue: '#6c757d' // Color por defecto (gris)
        },
        tipo: {
            type: DataTypes.ENUM(
                'EXITOSA', // Venta cerrada, Objetivo logrado
                'NO_CONTACTO', // No contesta, Ocupado, Número equivocado
                'SEGUIMIENTO', // Volver a llamar, Enviar información
                'NO_EXITOSA' // No interesado, No califica
            ),
            allowNull: false,
            defaultValue: 'NO_CONTACTO'
        },
        requiereCallback: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        activa: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        orden: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        }
    }, {
        tableName: 'disposiciones',
        timestamps: true,
        underscored: true,
        indexes: [
            {
                fields: ['tipo']
            },
            {
                fields: ['activa']
            },
            {
                fields: ['orden']
            },
            {
                fields: ['requiere_callback']
            }
        ]
    });

    Disposicion.associate = (models) => {
        // Una campaña puede tener múltiples disposiciones asignadas
        Disposicion.belongsToMany(models.Campana, {
            through: 'campana_disposiciones',
            foreignKey: 'disposicion_id',
            otherKey: 'campana_id',
            as: 'campanas'
        });
    };

    return Disposicion;
};

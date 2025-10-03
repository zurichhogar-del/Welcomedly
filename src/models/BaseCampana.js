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
        tipificacion: { type: DataTypes.STRING, allowNull: true }, // Única tipificación

        campanaId: {
        type: DataTypes.INTEGER,
        allowNull: false, // No permitir valores nulos
        references: {
            model: 'campanas', // Nombre de la tabla en PostgreSQL
            key: 'id'
                }
            }
        }, {
            underscored: true // Si usas snake_case en la BD
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
    };

    return BaseCampana;
};

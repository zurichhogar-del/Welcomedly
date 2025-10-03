export default (sequelize, DataTypes) => {
    const Campana = sequelize.define('Campana', {
        nombre: {
            type: DataTypes.STRING,
            allowNull: false
        },
        formularioId: { 
            type: DataTypes.INTEGER,
            allowNull: false
        },
        guion: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        estado: {
            type: DataTypes.BOOLEAN,
            defaultValue: true 
        },
        baseDatos: { // Almacenará la ruta del archivo CSV
            type: DataTypes.TEXT,
            allowNull: false
        },
        agentesAsignados: {
            type: DataTypes.ARRAY(DataTypes.INTEGER),
            allowNull: false
        },
        createdAt: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW
            },
        }, {
            tableName: 'campanas', // Nombre explícito de la tabla
            timestamps: true,
            underscored: true // Opcional: para compatibilidad con snake_case
        });

    Campana.associate = (models) => {
        Campana.hasMany(models.BaseCampana, {
            foreignKey: 'campanaId',
            as: 'registros'
        });
        Campana.belongsTo(models.Formulario, {
            foreignKey: 'formularioId',
            as: 'formulario'
        });
    };

    return Campana;
};
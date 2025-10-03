// models/Formulario.js
export default (sequelize, DataTypes) => {
    const Formulario = sequelize.define('Formulario', {
        nombre: { 
            type: DataTypes.STRING, 
            allowNull: false,
            unique: true
        },
        campos: { 
            type: DataTypes.ARRAY(DataTypes.TEXT), // ✅ Usar TEXT en lugar de STRING
            allowNull: false,
            validate: {
                esArrayValido(value) {
                    if (!Array.isArray(value)) {
                        throw new Error('Debe ser un array de strings');
                    }
                }
            }
        }
    }, {
        // Opciones adicionales para PostgreSQL
        dialectOptions: {
            type: 'TEXT[]' // Forzar tipo en PostgreSQL
        }
    });

    return Formulario;
};
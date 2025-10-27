import bcrypt from 'bcrypt';

export default (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        primerNombre: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        segundoNombre: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        primerApellido: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        segundoApellido: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        identificacion: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        correo: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true,
            },
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        rol: {
            type: DataTypes.ENUM("ADMIN", "AGENTE"),
            allowNull: false,
        },
        contrasena: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        estado: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        // Campo virtual para compatibilidad con módulos de tracking
        nombre: {
            type: DataTypes.VIRTUAL,
            get() {
                const partes = [
                    this.primerNombre,
                    this.segundoNombre,
                    this.primerApellido,
                    this.segundoApellido
                ];
                return partes.filter(Boolean).join(' ');
            }
        }
    }, {
        sequelize,
        modelName: "User",
        tableName: "usuarios",
        indexes: [
            // Índice en rol para filtrar por tipo de usuario
            {
                fields: ['rol']
            },
            // Índice en estado para filtrar activos/inactivos
            {
                fields: ['estado']
            },
            // Índice compuesto rol + estado (consulta común)
            {
                fields: ['rol', 'estado']
            }
        ],
        hooks: {
            beforeValidate: async (user) => {
                // Generar username si no existe
                if (!user.username) {
                    const partesNombre = [
                        user.primerNombre,
                        user.segundoNombre,
                        user.primerApellido,
                        user.segundoApellido
                    ];
                    
                    // Filtrar y unir componentes del nombre
                    const nombreCompleto = partesNombre
                        .filter(Boolean)
                        .join('')
                        .toLowerCase();
                    
                    if (nombreCompleto) {
                        const usernameBase = nombreCompleto;
                        let counter = 1;
                        let usernameFinal = usernameBase;
                        
                        // Verificar unicidad
                        while (true) {
                            const existeUsuario = await User.findOne({
                                where: { username: usernameFinal }
                            });
                            
                            if (!existeUsuario) {break;}
                            
                            usernameFinal = `${usernameBase}${counter}`;
                            counter++;
                        }
                        
                        user.username = usernameFinal;
                    }
                }
            },
            beforeCreate: async (user) => {
                if (user.contrasena) {
                    const salt = await bcrypt.genSalt(10);
                    user.contrasena = await bcrypt.hash(user.contrasena, salt);
                }
            }
        }
    });

    return User;
};

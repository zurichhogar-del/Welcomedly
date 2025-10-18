import bcrypt from 'bcryptjs';

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
            type: DataTypes.ENUM("ADMIN", "AGENTE", "OPERATIONS"),
            allowNull: false,
            defaultValue: "AGENTE"
        },
        status: {
            type: DataTypes.ENUM('available', 'on_call', 'wrap_up', 'break', 'offline'),
            allowNull: false,
            defaultValue: 'offline'
        },
        lastStatusChange: {
            type: DataTypes.DATE,
            allowNull: true
        },
        contrasena: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        estado: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        }
    }, {
        sequelize,
        modelName: "User",
        tableName: "usuarios",
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
                        let usernameBase = nombreCompleto;
                        let counter = 1;
                        let usernameFinal = usernameBase;
                        
                        // Verificar unicidad
                        while (true) {
                            const existeUsuario = await User.findOne({
                                where: { username: usernameFinal }
                            });
                            
                            if (!existeUsuario) break;
                            
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

    User.associate = function(models) {
        User.belongsToMany(models.Role, {
            through: 'user_roles',
            foreignKey: 'userId',
            otherKey: 'roleId',
            timestamps: true
        });
        
        User.hasMany(models.AgentStatusLog, {
            foreignKey: 'userId',
            as: 'statusLogs'
        });
    };

    // Instance methods for RBAC
    User.prototype.hasRole = function(roleName) {
        return this.rol === roleName;
    };

    User.prototype.hasPermission = async function(permissionName) {
        if (this.rol === 'ADMIN') return true;
        
        // For simplicity, we'll use the basic role system
        // In a full implementation, you would check permissions through roles
        const rolePermissions = {
            'ADMIN': ['*'],
            'OPERATIONS': [
                'view_agents', 'manage_campaigns', 'view_reports', 
                'monitor_agents', 'manage_agent_status'
            ],
            'AGENTE': [
                'view_own_calls', 'update_call_status', 'view_customer_info'
            ]
        };
        
        return rolePermissions[this.rol]?.includes(permissionName) || false;
    };

    return User;
};

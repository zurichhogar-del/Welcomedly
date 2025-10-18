export default (sequelize, DataTypes) => {
    const Role = sequelize.define('Role', {
        name: {
            type: DataTypes.ENUM('ADMIN', 'OPERATIONS', 'AGENT'),
            allowNull: false,
            unique: true,
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        }
    }, {
        sequelize,
        modelName: "Role",
        tableName: "roles",
        timestamps: true,
    });

    Role.associate = function(models) {
        Role.belongsToMany(models.User, {
            through: 'user_roles',
            foreignKey: 'roleId',
            otherKey: 'userId',
            timestamps: true
        });
        
        Role.belongsToMany(models.Permission, {
            through: 'role_permissions',
            foreignKey: 'roleId',
            otherKey: 'permissionId',
            timestamps: true
        });
    };

    return Role;
};
export default (sequelize, DataTypes) => {
    const Permission = sequelize.define('Permission', {
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        resource: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        action: {
            type: DataTypes.ENUM('create', 'read', 'update', 'delete', 'manage'),
            allowNull: false,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        }
    }, {
        sequelize,
        modelName: "Permission",
        tableName: "permissions",
        timestamps: true,
    });

    Permission.associate = function(models) {
        Permission.belongsToMany(models.Role, {
            through: 'role_permissions',
            foreignKey: 'permissionId',
            otherKey: 'roleId',
            timestamps: true
        });
    };

    return Permission;
};
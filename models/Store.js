module.exports = (sequelize, DataTypes) => {
    const Store = sequelize.define('Store', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      ownerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      nameOutlet: {
        type: DataTypes.STRING,
        allowNull: false
      },
      trialExpiredAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      tokenExpiredAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('active', 'expired', 'suspended'),
        allowNull: false,
        defaultValue: 'active'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      }
    },{
        tableName: 'stores'
    });

    Store.associate = (models) => {
        Store.belongsTo(models.User, {
            foreignKey: 'ownerId',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
    };

    return Store
};
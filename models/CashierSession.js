module.exports = (sequelize, DataTypes) => {
    const CashierSession = sequelize.define('CashierSession', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      storeId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      openedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      closedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("open", "close"),
        defaultValue: "open" 
      },
      note: {
        type: DataTypes.TEXT
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
        tableName: 'cashier_sessions'
    });

    CashierSession.associate = (models) => {
        CashierSession.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user',
        });
        CashierSession.belongsTo(models.Store, {
            foreignKey: 'storeId',
            as: 'store',
        });
    };

    return CashierSession;
}
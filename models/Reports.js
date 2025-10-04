module.exports = (sequelize, DataTypes) => {
    const Reports = sequelize.define('Reports', {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      storeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      cashierSessionId: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      openedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      closedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      closingBalance: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
      },
      variance: {
        type: DataTypes.DECIMAL(12, 2),
      },
      totalTrx: {
        type: DataTypes.INTEGER
      },
      totalProfit: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false 
      },
      cashIn: {
        type: DataTypes.DECIMAL(12, 2),
      },
      cashOut: {
        type: DataTypes.DECIMAL(12, 2),
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
        tableName: 'reports'
    });

    Reports.associate = (models) => {
        Reports.belongsTo(models.Store, {
            foreignKey: 'storeId',
            as: 'store',
        });
        Reports.belongsTo(models.CashierSession, {
            foreignKey: 'cashierSessionId',
            as: 'cashier_session',
        });
    };

    return Reports;
}
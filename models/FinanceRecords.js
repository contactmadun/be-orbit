module.exports = (sequelize, DataTypes) => {
    const FinanceRecords = sequelize.define('FinanceRecords', {
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
      fundSourceId: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      type: {
        type: DataTypes.ENUM('income', 'expanse'),
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
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
        tableName: 'finance_records'
    });

    FinanceRecords.associate = (models) => {
        FinanceRecords.belongsTo(models.Store, {
            foreignKey: 'storeId',
            as: 'store',
        });
        FinanceRecords.belongsTo(models.CashierSession, {
            foreignKey: 'cashierSessionId',
            as: 'cashier_session',
        });
        FinanceRecords.belongsTo(models.Fund, {
            foreignKey: 'fundSourceId',
            as: 'fund',
        });
    };

    return FinanceRecords;
}
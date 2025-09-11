module.exports = (sequelize, DataTypes) => {
    const CashierFundBalance = sequelize.define('CashierFundBalance', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      cashierSessionId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      fundSourceId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      openingBalance: {
        type: DataTypes.DECIMAL,
        allowNull: false,
      },
      currentBalance: {
        type: DataTypes.DECIMAL,
        allowNull: false,
      },
      closingBalance: {
        type: DataTypes.DECIMAL,
        allowNull: true,
      },
      variance: {
        type: DataTypes.DECIMAL,
        defaultValue: 0
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
        tableName: 'cashier_fund_balances'
    });

    CashierFundBalance.associate = (models) => {
        CashierFundBalance.belongsTo(models.CashierSession, {
            foreignKey: 'cashierSessionId',
            as: 'cashierSession',
        });
        CashierFundBalance.belongsTo(models.Fund, {
            foreignKey: 'fundSourceId',
            as: 'fundSource',
        });
    };

    return CashierFundBalance;
}
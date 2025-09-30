module.exports = (sequelize, DataTypes) => {
    const Transaction = sequelize.define('Transaction', {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      trxId: {
        type: DataTypes.STRING,
        allowNull: false
      },
      storeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      cashier_session_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      fund_source_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      product_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      customer_name: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      customer_phone: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      qty: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      cost_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
      },
      price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
      },
      total: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
      },
      profit: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM('Lunas', 'void', 'Belum Lunas'),
        allowNull: false,
        defaultValue: 'Lunas'
      },
      transaction_type: {
        type: DataTypes.ENUM('manual', 'penjualan', 'transfer', 'tarik', 'jasa', 'grosir'),
        allowNull: false,
        defaultValue: 'sales'
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
        tableName: 'transactions'
    });

    Transaction.associate = (models) => {
        Transaction.belongsTo(models.Store, {
            foreignKey: 'storeId',
            as: 'store',
        });
        Transaction.belongsTo(models.CashierSession, {
            foreignKey: 'cashier_session_id',
            as: 'cashier_session',
        });
        Transaction.belongsTo(models.Fund, {
            foreignKey: 'fund_source_id',
            as: 'fund',
        });
        Transaction.belongsTo(models.Product, {
            foreignKey: 'product_id',
            as: 'product',
        });
    };

    return Transaction;
}
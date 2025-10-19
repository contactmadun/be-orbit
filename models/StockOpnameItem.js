module.exports = (sequelize, DataTypes) => {
  const StockOpnameItem = sequelize.define('StockOpnameItem', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    stockOpnameId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    systemStock: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    physicalStock: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    difference: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    }
  }, {
    tableName: 'stock_opname_items'
  });

  StockOpnameItem.associate = (models) => {
    // Relasi ke StockOpname
    StockOpnameItem.belongsTo(models.StockOpname, {
      foreignKey: 'stockOpnameId',
      as: 'stockOpname',
    });

    // Relasi ke Product
    StockOpnameItem.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product',
    });
  };

  return StockOpnameItem;
};

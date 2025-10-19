module.exports = (sequelize, DataTypes) => {
  const StockOpname = sequelize.define('StockOpname', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    storeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    brandId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    opnameDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    verifiedBy: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM("draft", "verified"),
      defaultValue: "draft"
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
    tableName: 'stock_opnames'
  });

  StockOpname.associate = (models) => {
    // Relasi ke Store
    StockOpname.belongsTo(models.Store, {
      foreignKey: 'storeId',
      as: 'store',
    });

    // Relasi ke Brand
    StockOpname.belongsTo(models.Brand, {
      foreignKey: 'brandId',
      as: 'brand',
    });

    // Relasi ke detail item opname
    StockOpname.hasMany(models.StockOpnameItem, {
      foreignKey: 'stockOpnameId',
      as: 'items',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  };

  return StockOpname;
};

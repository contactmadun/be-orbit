module.exports = (sequelize, DataTypes) => {
    const Product = sequelize.define('Product', {
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
      categoryId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      brandId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT
      },
      purchasePrice: {
        type: DataTypes.DECIMAL,
        allowNull: false,
      },
      agentPrice: {
        type: DataTypes.DECIMAL,
        allowNull: false,
      },
      retailPrice: {
        type: DataTypes.DECIMAL,
        allowNull: false,
      },
      stok: {
        type: DataTypes.INTEGER,
      },
      typeProduct: {
        type: DataTypes.ENUM('inject', 'stok'),
        defaultValue: 'stok'
      },
      minimumStok: {
        type: DataTypes.INTEGER,
      },
      status: {
        type: DataTypes.ENUM("inactive", "active"),
        defaultValue: "active" 
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
        tableName: 'products'
    });

    Product.associate = (models) => {
        Product.belongsTo(models.Store, {
            foreignKey: 'storeId',
            as: 'store',
        });
        Product.belongsTo(models.Categorie, {
            foreignKey: 'categoryId',
            as: 'categorie',
        });
        Product.belongsTo(models.Brand, {
            foreignKey: 'brandId',
            as: 'brand',
        });
    };

    return Product;
}
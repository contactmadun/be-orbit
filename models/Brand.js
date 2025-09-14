module.exports = (sequelize, DataTypes) => {
    const Brand = sequelize.define('Brand', {
      id:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      storeId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
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
        tableName: 'brands'
    });

    Brand.associate = (models) => {
        Brand.belongsTo(models.Store, {
            foreignKey: 'storeId',
            as: 'store',
        });
    };

    return Brand;
}
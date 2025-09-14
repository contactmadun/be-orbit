module.exports = (sequelize, DataTypes) => {
    const Categorie = sequelize.define('Categorie', {
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
        tableName: 'categories'
    });

    Categorie.associate = (models) => {
        Categorie.belongsTo(models.Store, {
            foreignKey: 'storeId',
            as: 'store',
        });
    };

    return Categorie;
}
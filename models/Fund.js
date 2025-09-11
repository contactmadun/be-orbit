module.exports = (sequelize, DataTypes) => {
    const Fund = sequelize.define('Fund', {
      id:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      storeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
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
        tableName: 'fundsource'
    });

    Fund.associate = (models) => {
        Fund.belongsTo(models.Store, {
            foreignKey: 'storeId',
            as: 'store',
        });
    };

    return Fund;
}
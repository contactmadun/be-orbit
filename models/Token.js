module.exports = (sequelize, DataTypes) => {
    const Token = sequelize.define('Token', {
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
      daysAdded: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      source: {
        type: DataTypes.ENUM('manual', 'gateway'),
        allowNull: false
      },
      note: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
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
        tableName: 'tokens'
    });

    Token.associate = (models) => {
        Token.belongsTo(models.Store, {
            foreignKey: 'storeId',
            as: 'store',
        });
    };

    return Token;
}
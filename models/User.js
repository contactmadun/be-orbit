module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false, 
      },
      storeId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      phoneNumber: {
        type: DataTypes.INTEGER,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false
      },
      role: {
        type: DataTypes.ENUM('system_admin', 'super_admin', 'cashier'),
        defaultValue: 'super_admin',
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("inactive", "active"),
        defaultValue: "inactive" 
      },
      activationToken: {
        type: DataTypes.STRING,
        allowNull: true
      },
      resetToken: {
        type: DataTypes.STRING,
        allowNull: true
      },
      imageProfil: {
        type: DataTypes.STRING
      },
      expiresResetToken: {
        type: DataTypes.DATE,
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
        tableName: 'users'
    });

    User.associate = (models) => {
        User.belongsTo(models.Store, {
            foreignKey: 'storeId',
            as: 'store',
        });
    };

    return User;
}
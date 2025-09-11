'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.createTable('cashier_fund_balances', { 
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      cashierSessionId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'cashier_sessions',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      fundSourceId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'fundsource',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      openingBalance: {
        type: Sequelize.DECIMAL,
        allowNull: false,
      },
      currentBalance: {
        type: Sequelize.DECIMAL,
        allowNull: false,
      },
      closingBalance: {
        type: Sequelize.DECIMAL,
        allowNull: true,
      },
      variance: {
        type: Sequelize.DECIMAL,
        defaultValue: 0
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      }
      });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.dropTable('cashier_fund_balances');
  }
};

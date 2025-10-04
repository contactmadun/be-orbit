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
    await queryInterface.createTable('reports', { 
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      storeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'stores',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
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
      openedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      closedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      closingBalance: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      variance: {
        type: Sequelize.DECIMAL(12, 2),
      },
      totalTrx: {
        type: Sequelize.INTEGER
      },
      totalProfit: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false 
      },
      cashIn: {
        type: Sequelize.DECIMAL(12, 2),
      },
      cashOut: {
        type: Sequelize.DECIMAL(12, 2),
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
    await queryInterface.dropTable('reports');
  }
};

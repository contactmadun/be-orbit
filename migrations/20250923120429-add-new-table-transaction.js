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
    await queryInterface.createTable('transactions', {
      id: {
        type: Sequelize.BIGINT,
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
      cashier_session_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'cashier_sessions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      fund_source_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'fundsource',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      customer_name: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      customer_phone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      qty: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      cost_price: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      price: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      total: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      profit: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('success', 'void', 'bon'),
        allowNull: false,
        defaultValue: 'success'
      },
      transaction_type: {
        type: Sequelize.ENUM('manual', 'penjualan', 'transfer', 'tarik', 'jasa', 'grosir'),
        allowNull: false,
        defaultValue: 'penjualan'
      },
      note: {
        type: Sequelize.TEXT
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
    await queryInterface.dropTable('transactions');
  }
};

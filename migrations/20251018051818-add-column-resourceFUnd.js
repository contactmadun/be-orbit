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
    await queryInterface.addColumn(
        'transactions', // nama tabel
        'resourceFund', // nama kolom baru
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
          model: 'fundsource',
          key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          after: 'fund_source_id',
          },
      );
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};

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
        'brands', // nama tabel
        'storeId', // nama kolom baru
        {
          type: Sequelize.INTEGER,
          allowNull: false,
          after: 'id',
          references: {
          model: 'stores',
          key: 'id'
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
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
    await queryInterface.removeColumn('storeId');
  }
};

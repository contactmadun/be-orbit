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
        'products', // nama tabel
        'typeProduct', // nama kolom baru
        {
          type: Sequelize.ENUM('inject', 'stok'),
          allowNull: true,
          defaultValue: 'stok',
          after: 'retailPrice',
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

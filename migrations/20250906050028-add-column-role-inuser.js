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
      'users', // nama tabel
      'role', // nama kolom baru
      {
        type: Sequelize.ENUM('system_admin', 'super_admin', 'cashier'),
        defaultValue: 'super_admin',
        allowNull: false,
        after: 'password',
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
    await queryInterface.removeColumn('users', 'role');
  }
};

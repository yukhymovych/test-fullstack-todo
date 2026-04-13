/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.up = async (pgm) => {
  pgm.addColumn(
    'users',
    {
      ui_language: {
        type: 'varchar(5)',
        notNull: true,
        default: 'en',
      },
    },
    { ifNotExists: true }
  );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.down = async (pgm) => {
  pgm.dropColumn('users', 'ui_language', { ifExists: true });
};

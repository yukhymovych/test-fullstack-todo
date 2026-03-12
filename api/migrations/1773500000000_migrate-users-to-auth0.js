/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.up = async (pgm) => {
  pgm.sql('TRUNCATE users CASCADE');

  pgm.dropColumn('users', 'password_hash', { ifExists: true });
  pgm.dropColumn('users', 'username', { ifExists: true });

  pgm.addColumn('users', {
    auth0_sub: {
      type: 'text',
      notNull: true,
      unique: true,
    },
    email: {
      type: 'text',
      notNull: false,
    },
    name: {
      type: 'text',
      notNull: false,
    },
  }, { ifNotExists: true });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.down = async (pgm) => {
  pgm.dropColumn('users', 'auth0_sub', { ifExists: true });
  pgm.dropColumn('users', 'email', { ifExists: true });
  pgm.dropColumn('users', 'name', { ifExists: true });

  pgm.addColumn('users', {
    username: {
      type: 'varchar(32)',
      notNull: true,
      unique: true,
      default: 'deleted_user',
    },
    password_hash: {
      type: 'text',
      notNull: true,
      default: '',
    },
  }, { ifNotExists: true });
};

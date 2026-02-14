/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = async (pgm) => {
  pgm.createTable('users', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    username: {
      type: 'varchar(32)',
      notNull: true,
      unique: true,
    },
    password_hash: {
      type: 'text',
      notNull: true,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  }, { ifNotExists: true });

  // username unique is part of createTable columns definition above

  // Add user_id to todos - for existing rows, create a migration placeholder user
  const defaultUserId = '00000000-0000-0000-0000-000000000001';
  pgm.sql(`
    INSERT INTO users (id, username, password_hash)
    VALUES ('${defaultUserId}', '__migration_placeholder__', 'unused')
    ON CONFLICT DO NOTHING
  `);

  pgm.addColumns('todos', {
    user_id: {
      type: 'uuid',
      notNull: true,
      default: defaultUserId,
      references: 'users',
      onDelete: 'CASCADE',
    },
  }, { ifNotExists: true });

  pgm.sql('ALTER TABLE todos ALTER COLUMN user_id DROP DEFAULT');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = async (pgm) => {
  pgm.dropColumns('todos', ['user_id']);
  pgm.dropTable('users');
};

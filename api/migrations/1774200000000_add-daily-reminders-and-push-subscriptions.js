/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.up = async (pgm) => {
  pgm.addColumn(
    'users',
    {
      daily_reminders_enabled: {
        type: 'boolean',
        notNull: true,
        default: false,
      },
    },
    { ifNotExists: true }
  );

  pgm.createTable(
    'push_subscriptions',
    {
      id: {
        type: 'uuid',
        primaryKey: true,
        default: pgm.func('gen_random_uuid()'),
      },
      user_id: {
        type: 'uuid',
        notNull: true,
        references: 'users',
        onDelete: 'CASCADE',
      },
      endpoint: {
        type: 'text',
        notNull: true,
      },
      p256dh: {
        type: 'text',
        notNull: true,
      },
      auth: {
        type: 'text',
        notNull: true,
      },
      expiration_time: {
        type: 'timestamptz',
        notNull: false,
      },
      user_agent: {
        type: 'text',
        notNull: false,
      },
      is_active: {
        type: 'boolean',
        notNull: true,
        default: true,
      },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('NOW()'),
      },
      updated_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('NOW()'),
      },
    },
    { ifNotExists: true }
  );

  pgm.addConstraint('push_subscriptions', 'push_subscriptions_endpoint_unique', {
    unique: ['endpoint'],
  });
  pgm.createIndex('push_subscriptions', ['user_id']);
  pgm.createIndex('push_subscriptions', ['user_id', 'is_active']);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.down = async (pgm) => {
  pgm.dropTable('push_subscriptions', { ifExists: true });
  pgm.dropColumn('users', 'daily_reminders_enabled', { ifExists: true });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.up = async (pgm) => {
  pgm.addColumn(
    'users',
    {
      daily_reminder_time_local: {
        type: 'varchar(5)',
        notNull: true,
        default: '09:00',
      },
      last_daily_reminder_sent_day_key: {
        type: 'varchar(10)',
        notNull: false,
      },
      last_daily_reminder_sent_at: {
        type: 'timestamptz',
        notNull: false,
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
  pgm.dropColumn('users', 'daily_reminder_time_local', { ifExists: true });
  pgm.dropColumn('users', 'last_daily_reminder_sent_day_key', { ifExists: true });
  pgm.dropColumn('users', 'last_daily_reminder_sent_at', { ifExists: true });
};

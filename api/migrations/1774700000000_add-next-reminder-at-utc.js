/**
 * Stores the next cron-driven reminder instant in UTC (timezone-aware computation in application code).
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */

exports.up = async (pgm) => {
  pgm.addColumn(
    'users',
    {
      next_reminder_at_utc: {
        type: 'timestamptz',
        notNull: false,
      },
    },
    { ifNotExists: true }
  );

  pgm.createIndex(
    'users',
    ['next_reminder_at_utc'],
    {
      ifNotExists: true,
      name: 'idx_users_next_reminder_at_utc',
      where:
        'daily_reminders_enabled = true AND next_reminder_at_utc IS NOT NULL',
    }
  );
};

exports.down = async (pgm) => {
  pgm.dropIndex('users', ['next_reminder_at_utc'], {
    ifExists: true,
    name: 'idx_users_next_reminder_at_utc',
  });
  pgm.dropColumn('users', 'next_reminder_at_utc', { ifExists: true });
};

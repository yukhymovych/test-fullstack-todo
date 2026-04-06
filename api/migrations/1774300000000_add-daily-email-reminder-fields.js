/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.up = async (pgm) => {
  pgm.addColumn(
    'users',
    {
      daily_email_reminders_enabled: {
        type: 'boolean',
        notNull: true,
        default: false,
      },
      last_daily_email_reminder_sent_at: {
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
  pgm.dropColumn('users', 'daily_email_reminders_enabled', { ifExists: true });
  pgm.dropColumn('users', 'last_daily_email_reminder_sent_at', { ifExists: true });
};

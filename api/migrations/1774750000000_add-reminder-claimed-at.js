/**
 * Tracks when a reminder send was claimed; used to release stuck claims after a timeout.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = async (pgm) => {
  pgm.addColumn(
    'users',
    {
      reminder_claimed_at: {
        type: 'timestamptz',
        notNull: false,
      },
    },
    { ifNotExists: true }
  );
};

exports.down = async (pgm) => {
  pgm.dropColumn('users', 'reminder_claimed_at', { ifExists: true });
};

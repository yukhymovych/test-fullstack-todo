/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = async (pgm) => {
  pgm.addColumn('study_items', {
    stability_days: {
      type: 'real',
      notNull: true,
      default: 7,
    },
    difficulty: {
      type: 'real',
      notNull: true,
      default: 5,
    },
  });

  pgm.addColumn('review_logs', {
    elapsed_days: {
      type: 'integer',
      notNull: false,
    },
    stability_before: {
      type: 'real',
      notNull: false,
    },
    difficulty_before: {
      type: 'real',
      notNull: false,
    },
    stability_after: {
      type: 'real',
      notNull: false,
    },
    difficulty_after: {
      type: 'real',
      notNull: false,
    },
    due_before: {
      type: 'timestamptz',
      notNull: false,
    },
    due_after: {
      type: 'timestamptz',
      notNull: false,
    },
    review_day_key: {
      type: 'text',
      notNull: false,
    },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = async (pgm) => {
  pgm.dropColumn('review_logs', [
    'elapsed_days',
    'stability_before',
    'difficulty_before',
    'stability_after',
    'difficulty_after',
    'due_before',
    'due_after',
    'review_day_key',
  ]);
  pgm.dropColumn('study_items', ['stability_days', 'difficulty']);
};

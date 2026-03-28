/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = async (pgm) => {
  pgm.addColumn(
    'notes',
    {
      trashed_at: {
        type: 'timestamptz',
        notNull: false,
      },
      trashed_root_id: {
        type: 'uuid',
        notNull: false,
      },
    },
    { ifNotExists: true }
  );

  pgm.createIndex('notes', ['user_id', 'trashed_at'], {
    ifNotExists: true,
    name: 'notes_user_trashed_at_idx',
  });
  pgm.createIndex('notes', ['user_id', 'trashed_root_id'], {
    ifNotExists: true,
    name: 'notes_user_trashed_root_idx',
  });
  pgm.createIndex('notes', ['user_id', 'parent_id', 'trashed_at'], {
    ifNotExists: true,
    name: 'notes_user_parent_trashed_idx',
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = async (pgm) => {
  pgm.dropIndex('notes', ['user_id', 'parent_id', 'trashed_at'], {
    ifExists: true,
    name: 'notes_user_parent_trashed_idx',
  });
  pgm.dropIndex('notes', ['user_id', 'trashed_root_id'], {
    ifExists: true,
    name: 'notes_user_trashed_root_idx',
  });
  pgm.dropIndex('notes', ['user_id', 'trashed_at'], {
    ifExists: true,
    name: 'notes_user_trashed_at_idx',
  });
  pgm.dropColumn('notes', 'trashed_root_id', { ifExists: true });
  pgm.dropColumn('notes', 'trashed_at', { ifExists: true });
};

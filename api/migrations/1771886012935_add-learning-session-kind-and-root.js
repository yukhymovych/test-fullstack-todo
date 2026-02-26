/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = async (pgm) => {
  pgm.addColumn('learning_sessions', {
    kind: {
      type: 'varchar(20)',
      notNull: false,
      default: 'global',
    },
    root_note_id: {
      type: 'uuid',
      notNull: false,
      references: 'notes',
      onDelete: 'SET NULL',
    },
  }, { ifNotExists: true });

  await pgm.sql(`
    UPDATE learning_sessions
    SET kind = 'global', root_note_id = NULL
    WHERE kind IS NULL
  `);

  pgm.alterColumn('learning_sessions', 'kind', {
    notNull: true,
    default: 'global',
  });

  pgm.dropIndex('learning_sessions', ['user_id', 'day_key'], {
    ifExists: true,
    name: 'learning_sessions_user_day_unique',
  });

  pgm.createIndex('learning_sessions', ['user_id', 'day_key'], {
    unique: true,
    where: "kind = 'global'",
    ifNotExists: true,
    name: 'learning_sessions_global_user_day_unique',
  });

  pgm.createIndex('learning_sessions', ['user_id', 'day_key', 'root_note_id'], {
    unique: true,
    where: "kind = 'scoped'",
    ifNotExists: true,
    name: 'learning_sessions_scoped_user_day_root_unique',
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = async (pgm) => {
  pgm.dropIndex('learning_sessions', ['user_id', 'day_key', 'root_note_id'], {
    ifExists: true,
    name: 'learning_sessions_scoped_user_day_root_unique',
  });
  pgm.dropIndex('learning_sessions', ['user_id', 'day_key'], {
    ifExists: true,
    name: 'learning_sessions_global_user_day_unique',
  });
  pgm.createIndex('learning_sessions', ['user_id', 'day_key'], {
    unique: true,
    ifNotExists: true,
    name: 'learning_sessions_user_day_unique',
  });
  pgm.dropColumn('learning_sessions', 'kind', { ifExists: true });
  pgm.dropColumn('learning_sessions', 'root_note_id', { ifExists: true });
};

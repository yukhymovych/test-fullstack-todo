/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = async (pgm) => {
  pgm.addColumn('learning_sessions', {
    scoped_mode: {
      type: 'varchar(20)',
      notNull: false,
    },
  }, { ifNotExists: true });

  await pgm.sql(`
    UPDATE learning_sessions
    SET scoped_mode = 'due_only'
    WHERE kind = 'scoped' AND scoped_mode IS NULL
  `);

  pgm.dropIndex('learning_sessions', ['user_id', 'day_key', 'root_note_id'], {
    ifExists: true,
    name: 'learning_sessions_scoped_user_day_root_unique',
  });

  pgm.createIndex('learning_sessions', ['user_id', 'day_key', 'root_note_id', 'scoped_mode'], {
    unique: true,
    where: "kind = 'scoped'",
    ifNotExists: true,
    name: 'learning_sessions_scoped_user_day_root_mode_unique',
  });

  await pgm.sql(`
    ALTER TABLE learning_sessions
    ADD CONSTRAINT learning_sessions_scoped_mode_valid
    CHECK (
      (kind = 'scoped' AND scoped_mode IN ('deep_dive', 'due_only'))
      OR (kind <> 'scoped' AND scoped_mode IS NULL)
    )
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = async (pgm) => {
  await pgm.sql(`
    ALTER TABLE learning_sessions
    DROP CONSTRAINT IF EXISTS learning_sessions_scoped_mode_valid
  `);

  pgm.dropIndex('learning_sessions', ['user_id', 'day_key', 'root_note_id', 'scoped_mode'], {
    ifExists: true,
    name: 'learning_sessions_scoped_user_day_root_mode_unique',
  });

  pgm.createIndex('learning_sessions', ['user_id', 'day_key', 'root_note_id'], {
    unique: true,
    where: "kind = 'scoped'",
    ifNotExists: true,
    name: 'learning_sessions_scoped_user_day_root_unique',
  });

  pgm.dropColumn('learning_sessions', 'scoped_mode', { ifExists: true });
};

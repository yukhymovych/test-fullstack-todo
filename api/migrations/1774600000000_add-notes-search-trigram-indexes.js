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
  await pgm.sql('CREATE EXTENSION IF NOT EXISTS pg_trgm');
  await pgm.sql(`
    CREATE INDEX IF NOT EXISTS notes_title_trgm_idx
    ON notes
    USING GIN (title gin_trgm_ops)
  `);
  await pgm.sql(`
    CREATE INDEX IF NOT EXISTS notes_content_text_trgm_idx
    ON notes
    USING GIN (content_text gin_trgm_ops)
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = async (pgm) => {
  await pgm.sql('DROP INDEX IF EXISTS notes_content_text_trgm_idx');
  await pgm.sql('DROP INDEX IF EXISTS notes_title_trgm_idx');
};

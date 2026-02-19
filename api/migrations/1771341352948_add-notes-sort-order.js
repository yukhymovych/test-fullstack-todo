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
      sort_order: {
        type: 'integer',
        notNull: true,
        default: 0,
      },
    },
    { ifNotExists: true }
  );

  // Backfill: assign sort_order by updated_at DESC within each parent
  await pgm.sql(`
    WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY parent_id ORDER BY updated_at DESC) - 1 AS rn
      FROM notes
    )
    UPDATE notes n
    SET sort_order = r.rn
    FROM ranked r
    WHERE n.id = r.id
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = async (pgm) => {
  pgm.dropColumn('notes', 'sort_order', { ifExists: true });
};

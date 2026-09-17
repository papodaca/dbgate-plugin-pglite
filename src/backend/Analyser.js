const { DatabaseAnalyser } = require('dbgate-tools');

const SKIP_SCHEMAS = `('pg_catalog', 'information_schema', 'pg_toast')`;

class Analyser extends DatabaseAnalyser {
  constructor(dbhan, driver, version) {
    super(dbhan, driver, version);
  }

  async _computeSingleObjectId() {
    const { schemaName, pureName } = this.singleObjectFilter;
    this.singleObjectId = `${schemaName || 'public'}.${pureName}`;
  }

  async _runAnalysis() {
    this.feedback({ analysingMessage: 'Loading tables' });

    const tablesResult = await this.driver.query(
      this.dbhan,
      `SELECT table_schema AS "schemaName", table_name AS "pureName"
       FROM information_schema.tables
       WHERE table_type = 'BASE TABLE'
         AND table_schema NOT IN ${SKIP_SCHEMAS}
       ORDER BY table_schema, table_name`
    );

    const viewsResult = await this.driver.query(
      this.dbhan,
      `SELECT table_schema AS "schemaName", table_name AS "pureName"
       FROM information_schema.views
       WHERE table_schema NOT IN ${SKIP_SCHEMAS}
       ORDER BY table_schema, table_name`
    );

    this.feedback({ analysingMessage: 'Loading columns' });

    const columnsResult = await this.driver.query(
      this.dbhan,
      `SELECT
         table_schema AS "schemaName",
         table_name AS "pureName",
         column_name AS "columnName",
         data_type AS "dataType",
         is_nullable AS "isNullable",
         column_default AS "defaultValue",
         ordinal_position AS "ordinalPosition"
       FROM information_schema.columns
       WHERE table_schema NOT IN ${SKIP_SCHEMAS}
       ORDER BY table_schema, table_name, ordinal_position`
    );

    this.feedback({ analysingMessage: 'Loading keys' });

    const pkResult = await this.driver.query(
      this.dbhan,
      `SELECT
         tc.table_schema AS "schemaName",
         tc.table_name AS "pureName",
         kcu.column_name AS "columnName",
         kcu.ordinal_position AS "ordinalPosition"
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
       WHERE tc.constraint_type = 'PRIMARY KEY'
         AND tc.table_schema NOT IN ${SKIP_SCHEMAS}
       ORDER BY tc.table_schema, tc.table_name, kcu.ordinal_position`
    );

    this.feedback({ analysingMessage: null });

    const columns = (columnsResult.rows || []).map(row => ({
      ...row,
      notNull: row.isNullable === 'NO',
    }));

    const primaryKeysByTable = new Map();
    for (const row of pkResult.rows || []) {
      const key = `${row.schemaName}.${row.pureName}`;
      if (!primaryKeysByTable.has(key)) {
        primaryKeysByTable.set(key, {
          constraintName: `PK_${row.pureName}`,
          schemaName: row.schemaName,
          pureName: row.pureName,
          columns: [],
        });
      }
      primaryKeysByTable.get(key).columns.push({ columnName: row.columnName });
    }

    const tables = (tablesResult.rows || []).map(table => ({
      objectId: `${table.schemaName}.${table.pureName}`,
      schemaName: table.schemaName,
      pureName: table.pureName,
      columns: columns.filter(col => col.pureName == table.pureName && col.schemaName == table.schemaName),
      primaryKey: primaryKeysByTable.get(`${table.schemaName}.${table.pureName}`) || undefined,
    }));

    const views = (viewsResult.rows || []).map(view => ({
      objectId: `${view.schemaName}.${view.pureName}`,
      schemaName: view.schemaName,
      pureName: view.pureName,
      columns: columns.filter(col => col.pureName == view.pureName && col.schemaName == view.schemaName),
    }));

    const schemaNames = new Set();
    for (const table of tables) {
      if (table.schemaName) schemaNames.add(table.schemaName);
    }
    for (const view of views) {
      if (view.schemaName) schemaNames.add(view.schemaName);
    }

    return {
      schemas: [...schemaNames].sort().map(schemaName => ({ schemaName })),
      tables,
      views,
    };
  }
}

module.exports = Analyser;

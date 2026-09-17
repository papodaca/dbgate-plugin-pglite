const { DatabaseAnalyser } = require('dbgate-tools');

const SKIP_SCHEMAS = `('pg_catalog', 'information_schema', 'pg_toast')`;

function splitVector(value) {
  if (value == null || value === '') return [];
  if (Array.isArray(value)) return value.map(v => String(v));
  return String(value).trim().split(/\s+/).filter(Boolean);
}

function groupBy(rows, keyFn) {
  const map = new Map();
  for (const row of rows || []) {
    const key = keyFn(row);
    let list = map.get(key);
    if (!list) {
      list = [];
      map.set(key, list);
    }
    list.push(row);
  }
  return map;
}

function tableKey(schemaName, pureName) {
  return `${schemaName}.${pureName}`;
}

function indexColumns(idx, indexcolsByOidAttnum, withDescending) {
  const options = splitVector(idx.indoption);
  return splitVector(idx.indkey)
    .map((colid, colIndex) => {
      const col = indexcolsByOidAttnum.get(`${idx.oid}_${colid}`);
      if (!col) return null;
      const column = { columnName: col.columnName };
      if (withDescending) {
        column.isDescending = parseInt(options[colIndex], 10) > 0;
      }
      return column;
    })
    .filter(Boolean);
}

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

    const [pkResult, fkResult, uniqueResult, indexesResult, indexcolsResult] = await Promise.all([
      this.driver.query(
        this.dbhan,
        `SELECT
           n.nspname AS "schemaName",
           t.relname AS "pureName",
           c.conname AS "constraintName",
           a.attname AS "columnName"
         FROM pg_catalog.pg_constraint c
         JOIN pg_catalog.pg_class t ON t.oid = c.conrelid
         JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
         JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS cols(attnum, ordinal_position) ON TRUE
         JOIN pg_catalog.pg_attribute a ON a.attrelid = t.oid AND a.attnum = cols.attnum
         WHERE c.contype = 'p'
           AND n.nspname NOT IN ${SKIP_SCHEMAS}
         ORDER BY n.nspname, t.relname, cols.ordinal_position`
      ),
      this.driver.query(
        this.dbhan,
        `SELECT
           nsp.nspname AS "schemaName",
           rel.relname AS "pureName",
           con.conname AS "constraintName",
           nsp2.nspname AS "refSchemaName",
           rel2.relname AS "refTableName",
           att.attname AS "columnName",
           att2.attname AS "refColumnName",
           CASE con.confupdtype
             WHEN 'a' THEN 'NO ACTION'
             WHEN 'r' THEN 'RESTRICT'
             WHEN 'c' THEN 'CASCADE'
             WHEN 'n' THEN 'SET NULL'
             WHEN 'd' THEN 'SET DEFAULT'
             ELSE con.confupdtype::text
           END AS "updateAction",
           CASE con.confdeltype
             WHEN 'a' THEN 'NO ACTION'
             WHEN 'r' THEN 'RESTRICT'
             WHEN 'c' THEN 'CASCADE'
             WHEN 'n' THEN 'SET NULL'
             WHEN 'd' THEN 'SET DEFAULT'
             ELSE con.confdeltype::text
           END AS "deleteAction"
         FROM pg_constraint con
         JOIN pg_class rel ON rel.oid = con.conrelid
         JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
         JOIN pg_class rel2 ON rel2.oid = con.confrelid
         JOIN pg_namespace nsp2 ON nsp2.oid = rel2.relnamespace
         JOIN LATERAL unnest(con.conkey, con.confkey) WITH ORDINALITY AS cols(attnum, ref_attnum, ordinal_position) ON TRUE
         JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = cols.attnum
         JOIN pg_attribute att2 ON att2.attrelid = con.confrelid AND att2.attnum = cols.ref_attnum
         WHERE con.contype = 'f'
           AND nsp.nspname NOT IN ${SKIP_SCHEMAS}
         ORDER BY con.conname, cols.ordinal_position`
      ),
      this.driver.query(
        this.dbhan,
        `SELECT cnt.conname AS "constraintName"
         FROM pg_constraint cnt
         JOIN pg_namespace n ON n.oid = cnt.connamespace
         WHERE cnt.contype = 'u'
           AND n.nspname NOT IN ${SKIP_SCHEMAS}`
      ),
      this.driver.query(
        this.dbhan,
        `SELECT
           t.relname AS "pureName",
           c.nspname AS "schemaName",
           i.relname AS "indexName",
           ix.indisunique AS "isUnique",
           ix.indkey AS "indkey",
           ix.indoption AS "indoption",
           t.oid AS "oid"
         FROM pg_class t
         JOIN pg_index ix ON t.oid = ix.indrelid
         JOIN pg_class i ON i.oid = ix.indexrelid
         JOIN pg_namespace c ON t.relnamespace = c.oid
         WHERE t.relkind = 'r'
           AND ix.indisprimary = false
           AND c.nspname NOT IN ${SKIP_SCHEMAS}
         ORDER BY t.relname, i.relname`
      ),
      this.driver.query(
        this.dbhan,
        `SELECT
           a.attname AS "columnName",
           a.attnum AS "attnum",
           a.attrelid AS "oid"
         FROM pg_class t
         JOIN pg_index ix ON t.oid = ix.indrelid
         JOIN pg_class i ON i.oid = ix.indexrelid
         JOIN pg_namespace c ON t.relnamespace = c.oid
         JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (ix.indkey)
         WHERE t.relkind = 'r'
           AND ix.indisprimary = false
           AND c.nspname NOT IN ${SKIP_SCHEMAS}`
      ),
    ]);

    this.feedback({ analysingMessage: null });

    const columns = (columnsResult.rows || []).map(row => ({
      ...row,
      notNull: row.isNullable === 'NO',
    }));
    const columnsByTable = groupBy(columns, col => tableKey(col.schemaName, col.pureName));
    const uniqueNameSet = new Set((uniqueResult.rows || []).map(row => row.constraintName));
    const indexesByTable = groupBy(indexesResult.rows || [], idx => tableKey(idx.schemaName, idx.pureName));
    const indexcolsByOidAttnum = new Map(
      (indexcolsResult.rows || []).map(col => [`${col.oid}_${col.attnum}`, col])
    );

    const tables = (tablesResult.rows || []).map(table => {
      const key = tableKey(table.schemaName, table.pureName);
      const tableIndexes = indexesByTable.get(key) || [];
      return {
        objectId: key,
        schemaName: table.schemaName,
        pureName: table.pureName,
        columns: columnsByTable.get(key) || [],
        primaryKey: DatabaseAnalyser.extractPrimaryKeys(table, pkResult.rows || []),
        foreignKeys: DatabaseAnalyser.extractForeignKeys(table, fkResult.rows || []),
        indexes: tableIndexes
          .filter(idx => !uniqueNameSet.has(idx.indexName))
          .map(idx => ({
            constraintName: idx.indexName,
            isUnique: !!idx.isUnique,
            columns: indexColumns(idx, indexcolsByOidAttnum, true),
          })),
        uniques: tableIndexes
          .filter(idx => uniqueNameSet.has(idx.indexName))
          .map(idx => ({
            constraintName: idx.indexName,
            columns: indexColumns(idx, indexcolsByOidAttnum, false),
          })),
      };
    });

    const views = (viewsResult.rows || []).map(view => ({
      objectId: tableKey(view.schemaName, view.pureName),
      schemaName: view.schemaName,
      pureName: view.pureName,
      columns: columnsByTable.get(tableKey(view.schemaName, view.pureName)) || [],
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

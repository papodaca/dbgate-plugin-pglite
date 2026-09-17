const { driverBase } = (global.DBGATE_PACKAGES && global.DBGATE_PACKAGES['dbgate-tools']) || require('dbgate-tools');
const Dumper = require('./Dumper');
const { postgreSplitterOptions, noSplitSplitterOptions } = require('dbgate-query-splitter/lib/options');
const { getDatabaseFileLabel, stripDataDirFile } = require('../shared/dataDir');

/** @type {import('dbgate-types').SqlDialect} */
const dialect = {
  rangeSelect: true,
  limitSelect: true,
  offsetFetchRangeSyntax: true,
  ilike: true,
  defaultSchemaName: 'public',
  multipleSchema: true,
  stringEscapeChar: "'",
  fallbackDataType: 'varchar',
  anonymousPrimaryKey: false,
  enableConstraintsPerTable: true,
  dropColumnDependencies: ['dependencies'],
  quoteIdentifier(s) {
    return '"' + s + '"';
  },
  stringAgg: true,
  createColumn: true,
  dropColumn: true,
  changeColumn: true,
  createIndex: true,
  dropIndex: true,
  createForeignKey: true,
  dropForeignKey: true,
  createPrimaryKey: true,
  dropPrimaryKey: true,
  createUnique: true,
  dropUnique: true,
  createCheck: true,
  dropCheck: true,
  allowMultipleValuesInsert: true,
  renameSqlObject: true,
  filteredIndexes: true,
  dropReferencesWhenDropTable: true,
  requireStandaloneSelectForScopeIdentity: true,
  predefinedDataTypes: [
    'bigint',
    'bigserial',
    'boolean',
    'bytea',
    'char(20)',
    'varchar(250)',
    'date',
    'double precision',
    'int',
    'interval',
    'json',
    'jsonb',
    'numeric(10,2)',
    'real',
    'smallint',
    'serial',
    'text',
    'time',
    'timestamp',
    'timestamptz',
    'uuid',
  ],
};

/** @type {import('dbgate-types').EngineDriver} */
const driver = {
  ...driverBase,
  dumperClass: Dumper,
  dialect,
  engine: 'pglite@dbgate-plugin-pglite',
  title: 'PGlite',
  readOnlySessions: false,
  supportsTransactions: true,
  singleConnectionOnly: true,
  isolationLevels: ['READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE'],
  defaultIsolationLevel: 'READ COMMITTED',

  getQuerySplitterOptions: usage =>
    usage == 'editor'
      ? { ...postgreSplitterOptions, ignoreComments: true, preventSingleLineSplit: true }
      : usage == 'stream'
        ? noSplitSplitterOptions
        : postgreSplitterOptions,

  showConnectionTab: () => false,
  showConnectionField: field => ['databaseFile'].includes(field),
  beforeConnectionSave: connection => {
    const databaseFile = stripDataDirFile(connection.databaseFile);
    return {
      ...connection,
      databaseFile,
      singleDatabase: true,
      defaultDatabase: getDatabaseFileLabel(databaseFile),
    };
  },

  getNewObjectTemplates() {
    return [
      { label: 'New view', sql: 'CREATE VIEW myview\nAS\nSELECT * FROM table1' },
      {
        label: 'New function (plpgsql)',
        sql: `CREATE FUNCTION myfunc (arg1 INT)
RETURNS INT
AS $$
BEGIN
  RETURN 1;
END
$$ LANGUAGE plpgsql;`,
      },
    ];
  },
};

module.exports = driver;

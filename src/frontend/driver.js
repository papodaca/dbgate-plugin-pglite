const { driverBase } = (global.DBGATE_PACKAGES && global.DBGATE_PACKAGES['dbgate-tools']) || require('dbgate-tools');
const Dumper = require('./Dumper');
const { postgreSplitterOptions, noSplitSplitterOptions } = require('dbgate-query-splitter/lib/options');
const { getDatabaseFileLabel, isMemoryDataDir, stripDataDirFile } = require('../shared/dataDir');
const { EXTENSIONS, extensionFieldName, extensionFieldValues } = require('../shared/extensions');
const pgliteIcon = require('./icon');

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
  icon: pgliteIcon,
  readOnlySessions: false,
  supportsTransactions: true,
  singleConnectionOnly: true,
  supportedCreateDatabase: false,
  supportsNodejsBackup: true,
  supportsNodejsRestore: true,
  nodejsBackupTool: 'pglite-tools',
  nodejsRestoreTool: 'pglite-tools',
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
  getAdvancedConnectionFields: () =>
    EXTENSIONS.map(ext => ({
      type: 'checkbox',
      name: extensionFieldName(ext.id),
      label: ext.label,
      default: false,
    })),
  beforeConnectionSave: connection => {
    const databaseFile = stripDataDirFile(connection.databaseFile);
    const isMemory = isMemoryDataDir(databaseFile);
    return {
      ...connection,
      ...extensionFieldValues(connection),
      databaseFile,
      singleDatabase: isMemory,
      defaultDatabase: isMemory ? getDatabaseFileLabel(databaseFile) : 'postgres',
    };
  },

  getNativeOperationFormArgs(operation) {
    if (operation != 'backup') return null;
    return [
      {
        type: 'checkbox',
        label: 'Dump only data (without structure)',
        name: 'dataOnly',
        default: false,
        disabledFn: values => values.schemaOnly,
      },
      {
        type: 'checkbox',
        label: 'Dump schema only (no data)',
        name: 'schemaOnly',
        default: false,
        disabledFn: values => values.dataOnly,
      },
      {
        type: 'checkbox',
        label: 'Do not output commands to set ownership of objects',
        name: 'noOwner',
        default: true,
      },
      {
        type: 'checkbox',
        label: 'Prevent dumping of access privileges (grant/revoke)',
        name: 'noPrivileges',
        default: true,
      },
    ];
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

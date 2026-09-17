const fs = require('fs');
const os = require('os');
const path = require('path');
const stream = require('stream');
const { createBulkInsertStreamBase } = require('dbgate-tools');
const driverBase = require('../frontend/driver');
const Analyser = require('./Analyser');
const { getDatabaseFileLabel, stripDataDirFile } = require('../shared/dataDir');
const { extensionsForOpen, loadExtensionMap } = require('./loadExtensions');

function isPostgresDataDir(dir) {
  return fs.existsSync(path.join(dir, 'PG_VERSION')) && fs.existsSync(path.join(dir, 'base'));
}

function resolveDataDir(databaseFile) {
  if (!databaseFile || databaseFile === 'memory' || databaseFile === 'memory://') {
    return undefined;
  }

  let dir = stripDataDirFile(databaseFile);

  try {
    const stat = fs.statSync(dir);
    if (stat.isFile()) {
      dir = path.dirname(dir);
    }
  } catch {
    return dir;
  }

  const nested = path.join(dir, 'pgdata');
  if (isPostgresDataDir(nested)) {
    return nested;
  }

  return dir;
}

function columnsFromFields(fields) {
  return (fields || []).map(field => ({
    columnName: field.name,
  }));
}

function ensureFileCtor() {
  if (typeof File !== 'undefined') return;
  const { Blob } = require('buffer');
  globalThis.File = class File extends Blob {
    constructor(bits, name, options = {}) {
      super(bits, options);
      this.name = name;
      this.lastModified = options.lastModified || Date.now();
    }
  };
}

function pgDumpArgs(settings) {
  const { selectedTables = [], skippedTables = [], options = {} } = settings;
  if (options.dataOnly && options.schemaOnly) {
    throw new Error('Data-only and schema-only backup options cannot be enabled together');
  }

  const args = [];
  if (options.dataOnly) args.push('--data-only');
  if (options.schemaOnly) args.push('--schema-only');
  if (options.noPrivileges) args.push('--no-privileges');
  if (options.noOwner) args.push('--no-owner');
  if (skippedTables.length > 0) {
    for (const table of selectedTables) {
      const ident = table.schemaName ? `${table.schemaName}.${table.pureName}` : table.pureName;
      args.push(`--table=${ident}`);
    }
  }
  return args;
}

function copyDataDirSnapshot(dataDir) {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'pglite-dump-'));
  fs.cpSync(dataDir, dest, { recursive: true });
  return dest;
}

function pgliteDatabaseName(connection) {
  const name = connection.database;
  if (!name || name === 'memory') return undefined;
  const label = getDatabaseFileLabel(connection.databaseFile);
  if (label && name === label) return undefined;
  return name;
}

/** @type {import('dbgate-types').EngineDriver} */
const driver = {
  ...driverBase,
  analyserClass: Analyser,

  async connect(connection) {
    const { PGlite } = require('@electric-sql/pglite');
    const dataDir = resolveDataDir(connection.databaseFile);
    const options = {};

    try {
      const selected = extensionsForOpen(connection, dataDir);
      options.extensions = loadExtensionMap(selected);
      if (selected.some(ext => ext.id === 'icu')) {
        options.icuDataDir = await require('@electric-sql/pglite-icu-full').icuDataDir();
      }
      const database = pgliteDatabaseName(connection);
      if (database) {
        options.database = database;
      }
      const client = dataDir ? await PGlite.create(dataDir, options) : await PGlite.create(options);
      for (const ext of selected) {
        if (!ext.sqlName) continue;
        await client.exec(`CREATE EXTENSION IF NOT EXISTS "${ext.sqlName}"`);
      }
      return { client };
    } catch (error) {
      const hint = dataDir ? ` (${dataDir})` : '';
      throw new Error(`PGlite failed to open${hint}: ${error.message}`);
    }
  },

  async close(dbhan) {
    if (dbhan?.client) {
      await dbhan.client.close();
    }
  },

  async query(dbhan, sql) {
    const result = await dbhan.client.query(sql);
    return {
      rows: result.rows || [],
      columns: columnsFromFields(result.fields),
    };
  },

  async stream(dbhan, sql, options) {
    try {
      const results = await dbhan.client.exec(sql);
      for (const result of results || []) {
        if (result.fields && result.fields.length) {
          options.recordset(columnsFromFields(result.fields));
          for (const row of result.rows || []) {
            options.row(row);
          }
        }
      }
      options.done();
    } catch (error) {
      options.info({
        message: error.message,
        line: 0,
        time: new Date(),
        severity: 'error',
      });
      options.done();
    }
  },

  async script(dbhan, sql) {
    await dbhan.client.exec(sql);
  },

  async readQuery(dbhan, sql, structure) {
    const pass = new stream.PassThrough({
      objectMode: true,
      highWaterMark: 100,
    });

    (async () => {
      try {
        const result = await dbhan.client.query(sql);
        pass.write({
          __isStreamHeader: true,
          ...(structure || {
            columns: columnsFromFields(result.fields),
          }),
        });
        for (const row of result.rows || []) {
          pass.write(row);
        }
      } catch (error) {
        pass.write({
          __isStreamInfo: true,
          info: {
            message: error.message,
            line: 0,
            time: new Date(),
            severity: 'error',
          },
        });
      } finally {
        pass.end();
      }
    })();

    return pass;
  },

  async writeTable(dbhan, name, options) {
    return createBulkInsertStreamBase(this, stream, dbhan, name, options);
  },

  async getVersion(dbhan) {
    const { rows } = await this.query(dbhan, 'SELECT version() AS version');
    const version = rows?.[0]?.version || 'unknown';
    const m = String(version).match(/PostgreSQL\s+(\d+)(?:\.(\d+))?/i);
    return {
      version,
      versionText: `PGlite (${version})`,
      versionMajor: m ? Number(m[1]) : undefined,
      versionMinor: m ? Number(m[2] || 0) : undefined,
    };
  },

  async listDatabases(dbhan) {
    const { rows } = await this.query(
      dbhan,
      `SELECT datname AS name
       FROM pg_database
       WHERE datistemplate = false
       ORDER BY datname`
    );
    return rows;
  },

  async backupDatabase(connection, settings, runner) {
    const { outputFile } = settings;
    const args = pgDumpArgs(settings);
    ensureFileCtor();

    const dataDir = resolveDataDir(connection.databaseFile);
    let dbhan;
    let snapshotDir;
    try {
      try {
        dbhan = await this.connect(connection);
      } catch (error) {
        if (!dataDir) throw error;
        runner.info({
          message: `Could not open data directory while it is in use, dumping a filesystem snapshot (${error.message})`,
          severity: 'info',
        });
        snapshotDir = copyDataDirSnapshot(dataDir);
        dbhan = await this.connect({ ...connection, databaseFile: snapshotDir });
      }

      runner.info({ message: 'Dumping PGlite database with pg_dump', severity: 'info' });
      const { pgDump } = require('@electric-sql/pglite-tools/pg_dump');
      const dump = await pgDump({
        pg: dbhan.client,
        args,
        fileName: path.basename(outputFile) || 'dump.sql',
      });
      const content = await dump.text();
      fs.writeFileSync(outputFile, content);
      runner.info({
        message: `Wrote ${content.length} bytes to ${path.basename(outputFile)}`,
        severity: 'info',
      });
    } finally {
      if (dbhan) await this.close(dbhan);
      if (snapshotDir) {
        fs.rmSync(snapshotDir, { recursive: true, force: true });
      }
    }
  },

  async restoreDatabase(connection, settings, runner) {
    const { inputFile, database } = settings;
    const sql = fs.readFileSync(inputFile, 'utf8');
    if (!sql.trim()) {
      throw new Error('Restore file is empty');
    }

    runner.info({
      message: `Restoring ${path.basename(inputFile)} (${sql.length} bytes)`,
      severity: 'info',
    });
    const dbhan = await this.connect({ ...connection, database });
    try {
      if (runner?.signal?.aborted) {
        throw new Error('Restore cancelled');
      }
      await dbhan.client.exec(sql);
      runner.info({ message: 'Restore finished', severity: 'info' });
    } finally {
      await this.close(dbhan);
    }
  },

  async listSchemas(dbhan) {
    const { rows } = await this.query(
      dbhan,
      `SELECT schema_name AS "schemaName"
       FROM information_schema.schemata
       WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
         AND schema_name NOT LIKE 'pg_temp_%'
         AND schema_name NOT LIKE 'pg_toast_temp_%'
       ORDER BY schema_name`
    );
    return rows;
  },
};

module.exports = driver;

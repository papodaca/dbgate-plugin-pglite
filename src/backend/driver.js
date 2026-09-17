const fs = require('fs');
const path = require('path');
const stream = require('stream');
const { createBulkInsertStreamBase } = require('dbgate-tools');
const driverBase = require('../frontend/driver');
const Analyser = require('./Analyser');
const { stripDataDirFile } = require('../shared/dataDir');
const { selectedExtensions } = require('../shared/extensions');
const { loadExtensionMap } = require('./loadExtensions');

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

/** @type {import('dbgate-types').EngineDriver} */
const driver = {
  ...driverBase,
  analyserClass: Analyser,

  async connect(connection) {
    const { PGlite } = require('@electric-sql/pglite');
    const dataDir = resolveDataDir(connection.databaseFile);
    const selected = selectedExtensions(connection);
    const options = {
      extensions: loadExtensionMap(selected),
    };

    try {
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

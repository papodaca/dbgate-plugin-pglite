# dbgate-plugin-pglite

A [DbGate](https://dbgate.org/) driver for [PGlite](https://pglite.dev/), the WASM build of Postgres. PGlite runs inside the DbGate process and stores its data in a directory on disk or in memory, so there is no Postgres server to install or start.

The plugin ships two PGlite engines: 0.4.6 (Postgres 17) and 0.5.8 (Postgres 18). It reads `PG_VERSION` from the data directory and opens the matching engine. New directories and in-memory databases always use Postgres 18 / PGlite 0.5.8.

## Install

Open the Plugins widget in DbGate, search for `pglite`, and install it. Then create a new connection and pick **PGlite** as the engine.

## Connecting

The connection form has one field, the data directory path.

Leave it empty, or enter `memory://`, for an in-memory database. Nothing is written to disk and the data is gone when the connection closes. In-memory connections are single-database.

For a database on disk, type the path to a PGlite data directory or use Browse. Browse is a file picker, not a folder picker, so select any file inside the data directory (`PG_VERSION` and `runtime.txt` are good candidates). The driver strips the filename and uses the directory. If that directory contains a `pgdata/` subfolder that is itself a Postgres cluster, the driver opens the subfolder instead. A path that does not exist yet becomes a new database on first connect.

File-backed connections show a `postgres` database under the connection, the same way a normal Postgres server does. Creating additional databases from DbGate is not supported.

PGlite allows one connection per data directory at a time, and DbGate keeps one connection open for the whole session.

## Extensions

The Advanced tab of the connection form has a checkbox for each extension the plugin ships. Checked extensions are loaded when the connection opens and created with `CREATE EXTENSION IF NOT EXISTS`.

Bundled extension packages: pgvector, PostGIS, Apache AGE, pg_textsearch, pg_hashids, pg_ivm, pg_uuidv7, pgmq, pgtap, and full ICU locales. The standard Postgres contrib extensions (hstore, pgcrypto, pg_trgm, uuid-ossp, ltree, citext, and so on) are also listed. pgmq, ICU locales, `moddatetime`, and `pg_stat_statements` are Postgres 18 / PGlite 0.5.8 only. They sit in that group at the bottom of the Advanced tab. Opening a Postgres 17 / PGlite 0.4.6 data directory with one of those checked still fails, with an error naming the extension.

When you open an existing data directory, the driver reads `shared_preload_libraries` from its `postgresql.conf` and loads those extensions too, whether or not they are checked. If the directory preloads a library the plugin does not ship, or a library the selected engine does not have, the connection fails with an error naming the library.

## Backup and restore

Right-click the `postgres` database for Backup and Restore.

Backup runs the WASM `pg_dump` from `@electric-sql/pglite-tools` and writes a plain SQL file with `INSERT` statements. The dialog exposes the usual `pg_dump` switches: data only, schema only, no owner, no privileges. If the data directory is already open, the driver copies it to a temporary folder and dumps the copy.

Restore reads a SQL file and runs it with `exec`. It does not drop anything first, so restoring into a database that already has the dumped objects fails on the first `CREATE`.

## Development

You need Node.js and Yarn (Yarn is what DbGate itself uses).

```sh
yarn
yarn build
yarn plugin
```

`yarn plugin` builds the frontend and backend bundles, packs the plugin, and installs it into your local DbGate. Reload DbGate afterwards (View / Reload). `yarn plugout` removes the local install.

The build step also copies `@electric-sql/pglite` (Postgres 18), `pglite-pg17` (Postgres 17), and the extension packages into `dist/vendor/`. This is needed because DbGate installs plugins by unpacking the tarball without running `yarn install`, and `yarn pack` refuses to include anything named `node_modules`. Bundling the packages under `vendor/` sidesteps both.

## License

MIT

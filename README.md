# dbgate-plugin-pglite

DbGate driver for [PGlite](https://pglite.dev/), the WASM Postgres that lives in a directory (or in memory). No server to start.

Create a connection and pick `runtime.txt` (or any file in the data dir). The driver drops that filename and, if a `pgdata` folder is sitting next to it, opens that. That is the Hideout layout. Leave the path empty or set it to `memory://` for an in-memory database.

The plugin ships PGlite 0.5.8 with `vector` and `pg_textsearch`, same as Hideout.

## Develop

Needs Node.js. Yarn matches what DbGate uses.

```sh
yarn
yarn build
```

Install into a local DbGate app:

```sh
yarn plugin
```

Reload DbGate (View / Reload). The new engine shows up as **PGlite** on the connection screen. `yarn plugout` removes it.

## How this is wired

Same layout the [DbGate plugin generator](https://docs.dbgate.io/dbgate/developer/plugin-development/index.html) produces:

- `src/frontend/driver.js` — connection fields and the Postgres dialect
- `src/backend/driver.js` — `connect`, `query`, `stream`, `getVersion`
- `src/backend/Analyser.js` — tables, views, columns, primary keys from `information_schema`

The SQL dialect is copied from the official Postgres plugin. The connection form is a single file path, like DuckDB and SQLite.

`yarn plugin` copies `@electric-sql/pglite` into `dist/vendor/pglite`. DbGate unpacks the tarball and does not run `yarn install`, and `yarn pack` drops anything named `node_modules`.

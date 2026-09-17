# dbgate-plugin-pglite

DbGate driver for [PGlite](https://pglite.dev/), the WASM Postgres that lives in a directory (or in memory). No server to start.

Create a connection and point it at a PGlite data directory. The Browse button only opens files, so pick something inside the dir (`PG_VERSION`, `runtime.txt`) or type the path. The driver drops those filenames and uses the directory. If that folder is only a wrapper and the cluster is in `pgdata/`, that is what gets opened. Leave the path empty or set it to `memory://` for an in-memory database.

Extensions are checkboxes on the connection Advanced tab. Only checked ones are loaded.

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

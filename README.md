# dbgate-plugin-pglite

DbGate driver for [PGlite](https://pglite.dev/), WASM Postgres in a directory (or in memory). No server process.

Install from the Plugins widget in DbGate (search for `pglite`). Then New Connection → **PGlite**. Bundled PGlite is 0.5.8, which is Postgres 18.

## Connection path

Browse is a file picker. Pick something inside the data directory (`PG_VERSION`, `runtime.txt`) or type the folder path. The driver strips those filenames and uses the directory. If the cluster lives in `pgdata/`, that nested folder is what gets opened.

Empty path or `memory://` is an in-memory database. Memory connections stay single-database. File-backed connections list `postgres` under the connection, like a normal Postgres server.

Extensions are checkboxes on the Advanced tab. Existing data directories also load whatever is already in `shared_preload_libraries`.

Right-click `postgres` for backup (wasm `pg_dump`, INSERT SQL) and restore (`exec` of that SQL). Restore fails if the dump's objects already exist.

## Develop

Needs Node.js. Yarn matches what DbGate uses.

```sh
yarn
yarn build
yarn plugin
```

Reload DbGate (View / Reload). `yarn plugout` removes the local install.

`yarn plugin` copies `@electric-sql/pglite` and the extension packages into `dist/vendor/`. DbGate unpacks the tarball and does not run `yarn install`, and `yarn pack` drops anything named `node_modules`.

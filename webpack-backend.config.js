var path = require('path');

var config = {
  context: __dirname + '/src/backend',

  entry: {
    app: './index.js',
  },
  target: 'node',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'backend.js',
    libraryTarget: 'commonjs2',
  },

  // yarn pack drops any folder named node_modules. Ship PGlite next to backend.js instead.
  externals: [
    function ({ request }, callback) {
      if (!request) return callback();
      if (request === 'pglite-pg17') {
        return callback(null, 'commonjs ./vendor/pglite-pg17');
      }
      if (request.startsWith('pglite-pg17/contrib/')) {
        const name = request.slice('pglite-pg17/contrib/'.length);
        return callback(null, `commonjs ./vendor/pglite-pg17/dist/contrib/${name}.cjs`);
      }
      if (request.startsWith('pglite-pg17/')) {
        const name = request.slice('pglite-pg17/'.length);
        return callback(null, `commonjs ./vendor/pglite-pg17/dist/${name}/index.cjs`);
      }
      if (request === 'pglite-tools-pg17/pg_dump') {
        return callback(null, 'commonjs ./vendor/pglite-tools-pg17/dist/pg_dump.cjs');
      }
      if (request === 'pglite-postgis-pg17') {
        return callback(null, 'commonjs ./vendor/pglite-postgis-pg17');
      }
      if (request === '@electric-sql/pglite') {
        return callback(null, 'commonjs ./vendor/pglite');
      }
      if (request.startsWith('@electric-sql/pglite/contrib/')) {
        const name = request.slice('@electric-sql/pglite/contrib/'.length);
        return callback(null, `commonjs ./vendor/pglite/dist/contrib/${name}.cjs`);
      }
      if (request === '@electric-sql/pglite/live') {
        return callback(null, 'commonjs ./vendor/pglite/dist/live/index.cjs');
      }
      // Subpath must win over the generic pglite-* prefix.
      if (request === '@electric-sql/pglite-tools/pg_dump') {
        return callback(null, 'commonjs ./vendor/pglite-tools/dist/pg_dump.cjs');
      }
      if (request.startsWith('@electric-sql/pglite-')) {
        return callback(null, 'commonjs ./vendor/' + request.slice('@electric-sql/'.length));
      }
      callback();
    },
  ],
};

module.exports = config;

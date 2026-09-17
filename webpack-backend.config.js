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
  externals: {
    '@electric-sql/pglite': 'commonjs ./vendor/pglite',
    '@electric-sql/pglite-pgvector': 'commonjs ./vendor/pglite-pgvector',
    '@electric-sql/pglite-pg_textsearch': 'commonjs ./vendor/pglite-pg_textsearch',
  },
};

module.exports = config;

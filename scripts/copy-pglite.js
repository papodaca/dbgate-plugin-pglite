const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

const packages = [
  { from: path.join('@electric-sql', 'pglite'), to: 'pglite' },
  { from: path.join('@electric-sql', 'pglite-age'), to: 'pglite-age' },
  { from: path.join('@electric-sql', 'pglite-icu-full'), to: 'pglite-icu-full' },
  { from: path.join('@electric-sql', 'pglite-pg_hashids'), to: 'pglite-pg_hashids' },
  { from: path.join('@electric-sql', 'pglite-pg_ivm'), to: 'pglite-pg_ivm' },
  { from: path.join('@electric-sql', 'pglite-pg_textsearch'), to: 'pglite-pg_textsearch' },
  { from: path.join('@electric-sql', 'pglite-pg_uuidv7'), to: 'pglite-pg_uuidv7' },
  { from: path.join('@electric-sql', 'pglite-pgmq'), to: 'pglite-pgmq' },
  { from: path.join('@electric-sql', 'pglite-pgtap'), to: 'pglite-pgtap' },
  { from: path.join('@electric-sql', 'pglite-pgvector'), to: 'pglite-pgvector' },
  { from: path.join('@electric-sql', 'pglite-postgis'), to: 'pglite-postgis' },
  { from: path.join('@electric-sql', 'pglite-tools'), to: 'pglite-tools' },
  { from: 'pglite-pg17', to: 'pglite-pg17' },
  { from: 'pglite-postgis-pg17', to: 'pglite-postgis-pg17' },
  { from: 'pglite-tools-pg17', to: 'pglite-tools-pg17' },
];

for (const { from, to } of packages) {
  const src = path.join(__dirname, '..', 'node_modules', from);
  const dest = path.join(__dirname, '..', 'dist', 'vendor', to);
  if (!fs.existsSync(src)) {
    throw new Error(`Missing ${src}. Run yarn install first.`);
  }
  fs.rmSync(dest, { recursive: true, force: true });
  copyDir(src, dest);
  console.log(`Copied ${from} into ${dest}`);
}

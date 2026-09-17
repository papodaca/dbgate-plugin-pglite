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
  'pglite',
  'pglite-age',
  'pglite-icu-full',
  'pglite-pg_hashids',
  'pglite-pg_ivm',
  'pglite-pg_textsearch',
  'pglite-pg_uuidv7',
  'pglite-pgmq',
  'pglite-pgtap',
  'pglite-pgvector',
  'pglite-postgis',
];

for (const name of packages) {
  const src = path.join(__dirname, '..', 'node_modules', '@electric-sql', name);
  const dest = path.join(__dirname, '..', 'dist', 'vendor', name);
  if (!fs.existsSync(src)) {
    throw new Error(`Missing ${src}. Run yarn install first.`);
  }
  fs.rmSync(dest, { recursive: true, force: true });
  copyDir(src, dest);
  console.log(`Copied ${name} into ${dest}`);
}

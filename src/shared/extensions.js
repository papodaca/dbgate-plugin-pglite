const EXTENSIONS = [
  { id: 'vector', label: 'pgvector', sqlName: 'vector' },
  { id: 'pg_textsearch', label: 'pg_textsearch', sqlName: 'pg_textsearch' },
  { id: 'age', label: 'Apache AGE', sqlName: 'age' },
  { id: 'icu', label: 'ICU locales (full)', sqlName: null, onlyMajor: 18 },
  { id: 'pg_hashids', label: 'pg_hashids', sqlName: 'pg_hashids' },
  { id: 'pg_ivm', label: 'pg_ivm', sqlName: 'pg_ivm' },
  { id: 'pg_uuidv7', label: 'pg_uuidv7', sqlName: 'pg_uuidv7' },
  { id: 'pgmq', label: 'pgmq', sqlName: 'pgmq', onlyMajor: 18 },
  { id: 'pgtap', label: 'pgtap', sqlName: 'pgtap' },
  { id: 'postgis', label: 'PostGIS', sqlName: 'postgis' },
  { id: 'live', label: 'live', sqlName: null },
  { id: 'amcheck', label: 'amcheck', sqlName: 'amcheck' },
  { id: 'auto_explain', label: 'auto_explain', sqlName: 'auto_explain' },
  { id: 'bloom', label: 'bloom', sqlName: 'bloom' },
  { id: 'btree_gin', label: 'btree_gin', sqlName: 'btree_gin' },
  { id: 'btree_gist', label: 'btree_gist', sqlName: 'btree_gist' },
  { id: 'citext', label: 'citext', sqlName: 'citext' },
  { id: 'cube', label: 'cube', sqlName: 'cube' },
  { id: 'dict_int', label: 'dict_int', sqlName: 'dict_int' },
  { id: 'dict_xsyn', label: 'dict_xsyn', sqlName: 'dict_xsyn' },
  { id: 'earthdistance', label: 'earthdistance', sqlName: 'earthdistance' },
  { id: 'file_fdw', label: 'file_fdw', sqlName: 'file_fdw' },
  { id: 'fuzzystrmatch', label: 'fuzzystrmatch', sqlName: 'fuzzystrmatch' },
  { id: 'hstore', label: 'hstore', sqlName: 'hstore' },
  { id: 'intarray', label: 'intarray', sqlName: 'intarray' },
  { id: 'isn', label: 'isn', sqlName: 'isn' },
  { id: 'lo', label: 'lo', sqlName: 'lo' },
  { id: 'ltree', label: 'ltree', sqlName: 'ltree' },
  { id: 'moddatetime', label: 'moddatetime', sqlName: 'moddatetime', onlyMajor: 18 },
  { id: 'pageinspect', label: 'pageinspect', sqlName: 'pageinspect' },
  { id: 'pg_buffercache', label: 'pg_buffercache', sqlName: 'pg_buffercache' },
  { id: 'pg_freespacemap', label: 'pg_freespacemap', sqlName: 'pg_freespacemap' },
  { id: 'pg_stat_statements', label: 'pg_stat_statements', sqlName: 'pg_stat_statements', onlyMajor: 18 },
  { id: 'pg_surgery', label: 'pg_surgery', sqlName: 'pg_surgery' },
  { id: 'pg_trgm', label: 'pg_trgm', sqlName: 'pg_trgm' },
  { id: 'pg_visibility', label: 'pg_visibility', sqlName: 'pg_visibility' },
  { id: 'pg_walinspect', label: 'pg_walinspect', sqlName: 'pg_walinspect' },
  { id: 'pgcrypto', label: 'pgcrypto', sqlName: 'pgcrypto' },
  { id: 'seg', label: 'seg', sqlName: 'seg' },
  { id: 'tablefunc', label: 'tablefunc', sqlName: 'tablefunc' },
  { id: 'tcn', label: 'tcn', sqlName: 'tcn' },
  { id: 'tsm_system_rows', label: 'tsm_system_rows', sqlName: 'tsm_system_rows' },
  { id: 'tsm_system_time', label: 'tsm_system_time', sqlName: 'tsm_system_time' },
  { id: 'unaccent', label: 'unaccent', sqlName: 'unaccent' },
  { id: 'uuid_ossp', label: 'uuid-ossp', sqlName: 'uuid-ossp' },
];

function extensionFieldName(id) {
  return `pgliteExt_${id}`;
}

const PGLITE_VERSION_BY_MAJOR = {
  17: '0.4.6',
  18: '0.5.8',
};

function postgresEngineLabel(major) {
  const pglite = PGLITE_VERSION_BY_MAJOR[major];
  return pglite ? `Postgres ${major} / PGlite ${pglite}` : `Postgres ${major}`;
}

function extensionFormLabel(ext) {
  return ext.onlyMajor ? `${ext.label} (${postgresEngineLabel(ext.onlyMajor)})` : ext.label;
}

const EXTRA_IDS = new Set([
  'vector',
  'pg_textsearch',
  'age',
  'pg_hashids',
  'pg_ivm',
  'pg_uuidv7',
  'pgtap',
  'postgis',
  'live',
]);

function extensionsForForm() {
  const extra = [];
  const only18 = [];
  const contrib = [];
  for (const ext of EXTENSIONS) {
    if (ext.onlyMajor === 18) only18.push(ext);
    else if (EXTRA_IDS.has(ext.id)) extra.push(ext);
    else contrib.push(ext);
  }
  return { extra, only18, contrib };
}

function isEnabled(value) {
  return value === true || value === 1 || value === '1';
}

function selectedExtensions(connection = {}) {
  return EXTENSIONS.filter(ext => isEnabled(connection[extensionFieldName(ext.id)]));
}

function extensionFieldValues(connection = {}) {
  const values = {};
  for (const ext of EXTENSIONS) {
    values[extensionFieldName(ext.id)] = isEnabled(connection[extensionFieldName(ext.id)]);
  }
  return values;
}

module.exports = {
  EXTENSIONS,
  PGLITE_VERSION_BY_MAJOR,
  extensionFieldName,
  postgresEngineLabel,
  extensionFormLabel,
  extensionsForForm,
  selectedExtensions,
  extensionFieldValues,
};

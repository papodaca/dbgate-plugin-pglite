const fs = require('fs');
const path = require('path');
const { EXTENSIONS, selectedExtensions } = require('../shared/extensions');

function sharedPreloadLibraries(dataDir) {
  if (!dataDir) return [];
  let text;
  try {
    text = fs.readFileSync(path.join(dataDir, 'postgresql.conf'), 'utf8');
  } catch {
    return [];
  }

  const names = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    const m = line.match(/^shared_preload_libraries\s*=\s*(.*)$/i);
    if (!m) continue;
    let value = m[1].trim();
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1);
    }
    for (const part of value.split(',')) {
      const name = part.trim();
      if (name) names.push(name);
    }
  }
  return names;
}

function extensionByPreloadName(name) {
  return EXTENSIONS.find(ext => ext.id === name || ext.sqlName === name) || null;
}

function extensionsForOpen(connection, dataDir) {
  const selected = selectedExtensions(connection);
  const needed = new Map(selected.map(ext => [ext.id, ext]));
  const unknown = [];
  for (const name of sharedPreloadLibraries(dataDir)) {
    const ext = extensionByPreloadName(name);
    if (!ext) {
      unknown.push(name);
      continue;
    }
    needed.set(ext.id, ext);
  }
  if (unknown.length) {
    throw new Error(
      `This data directory preloads ${unknown.join(', ')}, which this plugin does not ship`
    );
  }
  return [...needed.values()];
}

function loadExtensionModule(id) {
  switch (id) {
    case 'vector':
      return require('@electric-sql/pglite-pgvector').vector;
    case 'pg_textsearch':
      return require('@electric-sql/pglite-pg_textsearch').pg_textsearch;
    case 'age':
      return require('@electric-sql/pglite-age').age;
    case 'pg_hashids':
      return require('@electric-sql/pglite-pg_hashids').pg_hashids;
    case 'pg_ivm':
      return require('@electric-sql/pglite-pg_ivm').pg_ivm;
    case 'pg_uuidv7':
      return require('@electric-sql/pglite-pg_uuidv7').pg_uuidv7;
    case 'pgmq':
      return require('@electric-sql/pglite-pgmq').pgmq;
    case 'pgtap':
      return require('@electric-sql/pglite-pgtap').pgtap;
    case 'postgis':
      return require('@electric-sql/pglite-postgis').postgis;
    case 'live':
      return require('@electric-sql/pglite/live').live;
    case 'amcheck':
      return require('@electric-sql/pglite/contrib/amcheck').amcheck;
    case 'auto_explain':
      return require('@electric-sql/pglite/contrib/auto_explain').auto_explain;
    case 'bloom':
      return require('@electric-sql/pglite/contrib/bloom').bloom;
    case 'btree_gin':
      return require('@electric-sql/pglite/contrib/btree_gin').btree_gin;
    case 'btree_gist':
      return require('@electric-sql/pglite/contrib/btree_gist').btree_gist;
    case 'citext':
      return require('@electric-sql/pglite/contrib/citext').citext;
    case 'cube':
      return require('@electric-sql/pglite/contrib/cube').cube;
    case 'dict_int':
      return require('@electric-sql/pglite/contrib/dict_int').dict_int;
    case 'dict_xsyn':
      return require('@electric-sql/pglite/contrib/dict_xsyn').dict_xsyn;
    case 'earthdistance':
      return require('@electric-sql/pglite/contrib/earthdistance').earthdistance;
    case 'file_fdw':
      return require('@electric-sql/pglite/contrib/file_fdw').file_fdw;
    case 'fuzzystrmatch':
      return require('@electric-sql/pglite/contrib/fuzzystrmatch').fuzzystrmatch;
    case 'hstore':
      return require('@electric-sql/pglite/contrib/hstore').hstore;
    case 'intarray':
      return require('@electric-sql/pglite/contrib/intarray').intarray;
    case 'isn':
      return require('@electric-sql/pglite/contrib/isn').isn;
    case 'lo':
      return require('@electric-sql/pglite/contrib/lo').lo;
    case 'ltree':
      return require('@electric-sql/pglite/contrib/ltree').ltree;
    case 'moddatetime':
      return require('@electric-sql/pglite/contrib/moddatetime').moddatetime;
    case 'pageinspect':
      return require('@electric-sql/pglite/contrib/pageinspect').pageinspect;
    case 'pg_buffercache':
      return require('@electric-sql/pglite/contrib/pg_buffercache').pg_buffercache;
    case 'pg_freespacemap':
      return require('@electric-sql/pglite/contrib/pg_freespacemap').pg_freespacemap;
    case 'pg_stat_statements':
      return require('@electric-sql/pglite/contrib/pg_stat_statements').pg_stat_statements;
    case 'pg_surgery':
      return require('@electric-sql/pglite/contrib/pg_surgery').pg_surgery;
    case 'pg_trgm':
      return require('@electric-sql/pglite/contrib/pg_trgm').pg_trgm;
    case 'pg_visibility':
      return require('@electric-sql/pglite/contrib/pg_visibility').pg_visibility;
    case 'pg_walinspect':
      return require('@electric-sql/pglite/contrib/pg_walinspect').pg_walinspect;
    case 'pgcrypto':
      return require('@electric-sql/pglite/contrib/pgcrypto').pgcrypto;
    case 'seg':
      return require('@electric-sql/pglite/contrib/seg').seg;
    case 'tablefunc':
      return require('@electric-sql/pglite/contrib/tablefunc').tablefunc;
    case 'tcn':
      return require('@electric-sql/pglite/contrib/tcn').tcn;
    case 'tsm_system_rows':
      return require('@electric-sql/pglite/contrib/tsm_system_rows').tsm_system_rows;
    case 'tsm_system_time':
      return require('@electric-sql/pglite/contrib/tsm_system_time').tsm_system_time;
    case 'unaccent':
      return require('@electric-sql/pglite/contrib/unaccent').unaccent;
    case 'uuid_ossp':
      return require('@electric-sql/pglite/contrib/uuid_ossp').uuid_ossp;
    default:
      throw new Error(`Unknown PGlite extension: ${id}`);
  }
}

function loadExtensionMap(selected) {
  const extensions = {};
  for (const ext of selected) {
    if (ext.id === 'icu') continue;
    extensions[ext.id] = loadExtensionModule(ext.id);
  }
  return extensions;
}

module.exports = {
  sharedPreloadLibraries,
  extensionsForOpen,
  loadExtensionModule,
  loadExtensionMap,
};

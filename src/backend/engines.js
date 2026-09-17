const fs = require('fs');
const path = require('path');
const { postgresEngineLabel } = require('../shared/extensions');

const pg17Extensions = {
  vector: () => require('pglite-pg17/vector').vector,
  pg_textsearch: () => require('pglite-pg17/pg_textsearch').pg_textsearch,
  age: () => require('pglite-pg17/age').age,
  pg_hashids: () => require('pglite-pg17/pg_hashids').pg_hashids,
  pg_ivm: () => require('pglite-pg17/pg_ivm').pg_ivm,
  pg_uuidv7: () => require('pglite-pg17/pg_uuidv7').pg_uuidv7,
  pgtap: () => require('pglite-pg17/pgtap').pgtap,
  postgis: () => require('pglite-postgis-pg17').postgis,
  live: () => require('pglite-pg17/live').live,
  amcheck: () => require('pglite-pg17/contrib/amcheck').amcheck,
  auto_explain: () => require('pglite-pg17/contrib/auto_explain').auto_explain,
  bloom: () => require('pglite-pg17/contrib/bloom').bloom,
  btree_gin: () => require('pglite-pg17/contrib/btree_gin').btree_gin,
  btree_gist: () => require('pglite-pg17/contrib/btree_gist').btree_gist,
  citext: () => require('pglite-pg17/contrib/citext').citext,
  cube: () => require('pglite-pg17/contrib/cube').cube,
  dict_int: () => require('pglite-pg17/contrib/dict_int').dict_int,
  dict_xsyn: () => require('pglite-pg17/contrib/dict_xsyn').dict_xsyn,
  earthdistance: () => require('pglite-pg17/contrib/earthdistance').earthdistance,
  file_fdw: () => require('pglite-pg17/contrib/file_fdw').file_fdw,
  fuzzystrmatch: () => require('pglite-pg17/contrib/fuzzystrmatch').fuzzystrmatch,
  hstore: () => require('pglite-pg17/contrib/hstore').hstore,
  intarray: () => require('pglite-pg17/contrib/intarray').intarray,
  isn: () => require('pglite-pg17/contrib/isn').isn,
  lo: () => require('pglite-pg17/contrib/lo').lo,
  ltree: () => require('pglite-pg17/contrib/ltree').ltree,
  pageinspect: () => require('pglite-pg17/contrib/pageinspect').pageinspect,
  pg_buffercache: () => require('pglite-pg17/contrib/pg_buffercache').pg_buffercache,
  pg_freespacemap: () => require('pglite-pg17/contrib/pg_freespacemap').pg_freespacemap,
  pg_surgery: () => require('pglite-pg17/contrib/pg_surgery').pg_surgery,
  pg_trgm: () => require('pglite-pg17/contrib/pg_trgm').pg_trgm,
  pg_visibility: () => require('pglite-pg17/contrib/pg_visibility').pg_visibility,
  pg_walinspect: () => require('pglite-pg17/contrib/pg_walinspect').pg_walinspect,
  pgcrypto: () => require('pglite-pg17/contrib/pgcrypto').pgcrypto,
  seg: () => require('pglite-pg17/contrib/seg').seg,
  tablefunc: () => require('pglite-pg17/contrib/tablefunc').tablefunc,
  tcn: () => require('pglite-pg17/contrib/tcn').tcn,
  tsm_system_rows: () => require('pglite-pg17/contrib/tsm_system_rows').tsm_system_rows,
  tsm_system_time: () => require('pglite-pg17/contrib/tsm_system_time').tsm_system_time,
  unaccent: () => require('pglite-pg17/contrib/unaccent').unaccent,
  uuid_ossp: () => require('pglite-pg17/contrib/uuid_ossp').uuid_ossp,
};

const pg18Extensions = {
  vector: () => require('@electric-sql/pglite-pgvector').vector,
  pg_textsearch: () => require('@electric-sql/pglite-pg_textsearch').pg_textsearch,
  age: () => require('@electric-sql/pglite-age').age,
  icu: null,
  pg_hashids: () => require('@electric-sql/pglite-pg_hashids').pg_hashids,
  pg_ivm: () => require('@electric-sql/pglite-pg_ivm').pg_ivm,
  pg_uuidv7: () => require('@electric-sql/pglite-pg_uuidv7').pg_uuidv7,
  pgmq: () => require('@electric-sql/pglite-pgmq').pgmq,
  pgtap: () => require('@electric-sql/pglite-pgtap').pgtap,
  postgis: () => require('@electric-sql/pglite-postgis').postgis,
  live: () => require('@electric-sql/pglite/live').live,
  amcheck: () => require('@electric-sql/pglite/contrib/amcheck').amcheck,
  auto_explain: () => require('@electric-sql/pglite/contrib/auto_explain').auto_explain,
  bloom: () => require('@electric-sql/pglite/contrib/bloom').bloom,
  btree_gin: () => require('@electric-sql/pglite/contrib/btree_gin').btree_gin,
  btree_gist: () => require('@electric-sql/pglite/contrib/btree_gist').btree_gist,
  citext: () => require('@electric-sql/pglite/contrib/citext').citext,
  cube: () => require('@electric-sql/pglite/contrib/cube').cube,
  dict_int: () => require('@electric-sql/pglite/contrib/dict_int').dict_int,
  dict_xsyn: () => require('@electric-sql/pglite/contrib/dict_xsyn').dict_xsyn,
  earthdistance: () => require('@electric-sql/pglite/contrib/earthdistance').earthdistance,
  file_fdw: () => require('@electric-sql/pglite/contrib/file_fdw').file_fdw,
  fuzzystrmatch: () => require('@electric-sql/pglite/contrib/fuzzystrmatch').fuzzystrmatch,
  hstore: () => require('@electric-sql/pglite/contrib/hstore').hstore,
  intarray: () => require('@electric-sql/pglite/contrib/intarray').intarray,
  isn: () => require('@electric-sql/pglite/contrib/isn').isn,
  lo: () => require('@electric-sql/pglite/contrib/lo').lo,
  ltree: () => require('@electric-sql/pglite/contrib/ltree').ltree,
  moddatetime: () => require('@electric-sql/pglite/contrib/moddatetime').moddatetime,
  pageinspect: () => require('@electric-sql/pglite/contrib/pageinspect').pageinspect,
  pg_buffercache: () => require('@electric-sql/pglite/contrib/pg_buffercache').pg_buffercache,
  pg_freespacemap: () => require('@electric-sql/pglite/contrib/pg_freespacemap').pg_freespacemap,
  pg_stat_statements: () => require('@electric-sql/pglite/contrib/pg_stat_statements').pg_stat_statements,
  pg_surgery: () => require('@electric-sql/pglite/contrib/pg_surgery').pg_surgery,
  pg_trgm: () => require('@electric-sql/pglite/contrib/pg_trgm').pg_trgm,
  pg_visibility: () => require('@electric-sql/pglite/contrib/pg_visibility').pg_visibility,
  pg_walinspect: () => require('@electric-sql/pglite/contrib/pg_walinspect').pg_walinspect,
  pgcrypto: () => require('@electric-sql/pglite/contrib/pgcrypto').pgcrypto,
  seg: () => require('@electric-sql/pglite/contrib/seg').seg,
  tablefunc: () => require('@electric-sql/pglite/contrib/tablefunc').tablefunc,
  tcn: () => require('@electric-sql/pglite/contrib/tcn').tcn,
  tsm_system_rows: () => require('@electric-sql/pglite/contrib/tsm_system_rows').tsm_system_rows,
  tsm_system_time: () => require('@electric-sql/pglite/contrib/tsm_system_time').tsm_system_time,
  unaccent: () => require('@electric-sql/pglite/contrib/unaccent').unaccent,
  uuid_ossp: () => require('@electric-sql/pglite/contrib/uuid_ossp').uuid_ossp,
};

function makeEngine(major, { extensions, loadPGlite, loadPgDump, loadIcuDataDir }) {
  return {
    major,
    hasExtension(id) {
      return Object.prototype.hasOwnProperty.call(extensions, id);
    },
    loadExtension(id) {
      if (!this.hasExtension(id)) {
        throw new Error(`${id} is not available for ${postgresEngineLabel(major)}`);
      }
      const loader = extensions[id];
      return loader ? loader() : undefined;
    },
    loadPGlite,
    loadPgDump,
    loadIcuDataDir,
  };
}

const pg17 = makeEngine(17, {
  extensions: pg17Extensions,
  loadPGlite: () => require('pglite-pg17').PGlite,
  loadPgDump: () => require('pglite-tools-pg17/pg_dump').pgDump,
});

const pg18 = makeEngine(18, {
  extensions: pg18Extensions,
  loadPGlite: () => require('@electric-sql/pglite').PGlite,
  loadPgDump: () => require('@electric-sql/pglite-tools/pg_dump').pgDump,
  loadIcuDataDir: () => require('@electric-sql/pglite-icu-full').icuDataDir(),
});

function detectMajor(dataDir) {
  if (!dataDir) return undefined;
  try {
    const text = fs.readFileSync(path.join(dataDir, 'PG_VERSION'), 'utf8').trim();
    const n = parseInt(text, 10);
    return Number.isFinite(n) ? n : undefined;
  } catch {
    return undefined;
  }
}

function engineFor(major) {
  if (major == null || major === 18) return pg18;
  if (major === 17) return pg17;
  throw new Error(
    `This data directory is Postgres ${major}; this plugin ships ${postgresEngineLabel(17)} and ${postgresEngineLabel(18)}`
  );
}

module.exports = {
  detectMajor,
  engineFor,
  pg17,
  pg18,
};

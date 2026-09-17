const DATA_DIR_FILES = ['runtime.txt', 'PG_VERSION', 'postgresql.conf', 'pg_hba.conf', 'postmaster.pid'];


function stripDataDirFile(databaseFile) {
  if (!databaseFile) return databaseFile;
  const normalized = databaseFile.replace(/[/\\]+$/, '');
  const m = normalized.match(/[/\\]([^/\\]+)$/);
  if (m && DATA_DIR_FILES.includes(m[1])) {
    return normalized.slice(0, -(m[1].length + 1));
  }
  return normalized;
}

function getDatabaseFileLabel(databaseFile) {
  const normalized = stripDataDirFile(databaseFile);
  if (!normalized) return 'memory';
  const m = normalized.match(/[/\\]([^/\\]+)$/);
  if (m) return m[1];
  return normalized;
}

function isMemoryDataDir(databaseFile) {
  return !databaseFile || databaseFile === 'memory' || databaseFile === 'memory://';
}

module.exports = {
  DATA_DIR_FILES,
  stripDataDirFile,
  getDatabaseFileLabel,
  isMemoryDataDir,
};

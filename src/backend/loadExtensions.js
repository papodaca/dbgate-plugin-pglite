const fs = require('fs');
const path = require('path');
const { EXTENSIONS, postgresEngineLabel, selectedExtensions } = require('../shared/extensions');

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
    if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
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

function extensionsForOpen(connection, dataDir, engine) {
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
    throw new Error(`This data directory preloads ${unknown.join(', ')}, which this plugin does not ship`);
  }

  const unsupported = [...needed.values()].filter(ext => !engine.hasExtension(ext.id));
  if (unsupported.length) {
    const names = unsupported.map(ext => ext.label || ext.id).join(', ');
    const verb = unsupported.length === 1 ? 'is' : 'are';
    throw new Error(`${names} ${verb} not available for ${postgresEngineLabel(engine.major)}`);
  }

  return [...needed.values()];
}

function loadExtensionMap(selected, engine) {
  const extensions = {};
  for (const ext of selected) {
    const loaded = engine.loadExtension(ext.id);
    if (loaded) {
      extensions[ext.id] = loaded;
    }
  }
  return extensions;
}

module.exports = {
  sharedPreloadLibraries,
  extensionsForOpen,
  loadExtensionMap,
};

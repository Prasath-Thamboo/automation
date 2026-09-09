// Metro configuré pour le monorepo : Metro doit voir la racine (packages partagés)
// et résoudre les modules depuis le node_modules de l'app ET celui de la racine.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
// pnpm range les dépendances transitives dans .pnpm/<pkg>@<ver>/node_modules :
// Metro doit pouvoir remonter l'arborescence pour les trouver. On garde donc
// la recherche hiérarchique activée (pas de disableHierarchicalLookup).
config.resolver.unstable_enableSymlinks = true;
// Les packages partagés (@tando/config, @tando/ui-native…) exposent leurs
// entrées via le champ "exports" du package.json (sous-chemins ./tokens etc.).
config.resolver.unstable_enablePackageExports = true;

module.exports = config;

const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

/**
 * L'app native n'est **pas** un workspace npm (voir la note en tête du
 * package.json de la racine) : elle a son propre node_modules. Mais elle
 * importe `@trano/shared`, qui vit hors de son dossier et n'est pas compilé —
 * ce sont des sources TypeScript, lues telles quelles.
 *
 * Deux réglages en découlent :
 *
 * - `watchFolders` : sans lui, Metro refuse de servir un fichier situé hors du
 *   projet, et un simple `import type { Profile }` casse la construction.
 * - `nodeModulesPaths` : les dépendances se cherchent ici, pas à la racine du
 *   dépôt — c'est ce qui évite qu'un React hissé par les workspaces web/serveur
 *   ne se retrouve chargé en double.
 */
const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, '../../packages/shared');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [sharedRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

module.exports = withNativeWind(config, { input: './global.css' });

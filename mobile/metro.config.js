const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, '../shared');
const rootNodeModules = path.resolve(projectRoot, '../node_modules');

const config = getDefaultConfig(projectRoot);

// Watch the shared directory for changes
config.watchFolders = [sharedRoot];

// Resolve modules from both the mobile and root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  rootNodeModules,
];

module.exports = config;

// Point d'entrée de l'add-on HAOS : lit les options utilisateur
// (/data/options.json, fourni par le Supervisor) et les injecte en
// variables d'environnement avant de lancer le serveur Trano.
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

try {
  const options = JSON.parse(readFileSync('/data/options.json', 'utf8'));
  if (options.ha_url) process.env.TRANO_HA_URL = options.ha_url;
  if (options.ha_token) process.env.TRANO_HA_TOKEN = options.ha_token;
  if (options.weather_entity) process.env.TRANO_WEATHER_ENTITY = options.weather_entity;
  if (options.openrouter_key) process.env.TRANO_OPENROUTER_KEY = options.openrouter_key;
  if (options.openrouter_model) process.env.TRANO_OPENROUTER_MODEL = options.openrouter_model;
} catch (err) {
  console.warn('Options add-on illisibles, démarrage avec les valeurs par défaut :', err.message);
}

process.env.TRANO_DB_PATH ??= '/data/trano.db';

const child = spawn(
  'node',
  ['node_modules/tsx/dist/cli.mjs', 'apps/server/src/index.ts'],
  { stdio: 'inherit', env: process.env }
);
child.on('exit', (code) => process.exit(code ?? 1));

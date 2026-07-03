import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { profileRoutes } from './routes/profiles.ts';
import { shoppingRoutes } from './routes/shopping.ts';
import { assistantRoutes } from './routes/assistant.ts';
import { intercomRoutes } from './routes/intercom.ts';
import { roomRoutes } from './routes/rooms.ts';
import { registerClient } from './ws.ts';

// En dev, les secrets (HA, OpenRouter) vivent dans apps/server/.env (gitignoré).
// En prod, ils viennent des options de l'add-on.
try {
  process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)));
} catch {
  // pas de .env local : normal en production
}

const PORT = Number(process.env.TRANO_PORT ?? 3001);
const HOST = process.env.TRANO_HOST ?? '0.0.0.0';

const app = Fastify({ logger: true });

await app.register(fastifyCors, { origin: true });
await app.register(fastifyWebsocket);

app.get('/api/health', () => ({ status: 'ok', uptime: process.uptime() }));

/**
 * Config HA pour le frontend. En production (add-on HAOS), ces valeurs
 * viennent des options de l'add-on injectées en variables d'environnement.
 * L'app est servie uniquement sur le réseau local de la maison.
 */
app.get('/api/config', () => ({
  haUrl: process.env.TRANO_HA_URL ?? null,
  haToken: process.env.TRANO_HA_TOKEN ?? null,
  weatherEntity: process.env.TRANO_WEATHER_ENTITY ?? 'weather.forecast_home',
}));

app.register(async (instance) => {
  instance.get('/api/ws', { websocket: true }, (socket) => {
    registerClient(socket);
  });
});

profileRoutes(app);
shoppingRoutes(app);
assistantRoutes(app);
intercomRoutes(app);
roomRoutes(app);

// En prod (Docker/add-on), le serveur sert aussi le build du frontend.
const webDist = fileURLToPath(new URL('../../web/dist', import.meta.url));
if (existsSync(webDist)) {
  await app.register(fastifyStatic, { root: webDist });
  // Fallback SPA : toute route non-API renvoie index.html
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api/')) {
      return reply.code(404).send({ error: 'Route inconnue' });
    }
    return reply.sendFile('index.html');
  });
}

try {
  await app.listen({ port: PORT, host: HOST });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

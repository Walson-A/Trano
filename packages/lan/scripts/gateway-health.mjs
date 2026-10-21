// Process liveness only. HTTP 503 still means the Player is unavailable to Trano.
import { loadGatewayConfig } from '../src/gateway.ts';
try {
  const config = loadGatewayConfig('/run/secrets/gateway.json');
  const [reader, agent] = await Promise.all([
    fetch('http://' + config.readerHost + ':' + config.readerPort + '/v1/health', {
      headers: { authorization: 'Bearer ' + config.readerToken }, signal: AbortSignal.timeout(2000),
    }),
    fetch('http://' + config.agentHost + ':' + config.agentPort + '/', { signal: AbortSignal.timeout(2000) }),
  ]);
  const status = await reader.json();
  if (agent.status !== 404 || !(
    (reader.status === 200 && status.status === 'ok' && status.controlEnabled === false) ||
    (reader.status === 503 && status.error === 'Agent déconnecté ou observation périmée.')
  )) process.exitCode = 1;
} catch {
  // Never include credentials, URLs or configuration contents in the health log.
  process.exitCode = 1;
}

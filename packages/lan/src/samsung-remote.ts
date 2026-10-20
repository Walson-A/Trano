import { createRequire } from 'node:module';
import { Agent } from 'node:https';
import { connect } from 'node:tls';
import type { TLSSocket } from 'node:tls';
import type { EventEmitter } from 'node:events';
import type { DeviceConfig, MediaAction } from './types.ts';
import { LanError } from './types.ts';

interface WsSocket extends EventEmitter {
  send(data: string, callback: (error?: Error) => void): void;
  terminate(): void;
}
type WsConstructor = new (url: string, options: { agent?: Agent; handshakeTimeout: number; maxPayload: number }) => WsSocket;
const WebSocket = createRequire(import.meta.url)('ws') as WsConstructor;

export const SAMSUNG_REMOTE_KEYS: Partial<Record<MediaAction, string>> = {
  volume_up: 'KEY_VOLUP', volume_down: 'KEY_VOLDOWN', mute_toggle: 'KEY_MUTE',
  play: 'KEY_PLAY', pause: 'KEY_PAUSE', stop: 'KEY_STOP',
  power_toggle: 'KEY_POWER',
};

interface RemoteOptions {
  pairing?: boolean;
  timeoutMs?: number;
}
/** Self-signed TV certificate accepted only on this socket and pinned before an HTTP token is sent. */
function pinnedAgent(host: string, port: number, expected: string | undefined, observe: (fp: string) => void): Agent {
  const agent = new Agent({ keepAlive: false });
  agent.createConnection = (_options, callback) => {
    let finished = false;
    const done = (error: Error | null, socket?: TLSSocket) => {
      if (finished) return;
      finished = true;
      callback?.(error, socket!);
    };
    const socket = connect({ host, port, rejectUnauthorized: false });
    socket.setTimeout(5000, () => socket.destroy(new Error('Délai TLS dépassé.')));
    socket.once('error', (error) => done(error));
    socket.once('secureConnect', () => {
      const fingerprint = socket.getPeerCertificate().fingerprint256;
      if (!fingerprint || (expected && fingerprint.toUpperCase() !== expected.toUpperCase())) {
        socket.destroy();
        done(new Error('Certificat de la télévision différent.'));
        return;
      }
      socket.setTimeout(0);
      observe(fingerprint);
      done(null, socket);
    });
    // Node's Agent supports async createConnection callbacks; its TS declaration requires a socket return.
    return undefined as unknown as TLSSocket;
  };
  return agent;
}

/** Pair explicitly, or send one whitelisted key through an already paired, pinned connection. */
export async function samsungRemote(
  device: DeviceConfig,
  action?: MediaAction,
  options: RemoteOptions = {},
): Promise<{ token: string; fingerprint256: string }> {
  const pairing = options.pairing === true;
  const key = action ? SAMSUNG_REMOTE_KEYS[action] : undefined;
  if (!pairing && (!key || !device.samsungToken || !device.samsungFingerprint256)) throw new LanError('Appairage Samsung requis ; aucune touche envoyée.', 409);
  const port = device.samsungPort ?? 8002;
  let fingerprint256 = '';
  const agent = pinnedAgent(device.host, port, pairing ? undefined : device.samsungFingerprint256, (fp) => { fingerprint256 = fp; });
  const url = new URL(`wss://${device.host}:${port}/api/v2/channels/samsung.remote.control`);
  url.searchParams.set('name', Buffer.from('Trano').toString('base64'));
  if (!pairing) url.searchParams.set('token', device.samsungToken!);
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url.href, { agent, handshakeTimeout: 8000, maxPayload: 65536 });
    let settled = false;
    let sending = false;
    const timer = setTimeout(() => finish(new LanError(pairing ? 'Appairage expiré : accepte Trano sur la télévision puis recommence.' : 'Télécommande Samsung sans réponse.')), options.timeoutMs ?? (pairing ? 60_000 : 8000));
    function finish(error?: LanError, value?: { token: string; fingerprint256: string }) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.terminate();
      agent.destroy();
      if (error) reject(error); else resolve(value!);
    }
    socket.on('error', () => finish(new LanError('Connexion Samsung refusée, certificat différent ou télévision injoignable.')));
    socket.on('close', () => finish(new LanError('Connexion Samsung fermée avant confirmation.')));
    socket.on('message', (data: Buffer) => {
      let message: { event?: string; data?: { token?: unknown } };
      try { message = JSON.parse(data.toString('utf8')); } catch { return; }
      if (!message || typeof message !== 'object' || Array.isArray(message)) return;
      if (message.event === 'ms.channel.unauthorized' || message.event === 'ms.channel.timeOut') {
        finish(new LanError('Autorisation Samsung refusée ou expirée : appairage sur place requis.', 409)); return;
      }
      if (message.event === 'ms.error') { finish(new LanError('Télécommande Samsung refusée par la télévision.')); return; }
      if (message.event !== 'ms.channel.connect' || sending) return;
      const token = pairing ? message.data?.token : device.samsungToken;
      if (typeof token !== 'string' || !/^[A-Za-z0-9._~-]{1,512}$/.test(token) || !fingerprint256) {
        finish(new LanError('La télévision n’a pas fourni un appairage réutilisable.')); return;
      }
      if (pairing) { finish(undefined, { token, fingerprint256 }); return; }
      sending = true;
      socket.send(JSON.stringify({ method: 'ms.remote.control', params: {
        Cmd: 'Click', DataOfCmd: key, Option: 'false', TypeOfRemote: 'SendRemoteKey',
      } }), (error) => {
        if (error) { finish(new LanError('Transmission Samsung interrompue ; ne pas réessayer une bascule sans vérifier l’appareil.')); return; }
        // Sending is not an appliance acknowledgement; allow errors to arrive and don't invent state.
        setTimeout(() => finish(undefined, { token, fingerprint256 }), 300).unref();
      });
    });
  });
}

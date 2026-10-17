import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { buildApp } from './app';

loadEnv({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });
const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535.');
const app = buildApp();
try {
  await app.listen({ host: '127.0.0.1', port });
  console.log(`RoomPilot API: http://127.0.0.1:${port}`);
} catch {
  console.error('RoomPilot API could not start. Check the port and local configuration.');
  process.exitCode = 1;
}
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void app.close(); });

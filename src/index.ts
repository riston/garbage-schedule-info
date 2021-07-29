import pino from 'pino';

import { ApplicationConfig, Context, createServer } from './server/index';
import { unsafeGet } from './utils';

async function main() {
  const port = parseInt(process.env.PORT ?? '3000', 10);
  const tokenConfig = unsafeGet(
    process.env.TOKEN_CONFIG ?? '{"INVALID":"VALUE"}',
    ApplicationConfig,
  );

  const logger = pino();
  const context: Context = {
    tokenConfig,
    logger,
  };
  const server = createServer(context, {
    port,
  });

  await server.start();
}

main().catch(console.error);

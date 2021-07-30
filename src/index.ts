import pino from 'pino';
import { fetchAndParse } from './fetcher/fetch';

import { createServer } from './server/index';
import { ApplicationConfig, Context } from './server/type';
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
    fetchAndParseFn: fetchAndParse,
  };
  const server = createServer(context, {
    port,
  });

  await server.start();
}

main().catch(console.error);

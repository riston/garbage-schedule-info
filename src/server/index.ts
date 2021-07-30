import { Server } from 'http';
import Koa from 'koa';

import { createHttpTerminator, HttpTerminator } from 'http-terminator';
import { ApplicationServer, Context, ServerConfig } from './type';
import {
  errorHandlerMiddleware,
  requestHandlerMiddleware,
  requestLoggerMiddleware,
} from './handler';

export const createServer = (
  context: Context,
  config: ServerConfig,
): ApplicationServer => {
  const { logger } = context;
  const app = new Koa();

  app.use(errorHandlerMiddleware);
  app.use(requestLoggerMiddleware(context));
  app.use(requestHandlerMiddleware(context));

  let httpTerminator: HttpTerminator | null = null;
  let server: Server | null = null;

  const addSigTermHandler = () => {
    process.once('SIGTERM', async () => {
      logger.info('Received sigterm signal');
      await stop();
    });
  };

  const start = async () => {
    return new Promise((resolve) => {
      server = app.listen(config.port, () => {
        logger.info('Server started');
        return resolve(undefined);
      });
    }).then(() => {
      if (server === null) {
        logger.error('Unable to assign Http terminator');
        return Promise.reject();
      }

      addSigTermHandler();
      httpTerminator = createHttpTerminator({ server });
      return Promise.resolve();
    });
  };

  const stop = async () => {
    await httpTerminator?.terminate();
    logger.info('Shutting down server');
  };

  return {
    start,
    stop,
    getApplication() {
      return app;
    },
  };
};

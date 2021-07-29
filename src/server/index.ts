import { Server } from 'http';
import Koa from 'koa';
import pino from 'pino';

import { createHttpTerminator, HttpTerminator } from 'http-terminator';
import * as D from 'io-ts/Decoder';
import * as E from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';
import { FetchParams } from '../fetcher/fetch';

export const TokenConfig: D.Decoder<
  unknown,
  Record<string, FetchParams>
> = D.record(FetchParams);
export type TokenConfig = D.TypeOf<typeof TokenConfig>;

export const ApplicationConfig: D.Decoder<unknown, TokenConfig> = pipe(
  D.string,
  D.parse((s) => {
    const rawConfig: unknown = JSON.parse(s);

    const result = pipe(
      TokenConfig.decode(rawConfig),
      E.fold(
        (errors) => E.left(D.draw(errors)),
        (config) => E.right(config),
      ),
    );

    return E.isRight(result)
      ? D.success(result.right)
      : D.failure(s, 'Invalid application config');
  }),
);

export const ServerConfig = pipe(
  D.struct({
    port: D.number,
  }),
  D.intersect(D.partial({})),
);
export type ServerConfig = D.TypeOf<typeof ServerConfig>;

export interface Context {
  logger: pino.Logger;
  tokenConfig: TokenConfig;
}

export interface ApplicationServer {
  start(): Promise<void>;
  stop(): Promise<void>;
  getApplication(): Koa;
}

const getClientIp = (ctx: Koa.Context) => {
  const { headers } = ctx.request;
  const forwardedFor = headers['x-forwarded-for'];
  if (forwardedFor === undefined) {
    return ctx.req.socket.remoteAddress;
  }
  if (Array.isArray(forwardedFor)) {
    return forwardedFor[0];
  }
  return forwardedFor.split(',')[0];
};

const requestLoggerMiddleware =
  (serverContext: Context) => async (ctx: Koa.Context, next: Koa.Next) => {
    const { url, method, query } = ctx.request;
    const { logger } = serverContext;
    const remoteIp = getClientIp(ctx);

    logger.info({ method, query, remoteIp }, `Req > ${url}`);
    await next();
  };

export const createServer = (
  context: Context,
  config: ServerConfig,
): ApplicationServer => {
  const { logger } = context;
  const app = new Koa();

  app.use(async (ctx, next) => {
    try {
      await next();
    } catch (err) {
      ctx.status = err.statusCode || err.status || 500;
      ctx.body = {
        message: err.message,
      };
    }
  });

  app.use(requestLoggerMiddleware(context));
  app.use(async (ctx) => {
    const { query } = ctx.request;
    const decodedQuery = D.struct({ token: D.string }).decode(query);
    if (E.isLeft(decodedQuery)) {
      throw Error('Invalid query parameters');
    }

    const { token } = decodedQuery.right;
    const paramsConfig = context.tokenConfig[token];
    if (paramsConfig === undefined) {
      throw Error('No matching params config found');
    }

    ctx.body = [
      {
        frequency_in_days: 28,
        house: 'Telliskivi tn 4a',
        next_visit_day: '2021-07-31T00:00:00.000Z',
        object: 'Pärnu linn, Pärnu, Pärnu maakond',
        service_type: 'olmeprügi',
      },
    ];
  });

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

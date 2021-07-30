import { ParsedUrlQuery } from 'querystring';
import { IncomingHttpHeaders } from 'http';
import Koa from 'koa';

import * as D from 'io-ts/Decoder';
import * as E from 'fp-ts/lib/Either';
import { Context } from './type';
import { pipe } from 'fp-ts/lib/function';

interface ValidationParams {
  body?: unknown;
  headers?: IncomingHttpHeaders;
  query?: ParsedUrlQuery;
}

type ValidatedContext<T> = Koa.Context & {
  validated: T;
};

export const validationMiddleware =
  <A>(requestType: D.Decoder<ValidationParams, A>) =>
  (handler: (ctx: ValidatedContext<A>, next: Koa.Next) => any) =>
  (ctx: Koa.Context, next: Koa.Next) => {
    const result = requestType.decode({
      body: ctx.body,
      headers: ctx.request.headers,
      query: ctx.request.query,
    });

    if (E.isRight(result)) {
      handler({ ...ctx, validated: result.right }, next);
    } else {
      ctx.status = 406;
      ctx.body = {
        success: false,
        errors: D.draw(result.left),
      };
      next();
    }
  };

export const requestLoggerMiddleware =
  (serverContext: Context) => async (ctx: Koa.Context, next: Koa.Next) => {
    const { url, method, query } = ctx.request;
    const { logger } = serverContext;
    const remoteIp = getClientIp(ctx);

    logger.info({ method, query, remoteIp }, `Req > ${url}`);
    await next();
  };

export const errorHandlerMiddleware = async (
  ctx: Koa.Context,
  next: Koa.Next,
) => {
  try {
    await next();
  } catch (err) {
    ctx.status = err.statusCode || err.status || 500;
    ctx.body = {
      message: err.message,
    };
  }
};

export const requestHandlerMiddleware =
  (serverContext: Context) => async (ctx: Koa.Context) => {
    const { query } = ctx.request;
    const decodedQuery = D.struct({ token: D.string }).decode(query);
    if (E.isLeft(decodedQuery)) {
      throw Error('Invalid query parameters');
    }

    const { token } = decodedQuery.right;
    const paramsConfig = serverContext.tokenConfig[token];
    if (paramsConfig === undefined) {
      throw Error('No matching params config found');
    }
    const { address, region, type } = paramsConfig;

    const fetchResult = await serverContext.fetchAndParseFn({
      address,
      region,
      type,
    });
    pipe(
      fetchResult,
      E.fold(
        (error) => {
          serverContext.logger.error(
            error,
            'Either parsing or fetching failed',
          );
          throw Error('Failed to fetch or parse response');
        },
        (fetched) => {
          ctx.body = fetched;
        },
      ),
    );
  };

function getClientIp(ctx: Koa.Context) {
  const { headers } = ctx.request;
  const forwardedFor = headers['x-forwarded-for'];
  if (forwardedFor === undefined) {
    return ctx.req.socket.remoteAddress;
  }
  if (Array.isArray(forwardedFor)) {
    return forwardedFor[0];
  }
  return forwardedFor.split(',')[0];
}

import Koa from 'koa';
import pino from 'pino';

import * as D from 'io-ts/Decoder';
import * as E from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';
import { FetchParams } from '../fetcher/fetch';
import { ScheduleResult } from '../fetcher/parse';

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
  fetchAndParseFn: (
    params: FetchParams,
  ) => Promise<E.Either<string, ScheduleResult>>;
}

export interface ApplicationServer {
  start(): Promise<void>;
  stop(): Promise<void>;
  getApplication(): Koa;
}

import pino from 'pino';
import supertest from 'supertest';
import request from 'supertest';
import * as E from 'fp-ts/lib/Either';

import { createServer } from '../server';
import { Context, TokenConfig } from '../server/type';
import { ScheduleResult } from '../fetcher/parse';
import { DateTime } from 'luxon';
interface TestContext {
  tokenConfig?: TokenConfig;
}

export const withServer = (
  context: TestContext,
  cb: (
    request: supertest.SuperTest<supertest.Test>,
    serverContext: Context,
  ) => Promise<void>,
): jest.ProvidesCallback => {
  const logger = pino();
  const tokenConfig =
    context.tokenConfig === undefined
      ? {
          xxx: {
            region: 'Virumaa',
            address: 'Test Village 4',
          },
        }
      : context.tokenConfig;

  const serverContext: Context = {
    logger,
    tokenConfig,
    fetchAndParseFn: jest.fn(() =>
      Promise.resolve(
        E.right<string, ScheduleResult>([
          {
            region: 'Rakvere linn, Lääne-Viru maakond',
            house: 'Kuuse & Kadaka 18',
            frequency_in_days: 28,
            next_visit_day: DateTime.fromISO('2021-08-16T00:00:00.000Z'),
            service_type: 'olmeprügi',
          },
        ]),
      ),
    ),
  };
  const server = createServer(serverContext, { port: 5000 });

  const app = server.getApplication();
  const service = request(app.callback());

  return async () => {
    try {
      await cb(service, serverContext);
    } catch (error) {
      fail(error);
    }
  };
};

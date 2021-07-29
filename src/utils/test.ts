import pino from 'pino';
import supertest from 'supertest';
import request from 'supertest';

import { createServer } from '../server';

export const withServer = (
  cb: (request: supertest.SuperTest<supertest.Test>) => Promise<void>,
): jest.ProvidesCallback => {
  const logger = pino();
  const server = createServer(
    {
      logger,
      tokenConfig: {
        xxx: {
          region: 'Virumaa',
          address: 'Test Village 4',
        },
      },
    },
    { port: 5000 },
  );

  const app = server.getApplication();
  const service = request(app.callback());

  return async () => {
    try {
      await cb(service);
    } catch (error) {
      fail(error);
    }
  };
};

import { withServer } from '../../utils/test';

describe('Server handler testing', () => {
  it(
    'should return invalid request',
    withServer({}, async (request, context) => {
      const response = await request.get('/random');

      expect(context.fetchAndParseFn).not.toHaveBeenCalled();
      expect(response.statusCode).toBe(500);
      expect(response.body.message).toEqual('Invalid query parameters');
    }),
  );

  it(
    'request should fail with invalid token',
    withServer({}, async (request, context) => {
      const response = await request
        .get('/')
        .query({ token: 'random-invalid-token' });

      expect(context.fetchAndParseFn).not.toHaveBeenCalled();
      expect(response.statusCode).toBe(500);
      expect(response.body.message).toEqual('No matching params config found');
    }),
  );

  it(
    'should return test config with valid token',
    withServer({}, async (request, context) => {
      const response = await request.get('/').query({ token: 'xxx' });

      expect(context.fetchAndParseFn).toHaveBeenCalledWith({
        address: 'Test Village 4',
        region: 'Virumaa',
        type: undefined,
      });
      expect(response.statusCode).toBe(200);
      expect(response.body).toMatchSnapshot();
    }),
  );
});

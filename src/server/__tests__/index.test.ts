import { withServer } from '../../utils/test'

describe('Server handler testing', () => {
  it(
    'should return invalid request',
    withServer(async (request) => {
      const response = await request.get('/random')

      expect(response.statusCode).toBe(500)
      expect(response.body.message).toEqual('Invalid query parameters')
    })
  )
})

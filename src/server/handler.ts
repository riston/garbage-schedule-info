import { ParsedUrlQuery } from 'querystring'
import { IncomingHttpHeaders } from 'http'
import Koa from 'koa'

import * as D from 'io-ts/Decoder'
import * as E from 'fp-ts/lib/Either'

interface ValidationParams {
  body?: unknown
  headers?: IncomingHttpHeaders
  query?: ParsedUrlQuery
}

type ValidatedContext<T> = Koa.Context & {
  validated: T
}

export const validationMiddleware =
  <A>(requestType: D.Decoder<ValidationParams, A>) =>
  (handler: (ctx: ValidatedContext<A>, next: Koa.Next) => any) =>
  (ctx: Koa.Context, next: Koa.Next) => {
    const result = requestType.decode({
      body: ctx.body,
      headers: ctx.request.headers,
      query: ctx.request.query,
    })

    if (E.isRight(result)) {
      handler({ ...ctx, validated: result.right }, next)
    } else {
      ctx.status = 406
      ctx.body = {
        success: false,
        errors: D.draw(result.left),
      }
      next()
    }
  }

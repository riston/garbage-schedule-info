import * as https from 'https';

import fetch from 'node-fetch';
import * as E from 'fp-ts/lib/Either';
import * as TE from 'fp-ts/lib/TaskEither';
import * as D from 'io-ts/Decoder';
import { flow, pipe } from 'fp-ts/function';

import { parse } from './parse';
import { FetchResponse } from './type';

const BASE_URL = 'https://www.ragnsells.ee';

export const FetchParams = pipe(
  D.struct({
    region: D.string,
    address: D.string,
  }),
  D.intersect(
    D.partial({
      type: D.string,
    }),
  ),
);
export type FetchParams = D.TypeOf<typeof FetchParams>;

const processResponce = flow(
  (response: FetchResponse): E.Either<string, FetchResponse> => {
    return response.status === 200
      ? E.right(response)
      : E.left(response.statusText);
  },
  TE.fromEither,
);

const parseTextResponse = (response: FetchResponse) =>
  TE.tryCatch(
    () => {
      if (!response.ok) {
        throw Error(
          `Request failed to ${response.url} with status code ${response.status}`,
        );
      }

      return response.text();
    },
    (error) => {
      if (error instanceof Error) {
        return `Parsing failed ${error.message}`;
      }
      return 'Parsing failed with unknown error';
    },
  );

function fetchPage(params: FetchParams): TE.TaskEither<string, string> {
  const url = new URL('/klienditugi/graafikud', BASE_URL);

  // url.searchParams.append('type', '1');
  const decodedParams = FetchParams.decode(params);
  if (E.isLeft(decodedParams)) {
    return TE.left('Invalid fetch parameters');
  }

  // Region, example Rakvere linn KOJV
  url.searchParams.append('piirkond', params.region);

  // Region, example Puujala 33
  url.searchParams.append('addr', params.address);

  const fetchPage = (): TE.TaskEither<string, FetchResponse> =>
    TE.tryCatch(
      () =>
        fetch(url.toString(), {
          agent: new https.Agent({
            rejectUnauthorized: false,
          }),
        }),
      (error) => `Fetch failed ${error}`,
    );

  return pipe(
    fetchPage(),
    TE.chain((response) => processResponce(response)),
    TE.chain(parseTextResponse),
  );
}

export async function fetchAndParse(params: FetchParams) {
  return pipe(
    fetchPage(params),
    TE.chainW((content) => {
      const parseResult = parse(content);

      return pipe(
        parseResult,
        E.fold(
          (errors) => TE.left(D.draw(errors)),
          (rows) => TE.right(rows),
        ),
      );
    }),
  )();
}

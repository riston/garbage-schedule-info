import * as cheerio from 'cheerio';
import * as L from 'luxon';

import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/lib/Either';
import * as D from 'io-ts/Decoder';

const NumberFromString: D.Decoder<unknown, number> = pipe(
  D.string,
  D.parse((s) => {
    const str = s.trim();
    if (str === '') {
      return D.success(0);
    }

    const n = parseFloat(s)
    return isNaN(n) ? D.failure(s, 'NumberFromString') : D.success(n)
  })
);

const DateFromString = pipe(
  D.string,
  D.parse((date) => {
    const parsedDate = L.DateTime.fromFormat(date, 'dd.MM.yyyy', { zone: 'utc'});
    return parsedDate.isValid
      ? D.success(parsedDate)
      : D.failure(date, parsedDate.invalidReason ?? 'Invalid date time received');
  }),
);

export const Schedule = pipe(
  D.struct({
    region: D.string,
    house: D.string,
    frequency_in_days: NumberFromString,
    next_visit_day: DateFromString,
  }),
  D.intersect(
    D.partial({
      day: D.string,
      service_type: D.string,
    }),
  ),
);
export type Schedule = D.TypeOf<typeof Schedule>;

export const ScheduleResult = D.array(Schedule);
export type ScheduleResult = D.TypeOf<typeof ScheduleResult>;

export function parse(content: string): E.Either<D.DecodeError, ScheduleResult> {
  const $ = cheerio.load(content);
  const resultTable$ = $('.tulemus_tabel > tbody tr');

  // First row is skipped
  const rows: unknown[] = [];
  for (let index = 1; index < resultTable$.length; index++) {
    const element$ = resultTable$.get(index);
    const columns$ = $('td', element$);
    if (columns$.length !== 6) {
      continue;
    }

    rows.push({
      house: $(columns$.get(0)).text(),
      region: $(columns$.get(1)).text(),
      frequency_in_days: $(columns$.get(2)).text(),
      days: $(columns$.get(3)).text(),
      service_type: $(columns$.get(4)).text().toLowerCase(),
      next_visit_day: $(columns$.get(5)).text(),
    });
  }

  return ScheduleResult.decode(rows);
}
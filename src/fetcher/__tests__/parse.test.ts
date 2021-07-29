import * as fs from 'fs';
import { join } from 'path';
import nock from 'nock';
import { DateTime } from 'luxon';
import * as E from 'fp-ts/Either';

import { parse } from '../parse';

describe('Parsing content', () => {
  it('hello', () => {
    nock('https://www.ragnsells.ee')
      .get('/klienditugi/graafikud')
      .reply(200, 'Content returned');
  });

  it('should parse the single row success case', () => {
    const content = fs.readFileSync(
      join(__dirname, 'fixture', 'example.success.html'),
      'utf-8',
    );
    expect(parse(content)).toEqual(
      E.right([
        {
          house: 'Mägra',
          frequency_in_days: 84,
          next_visit_day: DateTime.fromISO('2021-07-28T00:00:00.000Z', {
            zone: 'utc',
          }),
          region: 'Laadi küla, Häädemeeste, Pärnu maakond',
          service_type: 'olmeprügi',
        },
      ]),
    );
  });

  it('should parse multiple responses', () => {
    const content = fs.readFileSync(
      join(__dirname, 'fixture', 'multiple.success.html'),
      'utf-8',
    );
    const result = parse(content);

    expect(E.right(result)).toMatchSnapshot();
  });

  it('should parse random response', () => {
    const content = fs.readFileSync(
      join(__dirname, 'fixture', 'random.success.html'),
      'utf-8',
    );
    const result = parse(content);

    expect(E.right(result)).toMatchSnapshot();
  });
});

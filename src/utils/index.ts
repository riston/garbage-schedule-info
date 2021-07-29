import * as E from 'fp-ts/lib/Either';
import * as D from 'io-ts/Decoder';

export const unsafeGet = <I, A>(value: I, type: D.Decoder<I, A>): A => {
  const result = type.decode(value);
  if (E.isLeft(result)) {
    throw new Error(D.draw(result.left));
  }
  return result.right;
}
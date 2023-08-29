import asyncPeekerate from 'iter-tools-es/methods/async-peekerate';
import { AsyncApi } from './api.js';
import { Engine } from '../internal/engine.js';
import { parse, Pattern } from '../pattern.js';

export { parse, Pattern };

export const { exec, test, execGlobal } = new AsyncApi(async function* generate(pattern, iterable) {
  const engine = new Engine(pattern);
  let peekr = await asyncPeekerate(iterable);

  try {
    engine.feed(null);

    while (!peekr.done) {
      engine.feed(peekr.value);

      yield* engine.traverse0();

      engine.traverse1();

      if (engine.done) {
        break;
      } else {
        peekr = await peekr.advance();
      }
    }

    if (peekr.done) {
      engine.feed(null);

      yield* engine.traverse0();
    }
  } finally {
    await peekr.return();
  }
});

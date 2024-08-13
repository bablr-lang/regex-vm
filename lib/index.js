import { Coroutine } from '@bablr/coroutine';
import { StreamIterable, getStreamIterator } from '@bablr/agast-helpers/stream';
import { Engine } from './internal/engine.js';
import { gap } from './internal/symbols.js';
import { Pattern, parse } from './pattern.js';
import { flattenCapture } from './internal/captures.js';

export { Pattern };

const parsedPatterns = new WeakMap();

function* __generateMatches(pattern, iterable) {
  if (!parsedPatterns.has(pattern)) {
    parsedPatterns.set(pattern, parse(pattern));
  }

  const parsedPattern = parsedPatterns.get(pattern);
  const engine = new Engine(parsedPattern);
  const co = new Coroutine(getStreamIterator(iterable));

  try {
    co.advance();

    engine.feed(null);

    while (true) {
      if (co.current instanceof Promise) {
        co.current = yield co.current;
      }

      if (co.done) {
        break;
      }

      engine.feed(co.value == null ? gap : co.value);

      for (const match of engine.traverse0()) {
        yield flattenCapture(match);
      }

      engine.traverse1();

      if (engine.done) {
        break;
      } else {
        co.advance();
      }
    }

    if (co.done) {
      engine.feed(null);

      for (const match of engine.traverse0()) {
        yield flattenCapture(match);
      }
    }
  } finally {
    co.return();
  }
}

export const generateMatches = (pattern, iterable) => {
  return new StreamIterable(__generateMatches(pattern, iterable));
};

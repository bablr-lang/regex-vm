import { Coroutine } from '@bablr/coroutine';
import * as sym from './internal/symbols.js';
import { StreamIterable, getStreamIterator } from '@bablr/agast-helpers/stream';
import { RegexEngine } from './internal/engine.js';
import { Pattern, parse } from './pattern.js';
import { flattenCapture } from './internal/captures.js';

export { Pattern, RegexEngine };

const parsedPatterns = new WeakMap();

function* __generateMatches(pattern, iterable) {
  if (!parsedPatterns.has(pattern)) {
    parsedPatterns.set(pattern, parse(pattern));
  }

  const parsedPattern = parsedPatterns.get(pattern);
  const engine = new RegexEngine(parsedPattern);
  const co = new Coroutine(getStreamIterator(iterable));

  try {
    co.advance();

    engine.feed(co.value);

    co.advance();

    while (true) {
      if (co.current instanceof Promise) {
        co.current = yield co.current;
      }

      if (co.done) {
        break;
      }

      engine.feed(co.value == null ? sym.gap : co.value);

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

    if (co.done && engine.context0.nextValue !== sym.EOS) {
      engine.feed(sym.eos);

      for (const match of engine.traverse0()) {
        yield flattenCapture(match);
      }
    }
  } finally {
    co.return();

    if (co.current instanceof Promise) {
      co.current = yield co.current;
    }
  }
}

export const generateMatches = (pattern, iterable) => {
  return new StreamIterable(__generateMatches(pattern, iterable));
};

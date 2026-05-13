import * as sym from './internal/symbols.js';
import { StreamIterable, continue_, getStreamIterator, wait } from '@bablr/agast-helpers/stream';
import { RegexEngine } from './internal/engine.js';
import { Pattern, parse } from './pattern.js';
import { flattenCapture } from './internal/captures.js';

export { Pattern, RegexEngine };

let parsedPatterns = new WeakMap();

function* __generateMatches(pattern, iterable) {
  if (!parsedPatterns.has(pattern)) {
    parsedPatterns.set(pattern, parse(pattern));
  }

  let parsedPattern = parsedPatterns.get(pattern);
  let engine = new RegexEngine(parsedPattern);
  let iter = getStreamIterator(iterable);
  let step;

  try {
    step = iter.next();
    while (step === null || step instanceof Promise) {
      if (step === null) yield continue_(), (step = iter.next());
      if (step instanceof Promise) step = yield wait(step);
    }

    engine.feed(step.value);

    step = iter.next();

    while (true) {
      while (step === null || step instanceof Promise) {
        if (step === null) yield continue_(), (step = iter.next());
        if (step instanceof Promise) step = yield wait(step);
      }

      if (step.done) {
        break;
      }

      engine.feed(step.value == null ? sym.gap : step.value);

      for (const match of engine.traverse0()) {
        yield flattenCapture(match);
      }

      engine.traverse1();

      if (engine.done) {
        break;
      } else {
        step = iter.next();
      }
    }

    if (step.done && engine.context0.nextValue !== sym.EOS) {
      engine.feed(sym.eos);

      for (const match of engine.traverse0()) {
        yield flattenCapture(match);
      }
    }
  } finally {
    step = iter.return();

    while (step === null || step instanceof Promise) {
      if (step === null) yield continue_(), (step = iter.return());
      if (step instanceof Promise) step = yield wait(step);
    }
  }
}

export const generateMatches = (pattern, iterable) => {
  return new StreamIterable(__generateMatches(pattern, iterable));
};

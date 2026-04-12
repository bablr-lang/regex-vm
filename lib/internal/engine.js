import { PatternEngine } from '@bablr/pattern-engine';
import { code } from './literals.js';
import { getPatternInternal } from '../pattern.js';
import { freeze } from '@bablr/agast-helpers/object';

const isSymbol = (value) => typeof value === 'symbol';

export class RegexEngine extends PatternEngine {
  constructor(pattern, options = freeze({})) {
    const pattern_ = getPatternInternal(pattern);

    super(pattern_, freeze({ ...options, global: options.global || pattern_.flags.global }));

    this.repetitionCount = pattern_.initialState.repetitionStates.length;
    this.context0.seenRepetitions = [];
  }

  feed(value) {
    super.feed(isSymbol(value) ? value : code(value));

    this.context0.seenRepetitions = new Array(this.repetitionCount);
  }
}

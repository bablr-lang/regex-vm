import { PatternEngine } from '@bablr/pattern-engine';
import { code } from './literals.js';
import { getPatternInternal } from '../pattern.js';

const isSymbol = (value) => typeof value === 'symbol';

export class RegexEngine extends PatternEngine {
  constructor(pattern, options = {}) {
    const pattern_ = getPatternInternal(pattern);

    super(pattern_, { ...options, global: options.global || pattern_.flags.global });

    this.repetitionCount = pattern_.initialState.repetitionStates.length;
    this.context0.seenRepetitions = [];
  }

  feed(value) {
    super.feed(isSymbol(value) ? value : code(value));

    this.context0.seenRepetitions = new Array(this.repetitionCount);
  }
}

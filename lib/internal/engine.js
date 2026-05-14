import { PatternEngine } from '@bablr/pattern-engine';
import { code } from './literals.js';
import { getPatternInternal } from '../pattern.js';
import { freeze } from '@bablr/agast-helpers/object';

const isSymbol = (value) => typeof value === 'symbol';

export class RegexEngine extends PatternEngine {
  constructor(pattern, options = '{}') {
    const pattern_ = getPatternInternal(pattern);
    if (typeof options !== 'string') throw new Error();
    let options_ = JSON.parse(options);

    super(
      pattern_,
      JSON.stringify({ ...options_, global: options_.global || pattern_.flags.global }),
    );

    this.repetitionCount = pattern_.initialState.repetitionStates.length;
    this.context0.seenRepetitions = [];
  }

  feed(value) {
    super.feed(isSymbol(value) ? value : code(value));

    this.context0.seenRepetitions = new Array(this.repetitionCount);
  }
}

import { EmbeddedRegex } from '@bablr/agast-helpers/symbols';
import { buildPatternInternal } from './internal/regex.js';

const _ = Symbol.for('_');

export const getPatternInternal = (pattern) => {
  return pattern[_];
};

export class Pattern {
  constructor(expr) {
    let ast;

    if (expr instanceof Pattern) {
      return expr;
    } else if (expr.type === EmbeddedRegex) {
      ast = expr.value;
    } else {
      throw new Error('@bablr/regex-vm requires pattern to be parsed');
    }

    this[_] = buildPatternInternal(ast);
  }

  get global() {
    return this[_].flags.global;
  }

  get ignoreCase() {
    return this[_].flags.ignoreCase;
  }

  get multiline() {
    return this[_].flags.multiline;
  }

  get dotAll() {
    return this[_].flags.dotAll;
  }

  get unicode() {
    return this[_].flags.unicode;
  }

  get sticky() {
    return true;
  }
}

export const parse = (expr) => {
  return new Pattern(expr);
};

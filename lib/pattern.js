import { buildPatternInternal } from './internal/regex.js';
import { isObject } from './internal/utils.js';

const _ = Symbol.for('_');

export const getPatternInternal = (pattern) => {
  return pattern[_];
};

export class Pattern {
  constructor(expr) {
    let ast;

    if (expr instanceof Pattern) {
      return expr;
    } else if (isObject(expr) && expr.properties && expr.children) {
      ast = expr;
    } else {
      throw new Error('@bablr/regex requires pattern to be parsed');
    }

    this[_] = buildPatternInternal(ast);
  }

  get global() {
    return this[_].flags.global;
  }

  get ignoreCase() {
    return this[_].flags['ignoreCase'];
  }

  get multiline() {
    return this[_].flags['multiline'];
  }

  get dotAll() {
    return this[_].flags['dotAll'];
  }

  get unicode() {
    return this[_].flags['unicode'];
  }

  get sticky() {
    return this[_].flags['sticky'];
  }
}

export const parse = (expr) => {
  return new Pattern(expr);
};

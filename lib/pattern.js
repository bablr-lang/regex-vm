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
    } else if (isObject(expr) && expr.type === 'Regex') {
      ast = expr;
    } else {
      throw new Error('@bablr/regex requires pattern to be parsed');
    }

    this[_] = buildPatternInternal(ast);
  }
}

export const parse = (expr) => {
  return new Pattern(expr);
};

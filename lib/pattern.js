import { buildPatternInternal } from './internal/regex.js';
import { isString, isObject } from './internal/utils.js';
import { parse as parseAst } from './parser.js';
import { print } from './printer.js';

const _ = Symbol.for('_');

export const getPatternInternal = (pattern) => {
  return pattern[_];
};

export class Pattern {
  constructor(expr) {
    let ast;

    if (expr instanceof Pattern) {
      return expr;
    } else if (isObject(expr) && expr.type === 'RegExpLiteral') {
      ast = expr;
    } else {
      let stringExpr;
      if (isString(expr)) {
        stringExpr = expr;
      } else if (isObject(expr) && expr.source) {
        const obj = expr;
        stringExpr = `/${obj.source}/${obj.flags}`;
        this.source = obj.source;
        this.flags = obj.flags || '';
      } else {
        throw new Error('invalid pattern');
      }

      ast = parseAst(stringExpr, 'RegExpLiteral');
    }

    this[_] = buildPatternInternal(ast);

    this.source = this.source != null ? this.source : print(ast.pattern);
    this.flags = this.flags != null ? this.flags : print(ast.flags);

    Object.assign(this, ast.flags);
  }
}

export const parse = (expr) => {
  return new Pattern(expr);
};

import * as sym from './symbols.js';
import { isArray } from '@bablr/agast-helpers/object';

export const code = (str) => str.codePointAt(0);
const upperCode = (str) => str.toUpperCase().codePointAt(0);
const isSymbol = (value) => typeof value === 'symbol';
const inRange = (value, lo, hi) => {
  if (isSymbol(value)) return false;
  return value >= lo && value <= hi;
};
// prettier-ignore

const c_ = code('_');
const ca = code('a');
const cz = code('z');
const cA = code('A');
const cZ = code('Z');
const c0 = code('0');
const c9 = code('9');
const cSP = code(' ');
const cCR = code('\r');
const cLF = code('\n');
const cHT = code('\t');
const cVT = code('\v');
const cFF = code('\f');

// These definitions are mostly taken from MDN
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Character_Classes

export const testNotNewline = (c) => {
  return c !== cCR && c !== cLF && c !== 0x2028 && c !== 0x2029;
};
export const testDigit = (c) => {
  return inRange(c, c0, c9);
};
export const testSpace = (c) => {
  return (
    c === cSP ||
    c === cCR ||
    c === cLF ||
    c === cHT ||
    c === cVT ||
    c === cFF ||
    inRange(c, 0x2000, 0x200a) ||
    c === 0x00a0 ||
    c === 0x1680 ||
    c === 0x2028 ||
    c === 0x2029 ||
    c === 0x202f ||
    c === 0x205f ||
    c === 0x3000 ||
    c === 0xfeff
  );
};

export const testWord = (c) => {
  return inRange(c, cA, cZ) || inRange(c, ca, cz) || inRange(c, c0, c9) || c === c_;
};
export const testAny = (c) => c !== sym.gap;

export const getCharTester = (node, flags) => {
  if (flags.ignoreCase) {
    let value = upperCode(node);
    return (c) => upperCode(String.fromCharCode(c)) === value;
  } else {
    let expected = code(node);
    return (c) => c === expected;
  }
};

export const getAnyCharSetTester = (node, flags) => {
  return flags.dotAll ? testAny : testNotNewline;
};

export const getCharClassRangeTester = (node, flags) => {
  let { 0: min, 1: max, length } = node;

  if (length !== 2) throw new Error();

  if (flags.ignoreCase) {
    let minCode = upperCode(min);
    let maxCode = upperCode(max);
    return (c) => inRange(upperCode(String.fromCharCode(c)), minCode, maxCode);
  } else {
    let minCode = code(min);
    let maxCode = code(max);
    return (c) => inRange(c, minCode, maxCode);
  }
};

export const getCharClassTester = (node, flags) => {
  let negate = node[0];
  if (typeof negate !== 'boolean') throw new Error();
  let testers = [];
  for (let i = 1; i < node.length; i++) {
    let el = node[i];
    testers.push(isArray(el) ? getCharClassRangeTester(el, flags) : getTester(el, flags));
  }
  let tester = (c) => testers.findIndex((tester) => tester(c)) >= 0;
  return negate ? (c) => !tester(c) : tester;
};

export const gapTester = (c) => c === sym.gap;

export const getTester = (node, flags) => {
  switch (typeof node) {
    case 'string':
      return getCharTester(node, flags);
    case 'symbol':
      switch (node.description) {
        case '.':
          return getAnyCharSetTester(node, flags);

        case 'w':
          return testWord;
        case 'W':
          return (c) => !testWord(c);

        case 's':
          return testSpace;
        case 'S':
          return (c) => !testSpace(c);

        case 'd':
          return testDigit;
        case 'D':
          return (c) => !testDigit(c);

        case 'g':
          return gapTester;

        default:
          throw new Error(`${node.description} cannot be tested`);
      }
    case 'object':
      if (isArray(node)) {
        return getCharClassTester(node, flags);
      } else {
        throw new Error();
      }
      break;
    default:
      throw new Error();
  }
};

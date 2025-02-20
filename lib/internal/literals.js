import { getCooked, printType } from '@bablr/agast-helpers/tree';
import { traverse as traverseBTree } from '@bablr/agast-helpers/btree';
import * as sym from './symbols.js';

export const code = (str) => str.charCodeAt(0);
const upperCode = (str) => str.toUpperCase().charCodeAt(0);
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
    const value = upperCode(getCooked(node));
    return (c) => upperCode(String.fromCharCode(c)) === value;
  } else {
    const expected = code(getCooked(node));
    return (c) => c === expected;
  }
};

export const getAnyCharSetTester = (node, flags) => {
  return flags.dotAll ? testAny : testNotNewline;
};

export const getWordCharSetTester = (node) => {
  const { negate } = node.attributes;
  return negate ? (c) => !testWord(c) : testWord;
};

export const getSpaceCharSetTester = (node) => {
  const { negate } = node.attributes;
  return negate ? (c) => !testSpace(c) : testSpace;
};

export const getDigitCharSetTester = (node) => {
  const { negate } = node.attributes;
  return negate ? (c) => !testDigit(c) : testDigit;
};

export const getCharClassRangeTester = (node, flags) => {
  const { min, max } = node.properties;

  if (flags.ignoreCase) {
    return (c) =>
      inRange(
        upperCode(String.fromCharCode(c)),
        upperCode(getCooked(min.node)),
        upperCode(getCooked(max.node)),
      );
  } else {
    return (c) => inRange(c, code(getCooked(min.node)), code(getCooked(max.node)));
  }
};

export const getCharClassTester = (node, flags) => {
  const { elements } = node.properties;
  const { negate } = node.attributes;
  const testers = [...traverseBTree(elements)].map((el) => getTester(el.node, flags));
  const tester = (c) => testers.findIndex((tester) => tester(c)) >= 0;
  return negate ? (c) => !tester(c) : tester;
};

export const gapTester = (c) => c === sym.gap;

export const getTester = (node, flags) => {
  switch (printType(node.type)) {
    case 'AnyCharacterSet':
      return getAnyCharSetTester(node, flags);

    case 'WordCharacterSet':
      return getWordCharSetTester(node, flags);

    case 'SpaceCharacterSet':
      return getSpaceCharSetTester(node, flags);

    case 'DigitCharacterSet':
      return getDigitCharSetTester(node, flags);

    case 'CharacterClass':
      return getCharClassTester(node, flags);

    case 'CharacterClassRange':
      return getCharClassRangeTester(node, flags);

    case 'Character':
      return getCharTester(node, flags);

    case 'Gap':
      return gapTester;

    default:
      throw new Error(`${printType(node.type)} cannot be tested`);
  }
};

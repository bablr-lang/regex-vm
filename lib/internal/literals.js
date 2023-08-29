export const code = (str) => str.charCodeAt(0);
const upperCode = (str) => str.toUpperCase().charCodeAt(0);
const inRange = (value, lo, hi) => value >= lo && value <= hi;

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
export const testAny = () => true;

// Because this is unimplemented
export const testProperty = () => false;

const testers = {
  digit: testDigit,
  space: testSpace,
  property: testProperty,
  word: testWord,
  any: testAny,
};

export const getCharTester = (node, flags) => {
  if (flags.ignoreCase) {
    const value = upperCode(node.value);
    return (c) => upperCode(String.fromCharCode(c)) === value;
  } else {
    const expected = code(node.value);
    return (c) => c === expected;
  }
};

export const getCharSetTester = (node, flags) => {
  const tester = node.kind === 'any' && !flags.dotAll ? testNotNewline : testers[node.kind];
  return node.negate ? (c) => !tester(c) : tester;
};

export const getCharClassRangeTester = (node, flags) => {
  if (flags.ignoreCase) {
    const upperMin = upperCode(node.min.value.value);
    const upperMax = upperCode(node.max.value.value);
    return (c) => inRange(upperCode(String.fromCharCode(c)), upperMin, upperMax);
  } else {
    const min = code(node.min.value.value);
    const max = code(node.max.value.value);
    return (c) => inRange(c, min, max);
  }
};

export const getCharClassTester = (node, flags) => {
  const testers = node.elements.map((node) => getTester(node.type, node.value, flags));
  const tester = (c) => testers.findIndex((tester) => tester(c)) >= 0;
  return node.negate ? (c) => !tester(c) : tester;
};

export const getTester = (type, node, flags) => {
  switch (type) {
    case 'CharacterSet':
      return getCharSetTester(node, flags);
    case 'CharacterClass':
      return getCharClassTester(node, flags);
    case 'CharacterClassRange':
      return getCharClassRangeTester(node, flags);
    case 'Character':
      return getCharTester(node, flags);
    default:
      throw new Error(`${type} cannot be tested`);
  }
};

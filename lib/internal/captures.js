import {
  buildLiteralTag,
  buildGapTag,
  buildFragmentOpenTag,
  buildFragmentCloseTag,
  buildDoctypeTag,
  syntacticFlags,
  getFlagsWithGap,
} from '@bablr/agast-helpers/builders';

const captureIterator = ({ start = 0, end = Infinity }, arr) => {
  return {
    *[Symbol.iterator]() {
      let literalValue = [];

      yield buildDoctypeTag();

      yield buildFragmentOpenTag(getFlagsWithGap(syntacticFlags));

      for (let i = start; i < end; i++) {
        const value = arr[i];
        if (value === null) {
          if (literalValue.length) {
            yield buildLiteralTag(literalValue.join(''));
            literalValue.length = 0;
          }
          yield buildGapTag();
        } else {
          literalValue.push(value);
        }
      }

      if (literalValue.length) {
        yield buildLiteralTag(literalValue.join(''));
      }

      yield buildFragmentCloseTag();
    },
  };
};

function _flattenCapture(result, capture, captures) {
  const { children, idx, start, end } = capture;
  captures[idx] = captureIterator({ start, end }, result);
  if (result !== null) {
    for (const subCapture of children) {
      _flattenCapture(result, subCapture, captures);
    }
  }
}

export function flattenCapture({ rootCapture, capturesLen }) {
  const captures = new Array(capturesLen).fill(undefined);
  _flattenCapture([...rootCapture.result], rootCapture, captures);
  return captures;
}

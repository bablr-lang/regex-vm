import {
  buildLiteralTag,
  buildGapTag,
  tokenFlags,
  getFlagsWithGap,
  buildOpenNodeTag,
  buildCloseNodeTag,
} from '@bablr/agast-helpers/builders';
import { buildNode } from '@bablr/agast-helpers/path';
import * as Tags from '@bablr/agast-helpers/tags';

const captureIterator = ({ start = 0, end = Infinity }, arr) => {
  return {
    *[Symbol.iterator]() {
      let literalValue = [];

      yield buildOpenNodeTag(getFlagsWithGap(tokenFlags));

      for (let i = start; i < end; i++) {
        const value = arr[i];
        if (value === null) {
          if (literalValue.length) {
            yield buildLiteralTag(literalValue.join(''));
            literalValue.length = 0;
          }
          yield buildNode(Tags.fromValues([buildGapTag()]));
        } else {
          literalValue.push(value);
        }
      }

      if (literalValue.length) {
        yield buildLiteralTag(literalValue.join(''));
      }

      yield buildCloseNodeTag();
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

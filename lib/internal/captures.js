const arraySlice = ({ start = 0, end = Infinity }, arr) => {
  return {
    *[Symbol.iterator]() {
      for (let i = start; i < end; i++) {
        yield arr[i];
      }
    },
  };
};

function _flattenCapture(result, capture, captures) {
  const { children, idx, start, end } = capture;
  captures[idx] = arraySlice({ start, end }, result);
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

function _flattenCapture(capture, captures) {
  const { result, children, idx } = capture;
  captures[idx] = result;
  if (result !== null) {
    for (const subCapture of children) {
      _flattenCapture(subCapture, captures);
    }
  }
}

export function flattenCapture(capture, capturesLen) {
  const captures = new Array(capturesLen).fill(undefined);
  _flattenCapture(capture, captures);
  return captures;
}

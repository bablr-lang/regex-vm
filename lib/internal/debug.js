export const debugPrint = (matcher) => {
  if (matcher === null) return null;

  let m = matcher;
  let str = '';
  while (m !== null) {
    const { props } = m;

    if (typeof matcher.match !== 'function') {
      throw new Error('debugPrint can only print matchers.');
    }

    switch (m.name) {
      case 'character':
        str += props.value;
        break;
      case 'boundaryAssertion':
        str += '\\b';
        break;
      case 'edgeAssertion':
        str += props.kind === 'start' ? '^' : '$';
        break;
      case 'repeat':
        if (props.repeatCont.name !== 'unmatched') {
          str += `(${props.exprCont.seqs.map((m) => debugPrint(m)).join('|')})*`;
        }
        break;
      case 'expression':
        str += `(${props.matchers.map((m) => debugPrint(m)).join('|')})`;
        // m.next is already distributed into m.matchers -- don't print it twice!
        return str;
      default:
        break;
    }
    m = m.next;
  }
  return str;
};

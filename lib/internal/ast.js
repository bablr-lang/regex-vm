export class SimpleVisitor {
  constructor(visitors) {
    this.visitors = visitors;
  }

  visit(node, state) {
    return this.visitors[node.type](node, state, (node) => this.visit(node, state));
  }
}

export function visit(node, state, visitors) {
  return new SimpleVisitor(visitors).visit(node, state);
}

const literalNames = {
  any: '.',
  digit: '\\d',
  space: '\\s',
  word: '\\w',
};

export const getCharSetDesc = (node) => {
  if (node.kind === 'property') {
    return `\\p{${node.key}}`;
  } else {
    return literalNames[node.kind];
  }
};

export const isAnchored = (pattern) =>
  pattern.alternatives.every((alt) => {
    if (!alt.elements.length) return false;
    const first = alt.elements[0];
    // If first is a group we could recurse but I don't see much point.
    if (first.type !== 'Assertion' || first.kind !== 'start') return false;
  });

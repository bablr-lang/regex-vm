export class SimpleVisitor {
  constructor(visitors) {
    this.visitors = visitors;
  }

  visit(node, state) {
    return this.visitors[node.type](
      node.value,
      state,
      (node) => this.visit(node, state),
      node.type,
    );
  }
}

export function visit(node, state, visitors) {
  return new SimpleVisitor(visitors).visit(node, state);
}

export const isAnchored = (node) =>
  node.alternatives.every((alt) => {
    if (!alt.value.elements.length) return false;
    const first = alt.value.elements[0];
    // If first is a group we could recurse but I don't see much point.
    if (first.type !== 'Assertion' || first.value.kind !== 'start') return false;
  });

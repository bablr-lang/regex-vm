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

export const isAnchored = (node) =>
  node.properties.alternatives.every((alt) => {
    if (!alt.properties.elements?.length) return false;
    const first = alt.properties.elements[0];
    // If first is a group we could recurse but I don't see much point.
    if (first.type !== 'Assertion' || first.attributes.kind !== 'start') return false;
  });

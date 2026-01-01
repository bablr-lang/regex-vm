import { printType } from '@bablr/agast-helpers/print';

export class SimpleVisitor {
  constructor(visitors) {
    this.visitors = visitors;
  }

  visit(node, state) {
    return this.visitors[printType(node.value.name)](node, state, (node) =>
      this.visit(node, state),
    );
  }
}

export function visit(node, state, visitors) {
  return new SimpleVisitor(visitors).visit(node, state);
}

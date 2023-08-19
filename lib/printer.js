import { Grammar, productions } from '@bablr/grammar';
import { print as miniprint } from '@bablr/miniparser';

export const grammar = new Grammar({
  productions: productions({
    RegExpLiteral(p) {
      p.print('/');
      p.pushSpan({ type: 'Expression' });
      p.eatProduction(p.node.pattern);
      p.popSpan();
      p.print('/');
      p.eatProduction(p.node.flags);
    },

    Assertion(p) {
      switch (p.node.kind) {
        case 'start':
          p.print('^');
          break;

        case 'end':
          p.print('$');
          break;

        case 'word':
          p.print('\\b');
          break;

        default:
          throw new Error('invalid boundary');
      }
    },

    Alternatives(p) {
      for (const alternative of p.node.alternatives) {
        p.eatProduction(alternative);
      }
    },

    Alternative(p) {
      for (const element of p.node.elements) {
        p.eatProduction(element);
      }
    },

    Group(p) {
      p.print('(?:');
      p.pushSpan({ type: 'Expression' });
      p.eatProduction(p.node, 'Alternatives');
      p.popSpan();
      p.print(')');
    },

    CapturingGroup(p) {
      p.print('(');
      p.pushSpan({ type: 'Expression' });
      p.eatProduction(p.node, 'Alternatives');
      p.popSpan();
      p.print(')');
    },

    Pattern(p) {
      p.eatProduction(p.node, 'Alternatives');
    },

    Character(p) {
      switch (p.node.value) {
        case '\t':
          p.print('\\t');
          break;
        case '\r':
          p.print('\\r');
          break;
        case '\n':
          p.print('\\n');
          break;
        case '\v':
          p.print('\\v');
          break;
        case '\f':
          p.print('\\f');
          break;
        case '\\':
          p.print('\\\\');
          break;
        default:
          if (
            (p.span.type === 'Bare' && '*+{}[]().^$|'.includes(p.node.value)) ||
            (p.span.type === 'CharacterClass' && ']'.includes(p.node.value)) ||
            (p.span.type === 'CharacterClass:NoRange' && ']-'.includes(p.node.value)) ||
            (p.span.type === 'CharacterClass:NoNegate' && ']^'.includes(p.node.value))
          ) {
            p.print('\\');
          }
          p.print(p.node.value);
          break;
      }
    },

    CharacterClass(p) {
      p.print('[');

      if (p.node.negate) {
        p.print('^');
      }

      p.pushSpan({ type: 'CharacterClass:NoNegate' });

      for (const element of p.node.elements) {
        p.eatProduction(element);
      }

      p.popSpan();
      p.print(']');
    },

    CharacterClassRange(p) {
      p.eatProduction(p.node.min);
      p.replaceSpan({ type: 'CharacterClass' });
      p.print('-');
      p.eatProduction(p.node.max);
      p.replaceSpan({ type: 'CharacterClass:NoRange' });
    },

    CharacterSet(p) {
      switch (p.node.kind) {
        case 'any':
          p.print('.');
          break;
        case 'space':
          p.print('\\s');
          break;
        case 'word':
          p.print('\\w');
          break;
        case 'digit':
          p.print('\\d');
          break;
        case 'property':
          throw new Error('unicode property character sets are not supported yet');
        default:
          throw new Error('unknown character set kind');
      }
    },

    Quantifier(p) {
      const { min, max, greedy } = p.node;

      p.eatProduction(p.node.element);

      if (max === Infinity) {
        if (min === 0) {
          p.print('*');
        } else if (min === 1) {
          p.print('+');
        } else {
          p.print(`{${min}}`);
        }
      } else {
        p.print`{${min},${max}}`;
      }

      if (greedy) {
        p.print('?');
      }
    },

    Flags(p) {
      if (p.node.global) p.print('g');
      if (p.node.ignoreCase) p.print('i');
      if (p.node.multiline) p.print('m');
      if (p.node.dotAll) p.print('s');
      if (p.node.unicode) p.print('u');
      if (p.node.sticky) p.print('y');
    },
  }),
});

export const print = (node) => {
  miniprint(grammar, node);
};

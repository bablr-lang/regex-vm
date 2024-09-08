import emptyStack from '@iter-tools/imm-stack';
import * as sym from '@bablr/pattern-engine/symbols';
import { visit } from './ast.js';
import { getTester, testNotNewline, testWord } from './literals.js';
import createTree from 'functional-red-black-tree';

const identity = (next) => next;

const compose = (lExp, rExp) => {
  return (next) => lExp(rExp(next));
};

const term = (global, capturesLen) => ({
  type: sym.cont,
  width: 0,
  name: 'term',
  next: null,
  match: (state) => {
    const { captureStack } = state;

    const rootCapture = captureStack.peek().peek();

    return {
      type: sym.success,
      global,
      captures: { capturesLen, rootCapture },
    };
  },
  props: { global, capturesLen },
});

// match a character
const character = (value, flags) => (next) => {
  const tester = getTester(value, flags);
  return {
    type: sym.cont,
    width: 1,
    name: 'character',
    next,
    match: (state, { value }) => {
      if (tester(value)) {
        state.result = state.result.push(value === sym.gap ? null : String.fromCharCode(value));
        return next;
      } else {
        return null;
      }
    },
    props: { value, flags },
  };
};

const expression = (matchers) => (next) => {
  const boundMatchers = matchers.map((matcher) => matcher(next));
  const result = { type: sym.expr, seqs: boundMatchers };

  return {
    type: sym.cont,
    width: 0,
    name: 'expression',
    next,
    match: () => result,
    props: { matchers: boundMatchers },
  };
};

const resetRepetitionStates = (idxs, initialRepetitionStates) => (next) => {
  return {
    type: sym.cont,
    width: 0,
    name: 'resetRepetitionStates',
    next,
    match: (state) => {
      let { repetitionStates } = state;
      for (const idx of idxs) {
        repetitionStates = repetitionStates.find(idx).update(initialRepetitionStates[idx]);
      }

      state.repetitionStates = repetitionStates;

      return next;
    },
    props: { idxs, initialRepetitionStates },
  };
};

const edgeAssertion = (kind, flags) => (next) => {
  return {
    type: sym.cont,
    width: 0,
    name: 'edgeAssertion',
    next,
    match: flags.multiline
      ? kind === 'start'
        ? (state, context) => {
            const { lastValue } = context;
            return lastValue === sym.bos || !testNotNewline(lastValue) ? next : null;
          }
        : (state, context) => {
            const { nextValue } = context;
            return nextValue === sym.eos || !testNotNewline(nextValue) ? next : null;
          }
      : kind === 'start'
      ? (state, context) => {
          const { lastValue } = context;
          return lastValue === sym.bos ? next : null;
        }
      : (state, context) => {
          const { nextValue } = context;
          return nextValue === sym.eos ? next : null;
        },
    props: { kind },
  };
};

const boundaryAssertion = () => (next) => {
  return {
    type: sym.cont,
    width: 0,
    name: 'boundaryAssertion',
    next,
    match: (state, context) => {
      const { lastValue, nextValue } = context;
      const lastIsWord = lastValue === -1 ? false : testWord(lastValue);
      const nextIsWord = nextValue === -1 ? false : testWord(nextValue);
      return lastIsWord !== nextIsWord ? next : null;
    },
    props: {},
  };
};

const repeat =
  (exp, key, greedy = true) =>
  (next) => {
    const matcher = {
      type: sym.cont,
      width: 0,
      name: 'repeat',
      next,
      match: (state, context) => {
        const repStateNode = state.repetitionStates.find(key);
        const { min, max } = repStateNode.value;

        if (context.seenRepetitions[key]) {
          return null;
        } else if (max === 0) {
          return next;
        } else {
          context.seenRepetitions[key] = true;
          const nextRepState = {
            min: min === 0 ? 0 : min - 1,
            max: max === 0 ? 0 : max - 1,
            context,
          };
          state.repetitionStates = repStateNode.update(nextRepState);

          return min > 0 ? repeatCont : exprCont;
        }
      },
      props: { key, greedy },
    };

    const repeatCont = exp(matcher);
    const exprCont = {
      type: sym.expr,
      seqs: greedy ? [repeatCont, next] : [next, repeatCont],
    };

    matcher.props.repeatCont = repeatCont;
    matcher.props.exprCont = exprCont;

    return matcher;
  };

const startCapture = (idx) => (next) => {
  return {
    type: sym.cont,
    width: 0,
    name: 'startCapture',
    next,
    match: (state) => {
      const { result, captureStack } = state;
      const captureList = captureStack.peek();

      const partialCapture = {
        idx,
        start: result === null ? 0 : result.size,
        end: null,
        result: null,
        children: emptyStack,
      };

      state.captureStack = captureStack.replace(captureList.push(partialCapture)).push(emptyStack);
      state.result = result === null ? emptyStack : result;

      return next;
    },
    props: { idx },
  };
};

const endCapture = () => (next) => {
  return {
    type: sym.cont,
    width: 0,
    name: 'endCapture',
    next,
    match: (state) => {
      const { result } = state;
      let { captureStack } = state;
      const children = captureStack.peek();

      state.captureStack = captureStack = state.captureStack.pop();

      let captureList = captureStack.peek();
      const partialCapture = captureList.peek();
      const { idx, start } = partialCapture;
      const end = result.size;

      captureList = captureList.pop();

      const capture = {
        idx,
        start,
        end,
        children,
        result: captureStack.size === 1 ? result : null,
      };

      if (captureList.size > 0 && captureList.peek().idx === capture.idx) {
        // Subsequent matches of the same capture group overwrite
        captureList = captureList.prev;
      }

      captureList = captureList.push(capture);

      state.result = captureStack.size === 1 ? null : result;
      state.captureStack = captureStack.replace(captureList);

      return next;
    },
    props: {},
  };
};

const capture = (idx, exp) => {
  return compose(startCapture(idx), compose(exp, endCapture()));
};

const visitExpression = (alternatives, state, visit) => {
  const qIdxs = (state.qIdxs = []);

  const reset = resetRepetitionStates(qIdxs, state.initialRepetitionStates);

  // prettier-ignore
  switch (alternatives.length) {
    case 0: return identity;
    case 1: return compose(reset, visit(alternatives[0]));
    default: return expression(alternatives.map(alt => compose(reset, visit(alt))));
  }
};

const visitors = {
  Backreference: () => {
    throw new Error('Regex backreferences not implemented');
  },

  WordBoundaryAssertion: (node, state) => {
    return boundaryAssertion();
  },

  StartOfInputAssertion: (node, state) => {
    return edgeAssertion('start', state.flags);
  },

  EndOfInputAssertion: (node, state) => {
    return edgeAssertion('end', state.flags);
  },

  Alternative: (node, state, visit) => {
    const { elements = [] } = node.properties;

    return elements.map(visit).reduce(compose, identity);
  },

  Group: (node, state, visit) => {
    const { alternatives } = node.properties;

    return visitExpression(alternatives, state, visit);
  },

  CapturingGroup: (node, state, visit) => {
    const { alternatives } = node.properties;
    if (typeof node.name === 'string') {
      throw new Error('Regex named capturing groups not implemented');
    }

    return capture(++state.cIdx, visitExpression(alternatives, state, visit));
  },

  Pattern: (node, state, visit) => {
    const { alternatives } = node.properties;
    const qIdx = ++state.qIdx;

    state.initialRepetitionStates[qIdx] = { min: 0, max: Infinity };

    return capture(++state.cIdx, visitExpression(alternatives, state, visit));
  },

  Gap: (node, state) => {
    return character(node, state.flags);
  },

  Character: (node, state) => {
    return character(node, state.flags);
  },

  CharacterClass: (node, state) => {
    return character(node, state.flags);
  },

  AnyCharacterSet: (node, state) => {
    return character(node, state.flags);
  },

  WordCharacterSet: (node, state) => {
    return character(node, state.flags);
  },

  SpaceCharacterSet: (node, state) => {
    return character(node, state.flags);
  },

  DigitCharacterSet: (node, state) => {
    return character(node, state.flags);
  },

  Quantifier: (node, state, visit) => {
    const { min, max, greedy } = node.attributes;
    const { element } = node.properties;
    // See https://github.com/mysticatea/regexpp/issues/21
    if (min > max) {
      throw new Error('numbers out of order in {} quantifier');
    }
    const qIdx = ++state.qIdx;
    state.qIdxs.push(qIdx);

    state.initialRepetitionStates[qIdx] = { min, max };
    return repeat(visit(element), qIdx, greedy);
  },
};

const defaultFlags = {
  global: false,
  ignoreCase: false,
  multiline: false,
  dotAll: false,
  unicode: false,
};

export const buildPatternInternal = (node) => {
  const flags = {
    ...defaultFlags,
    ...node.properties.flags?.attributes,
  };

  const pState = {
    cIdx: -1, // capture index
    qIdx: -1, // quantifier index
    flags,
    qIdxs: [],
    initialRepetitionStates: [],
  };

  if (pState.flags.unicode) {
    throw new Error('Regex u flag is unsupported');
  }

  const seq = visit(node, pState, visitors);

  const initialState = {
    result: null,
    captureStack: emptyStack.push(emptyStack),
    repetitionStates: pState.initialRepetitionStates.reduce(
      (tree, state, i) => tree.insert(i, state),
      createTree((a, b) => a - b),
    ),
  };

  // Bind `next` arguments. The final `next` value is the Tag state.
  const matcher = seq(term(pState.flags.global, pState.cIdx + 1));

  return { initialState, matcher, flags };
};

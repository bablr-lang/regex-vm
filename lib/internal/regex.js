import emptyStack from '@iter-tools/imm-stack';
import createTree from 'functional-red-black-tree';
import { isArray } from '@bablr/agast-helpers/object';
import { getTester, testNotNewline, testWord } from './literals.js';
import * as sym from './symbols.js';

let identity = (next) => next;

let isNumber = (value) => typeof value === 'number';

let compose = (outer, inner) => {
  if (!outer || !inner) throw new Error();
  return (next) => outer(inner(next));
};

let term = (global, capturesLen) => ({
  type: sym.cont,
  width: 0,
  name: 'term',
  next: null,
  match: (state) => {
    let { captureStack } = state;

    let rootCapture = captureStack.peek().peek();

    return {
      type: sym.success,
      global,
      captures: { capturesLen, rootCapture },
    };
  },
  props: { global, capturesLen },
});

// match a character
let character = (value, flags) => (next) => {
  let tester = getTester(value, flags);
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

let expression = (matchers) => (next) => {
  let boundMatchers = matchers.map((matcher) => matcher(next));
  let result = { type: sym.expr, seqs: boundMatchers };

  return {
    type: sym.cont,
    width: 0,
    name: 'expression',
    next,
    match: () => result,
    props: { matchers: boundMatchers },
  };
};

let resetRepetitionStates = (idxs, initialRepetitionStates) => (next) => {
  return {
    type: sym.cont,
    width: 0,
    name: 'resetRepetitionStates',
    next,
    match: (state) => {
      let { repetitionStates } = state;
      for (let idx of idxs) {
        repetitionStates = repetitionStates.find(idx).update(initialRepetitionStates[idx]);
      }

      state.repetitionStates = repetitionStates;

      return next;
    },
    props: { idxs, initialRepetitionStates },
  };
};

let edgeAssertion = (kind, flags) => (next) => {
  return {
    type: sym.cont,
    width: 0,
    name: 'edgeAssertion',
    next,
    match: flags.multiline
      ? kind === 'start'
        ? (state, context) => {
            let { lastValue } = context;
            return lastValue === sym.bos || !testNotNewline(lastValue) ? next : null;
          }
        : (state, context) => {
            let { nextValue } = context;
            return nextValue === sym.eos || !testNotNewline(nextValue) ? next : null;
          }
      : kind === 'start'
      ? (state, context) => {
          let { lastValue } = context;
          return lastValue === sym.bos ? next : null;
        }
      : (state, context) => {
          let { nextValue } = context;
          return nextValue === sym.eos ? next : null;
        },
    props: { kind },
  };
};

let boundaryAssertion = () => (next) => {
  return {
    type: sym.cont,
    width: 0,
    name: 'boundaryAssertion',
    next,
    match: (state, context) => {
      let { lastValue, nextValue } = context;
      let lastIsWord = lastValue === -1 ? false : testWord(lastValue);
      let nextIsWord = nextValue === -1 ? false : testWord(nextValue);
      return lastIsWord !== nextIsWord ? next : null;
    },
    props: {},
  };
};

let repeat =
  (exp, key, greedy = true) =>
  (next) => {
    let matcher = {
      type: sym.cont,
      width: 0,
      name: 'repeat',
      next,
      match: (state, context) => {
        let repStateNode = state.repetitionStates.find(key);
        let { min, max } = repStateNode.value;

        if (context.seenRepetitions[key]) {
          return null;
        } else if (max === 0) {
          return next;
        } else {
          context.seenRepetitions[key] = true;
          let nextRepState = {
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

    let repeatCont = exp(matcher);
    let exprCont = {
      type: sym.expr,
      seqs: greedy ? [repeatCont, next] : [next, repeatCont],
    };

    matcher.props.repeatCont = repeatCont;
    matcher.props.exprCont = exprCont;

    return matcher;
  };

let startCapture = (idx) => (next) => {
  return {
    type: sym.cont,
    width: 0,
    name: 'startCapture',
    next,
    match: (state) => {
      let { result, captureStack } = state;
      let captureList = captureStack.peek();

      let partialCapture = {
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

let endCapture = () => (next) => {
  return {
    type: sym.cont,
    width: 0,
    name: 'endCapture',
    next,
    match: (state) => {
      let { result } = state;
      let { captureStack } = state;
      let children = captureStack.peek();

      state.captureStack = captureStack = state.captureStack.pop();

      let captureList = captureStack.peek();
      let partialCapture = captureList.peek();
      let { idx, start } = partialCapture;
      let end = result.size;

      captureList = captureList.pop();

      let capture = {
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

let capture = (idx, exp) => {
  return compose(startCapture(idx), compose(exp, endCapture()));
};

let visitAlternatives = (alternatives, state) => {
  let qIdxs = (state.qIdxs = []);

  let reset = resetRepetitionStates(qIdxs, state.initialRepetitionStates);

  // prettier-ignore
  switch (alternatives.length) {
    case 0: return identity;
    case 1: return compose(reset, visitAlternative(alternatives[0], state));
    default: return expression(Array.prototype.map.call(alternatives, alt => compose(reset, visitAlternative(alt, state))));
  }
};

let visitExpression = (expression, state) => {
  let { capture: shouldCapture, name, alternatives } = expression;
  if (typeof name === 'string') {
    throw new Error('Regex named capturing groups not implemented');
  }

  return shouldCapture
    ? capture(++state.cIdx, visitAlternatives(alternatives, state))
    : visitAlternatives(alternatives, state);
};

let visitAlternative = (elements, state) => {
  let result = identity;

  for (let i = 0; i < elements.length; i++) {
    let element = elements[i];
    if (isNumber(elements[i + 1])) {
      let min = elements[i + 1];
      let max = elements[i + 2];
      let greedy = elements[i + 3];

      i += 3;

      // See https://github.com/mysticatea/regexpp/issues/21
      if (min > max) {
        throw new Error('numbers out of order in {} quantifier');
      }
      let qIdx = ++state.qIdx;
      state.qIdxs.push(qIdx);

      state.initialRepetitionStates[qIdx] = { min, max };

      result = compose(result, repeat(visitElement(element, state), qIdx, greedy));
    } else {
      result = compose(result, visitElement(element, state));
    }
  }
  return result;
};

let visitPattern = (node, state) => {
  let { expression } = node;
  let qIdx = ++state.qIdx;

  state.initialRepetitionStates[qIdx] = { min: 0, max: Infinity };

  return visitExpression(expression, state);
};

let visitElement = (node, state) => {
  switch (typeof node) {
    case 'object':
      if (isArray(node)) {
        return character(node, state.flags);
      } else {
        return visitExpression(node, state);
      }

    case 'string':
      return character(node, state.flags);

    case 'symbol':
      let desc = node.description;
      let chr = desc[0];

      if (chr >= '0' && chr <= '9') {
        throw new Error('backreferences not supported');
      } else if (chr === '^') {
        return edgeAssertion('start', state.flags);
      } else if (chr === '$') {
        return edgeAssertion('end', state.flags);
      } else if (chr === 'b') {
        return boundaryAssertion();
      } else {
        return character(node, state.flags);
      }
  }
};

let defaultFlags = {
  global: false,
  ignoreCase: false,
  multiline: false,
  dotAll: false,
  unicode: false,
};

let patterns = new WeakMap();

export const buildPatternInternal = (node) => {
  if (patterns.has(node)) {
    return patterns.get(node);
  }

  let flags = {
    ...defaultFlags,
    ...node.flags,
  };

  let pState = {
    cIdx: -1, // capture index
    qIdx: -1, // quantifier index
    flags,
    qIdxs: [],
    initialRepetitionStates: [],
  };

  if (flags.unicode) {
    throw new Error('Regex u flag is unsupported');
  }

  if (!flags.sticky) {
    throw new Error('Regex y flag is required');
  }

  if (!node.expression.capture) throw new Error();

  let seq = visitPattern(node, pState);

  let initialState = {
    result: null,
    captureStack: emptyStack.push(emptyStack),
    repetitionStates: pState.initialRepetitionStates.reduce(
      (tree, state, i) => tree.insert(i, state),
      createTree((a, b) => a - b),
    ),
  };

  // Bind `next` arguments. The final `next` value is the tag state.
  let matcher = seq(term(pState.flags.global, pState.cIdx + 1));

  let returnValue = { initialState, matcher, flags };

  patterns.set(node, returnValue);

  return returnValue;
};

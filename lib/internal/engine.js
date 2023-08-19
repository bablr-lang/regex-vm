import { code } from './literals.js';
import { getPatternInternal } from '../pattern.js';
import * as sym from './symbols.js';

const cloneMatcherState = (state) => {
  const { result, captureStack, repetitionStates } = state;
  return { result, captureStack, repetitionStates };
};

export class Node {
  constructor(data = null) {
    this.worse = null;
    this.data = data;
  }
}

export class Sequence {
  constructor(next, mutableState) {
    this.next = next;
    this.mutableState = mutableState;
  }
}

// A match represents two closely related things:
//   - a pending match: the root expression of a continuing line of evaluation which may or may not succeed
//   - a successful match: a placeholder for results while better alternatives being evaluated
// When the global flag is enabled a single match may be both these things at the same time.
export class Match {
  constructor(pattern, globalIdx, captures = null) {
    this.pattern = pattern;
    // Disambiguate between successive occurences of the pattern when matching globally
    this.globalIdx = globalIdx;
    // Ensures prevNode is always defined so we can replace using `prevNode.worse = ...`
    this.head = new Node();
    this.captures = captures;

    if (pattern.global || globalIdx === 0) {
      const { initialState, matcher } = getPatternInternal(pattern);

      this.head.worse = new Node(new Sequence(matcher, cloneMatcherState(initialState)));
    }
  }
}

export class Engine {
  constructor(pattern) {
    this.global = pattern.global;
    this.repetitionCount = getPatternInternal(pattern).initialState.repetitionStates.length;

    this.root = new Match(pattern, 0);
    this.match = this.root;

    this.index = 0;
    this.starved = true;
    this.context0 = {
      width: 0,
      lastChr: undefined,
      lastCode: -1,
      nextChr: undefined,
      nextCode: -1,
      seenRepetitions: [],
    };
    this.context1 = {
      width: 1,
      chr: undefined,
      chrCode: -1,
    };
    this.context = this.context0;
    this.prevNode = null;
    this.node = null;
  }

  get done() {
    return this.root.head.worse === null;
  }

  feed(chr) {
    const { context0: ctx0, context1: ctx1 } = this;

    ctx0.lastChr = ctx0.nextChr;
    ctx0.lastCode = ctx0.nextCode;
    ctx0.nextChr = chr;
    ctx0.nextCode = chr === null ? -1 : code(chr);
    ctx0.seenRepetitions = new Array(this.repetitionCount);

    if (ctx0.lastChr !== undefined) {
      this.starved = false;
    }

    if (ctx0.nextChr !== null) {
      ctx1.chr = ctx0.nextChr;
      ctx1.chrCode = ctx0.nextCode;
    }
  }

  startTraversal(match) {
    const { head } = match;
    this.prevNode = head;
    this.node = head.worse;
    this.match = match;
  }

  fail() {
    if (!(this.node?.data instanceof Sequence)) throw new Error();

    this.prevNode.worse = this.node = this.node.worse;
  }

  succeed(captures) {
    const { node, match } = this;
    if (!(node?.data instanceof Sequence)) throw new Error();
    const { pattern, globalIdx } = match;

    // Stop matching any worse alternatives
    this.prevNode.worse = this.node = new Node(new Match(pattern, globalIdx + 1, captures));
  }

  explode(matchers) {
    const { node } = this;
    if (!(node?.data instanceof Sequence)) throw new Error();

    const { worse } = node;
    const { mutableState } = node.data;

    let prev = this.prevNode;
    let seq = undefined;
    for (const matcher of matchers) {
      seq = new Node(new Sequence(matcher, cloneMatcherState(mutableState)));
      prev.worse = seq;
      prev = seq;
    }

    seq.worse = worse;

    // continue from the first of the nodes we just inserted
    this.node = this.prevNode.worse;
  }

  apply(state) {
    if (!(this.node?.data instanceof Sequence)) throw new Error();

    if (state === null) {
      this.fail();
    } else if (state.type === sym.success) {
      this.succeed(state.captures);
    } else if (state.type === sym.expr) {
      this.explode(state.seqs);
    } else if (state.type === sym.cont) {
      this.node.data.next = state;
    } else {
      throw new Error(`Unexpected state of {type: '${state.type}'}`);
    }
  }

  step0() {
    const context = this.context;

    let { node } = this;
    while (node?.data instanceof Sequence && node.data.next.width === 0) {
      this.apply(node.data.next.match(node.data.mutableState, context));
      ({ node } = this);
    }
    if (node?.data instanceof Sequence && node.data.next.width === 1 && context.nextChr === null) {
      this.fail();
    }
  }

  step1() {
    const context = this.context;
    if (this.node?.data instanceof Sequence) {
      const { next, mutableState } = this.node.data;
      if (next.width === 1) {
        this.apply(next.match(mutableState, context));
      } else {
        throw new Error('w0 where w1 expected');
      }
    }
  }

  traverse(step) {
    this.startTraversal(this.root);

    while (true) {
      while (this.node !== null) {
        const { node } = this;
        step();
        if (node === this.node) {
          this.prevNode = this.node;
          this.node = this.node.worse;
        }
      }
      const last = this.prevNode;
      if (last.data instanceof Match && last.data.head.worse !== null) {
        this.startTraversal(last.data);
      } else {
        break;
      }
    }
  }

  traverse0() {
    const { starved } = this;

    if (starved) {
      throw new Error('step0 called without feeding new input');
    }

    this.context = this.context0;

    this.traverse(() => this.step0());

    const matches = [];

    let match = this.root;
    while (true) {
      if (match.captures !== null) {
        matches.push(match.captures);
        match.captures = null;
      }
      if (match.head.worse?.data instanceof Match) {
        match = match.head.worse.data;
      } else {
        break;
      }
    }
    this.root = match;

    return matches;
  }

  traverse1() {
    this.context = this.context1;

    this.traverse(() => this.step1());

    this.starved = true;
  }
}

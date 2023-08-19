import { parse } from './pattern.js';

const _ = Symbol.for('_');

export class Api {
  constructor(generate) {
    this[_] = { generate };

    this.exec = this.exec.bind(this);
    this.test = this.test.bind(this);
    this.execGlobal = this.execGlobal.bind(this);
  }

  exec(pattern, iterable) {
    const { generate } = this[_];
    const step = generate(parse(pattern), iterable).next();

    return step.done ? [] : step.value;
  }

  test(pattern, iterable) {
    const { exec } = this;
    return exec(pattern, iterable).length > 0;
  }

  execGlobal(pattern, iterable) {
    const { generate } = this[_];
    const pattern_ = parse(pattern);
    return {
      [Symbol.iterator]() {
        return generate(pattern_, iterable);
      },
    };
  }
}

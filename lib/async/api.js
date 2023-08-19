import { parse } from '../pattern.js';

const _ = Symbol.for('_');

export class AsyncApi {
  constructor(generate) {
    this[_] = { generate };

    this.exec = this.exec.bind(this);
    this.test = this.test.bind(this);
    this.execGlobal = this.execGlobal.bind(this);
  }

  async exec(pattern, iterable) {
    const { generate } = this[_];
    const step = await generate(parse(pattern), iterable).next();

    return step.done ? [] : step.value;
  }

  async test(pattern, iterable) {
    const { exec } = this;
    return (await exec(pattern, iterable)).length > 0;
  }

  async execGlobal(pattern, iterable) {
    const { generate } = this[_];
    const pattern_ = parse(pattern);
    return {
      [Symbol.asyncIterator]() {
        return generate(pattern_, iterable);
      },
    };
  }
}

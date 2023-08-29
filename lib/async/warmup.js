import asyncConsume from 'iter-tools-es/methods/async-consume';
import asyncWrap from 'iter-tools-es/methods/async-wrap';
import { parse } from '../pattern.js';
import { execGlobal } from './index.js';

const warmupPattern1 = parse('/.*/g');
const warmupPattern2 = parse('/(a)|(b)/g');

// Help avoid deopts when the setup and body of generate and step0 are hot
// but code to do with pattern or input termination is not
for (let i = 0; i < 4; i++) {
  asyncConsume(execGlobal(warmupPattern1, asyncWrap('ab')));
  asyncConsume(execGlobal(warmupPattern2, asyncWrap('ab')));
  asyncConsume(execGlobal(warmupPattern2, asyncWrap('a')));
  asyncConsume(execGlobal(warmupPattern2, asyncWrap('')));
}

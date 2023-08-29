import consume from 'iter-tools-es/methods/consume';
import { parse } from './pattern.js';
import { execGlobal } from './index.js';

const warmupPattern1 = parse('/.*/g');
const warmupPattern2 = parse('/(a)|(b)/g');

// Help avoid deopts when the setup and body of generate and step0 are hot
// but code to do with pattern or input termination is not
for (let i = 0; i < 4; i++) {
  consume(execGlobal(warmupPattern1, 'ab'));
  consume(execGlobal(warmupPattern2, 'ab'));
  consume(execGlobal(warmupPattern2, 'a'));
  consume(execGlobal(warmupPattern2, ''));
}

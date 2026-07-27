import { generateMatches } from '@bablr/regex-vm';
import * as sym from '@bablr/pattern-engine/symbols';
import { expect } from 'expect';
import { StreamIterable } from '@bablr/agast-helpers/iterable';
import { streamIteratorSymbol } from '@bablr/stream-iterator';
import { m } from '@bablr/helpers/grammar';
import { parseTag, parseTagType } from '@bablr/agast-helpers/parsers';

const str = (iter) =>
  iter &&
  [...iter]
    .map((value) => {
      return parseTagType(value) === Symbol.for('LiteralTag') ? parseTag(value).value : '';
    })
    .join('');

function* __wrap(source) {
  yield sym.BOS;
  yield* source;
  yield sym.EOS;
}

const wrap = (source) => {
  return new StreamIterable(__wrap(source));
};

const exec = (pattern, source) =>
  generateMatches(pattern, wrap(source))
    [streamIteratorSymbol]()
    .next()
    .value?.map((capture) => str(capture)) || [];

describe('regex-vm', () => {
  it('[empty]', () => {
    const exp = m`//`;
    expect(exec(exp, '')).toEqual(['']);
    expect(exec(exp, 'f')).toEqual(['']);
  });

  it('f', () => {
    const exp = m`/f/`;
    expect(exec(exp, '')).toEqual([]);
    expect(exec(exp, 'f')).toEqual(['f']);
    expect(exec(exp, 'ff')).toEqual(['f']);
  });

  it('^f', () => {
    const exp = m`/^f/`;
    expect(exec(exp, 'f')).toEqual(['f']);
    expect(exec(exp, 'ff')).toEqual(['f']);
    expect(exec(exp, 'of')).toEqual([]);
  });

  it('f$', () => {
    const exp = m`/f$/`;
    expect(exec(exp, 'f')).toEqual(['f']);
    expect(exec(exp, 'fo')).toEqual([]);
  });

  it('foo', () => {
    const exp = m`/foo/`;
    expect(exec(exp, '')).toEqual([]);
    expect(exec(exp, 'foo')).toEqual(['foo']);
    expect(exec(exp, 'food')).toEqual(['foo']);
  });

  it('()', () => {
    const exp = m`/()/`;
    expect(exec(exp, '')).toEqual(['', '']);
    expect(exec(exp, 'a')).toEqual(['', '']);
  });

  it('(ab)', () => {
    const exp = m`/(ab)/`;
    expect(exec(exp, 'ab')).toEqual(['ab', 'ab']);
    expect(exec(exp, 'a')).toEqual([]);
  });

  it('(a)(b)', () => {
    const exp = m`/(a)(b)/`;
    expect(exec(exp, 'ab')).toEqual(['ab', 'a', 'b']);
  });

  it('a|ab', () => {
    const exp = m`/a|ab/`;
    expect(exec(exp, 'ab')).toEqual(['a']);
    expect(exec(exp, 'a')).toEqual(['a']);
  });

  it('ab|a', () => {
    const exp = m`/ab|a/`;
    expect(exec(exp, 'ab')).toEqual(['ab']);
    expect(exec(exp, 'a')).toEqual(['a']);
  });

  it('|', () => {
    expect(exec(m`/|/`, '')).toEqual(['']);
    expect(exec(m`/a|/`, 'a')).toEqual(['a']);
    expect(exec(m`/|a/`, 'a')).toEqual(['']);
  });

  it('f.o', () => {
    const exp = m`/f.o/`;
    expect(exec(exp, '')).toEqual([]);
    expect(exec(exp, 'foo')).toEqual(['foo']);
    expect(exec(exp, 'f\no')).toEqual([]);
    expect(exec(exp, 'food')).toEqual(['foo']);
    expect(exec(exp, 'foof')).toEqual(['foo']);
  });

  it('.*', () => {
    const exp = m`/.*/`;
    expect(exec(exp, '')).toEqual(['']);
    expect(exec(exp, 'f')).toEqual(['f']);
    expect(exec(exp, 'foo')).toEqual(['foo']);
  });

  it('(.*)*', () => {
    const exp = m`/(.*)*/`;
    expect(exec(exp, '')).toEqual(['', undefined]);
    expect(exec(exp, 'f')).toEqual(['f', 'f']);
  });

  it('\\.', () => {
    const exp = m`/\./`;
    expect(exec(exp, '')).toEqual([]);
    expect(exec(exp, '.')).toEqual(['.']);
    expect(exec(exp, 'f')).toEqual([]);
  });

  it('.*\\.', () => {
    const exp = m`/.*\./`;
    expect(exec(exp, '.')).toEqual(['.']);
    expect(exec(exp, '..')).toEqual(['..']);
  });

  it('(foo)', () => {
    const exp = m`/(foo)/`;
    expect(exec(exp, '')).toEqual([]);
    expect(exec(exp, 'foo')).toEqual(['foo', 'foo']);
    expect(exec(exp, 'food')).toEqual(['foo', 'foo']);
    expect(exec(exp, 'foof')).toEqual(['foo', 'foo']);
  });

  it('(ab)+', () => {
    const exp = m`/(ab)+/`;
    expect(exec(exp, '')).toEqual([]);
    expect(exec(exp, 'ab')).toEqual(['ab', 'ab']);
    expect(exec(exp, 'aba')).toEqual(['ab', 'ab']);
    expect(exec(exp, 'abab')).toEqual(['abab', 'ab']);
  });

  it('(ab|a)+', () => {
    const exp = m`/(ab|a)+/`;
    expect(exec(exp, 'aab')).toEqual(['aab', 'ab']);
    expect(exec(exp, 'aba')).toEqual(['aba', 'a']);
    expect(exec(exp, 'abc')).toEqual(['ab', 'ab']);
  });

  it('(a)|', () => {
    const exp = m`/(a)|/`;
    expect(exec(exp, 'a')).toEqual(['a', 'a']);
    expect(exec(exp, 'b')).toEqual(['', undefined]);
  });

  it('(a(bc|b))c', () => {
    const exp = m`/(a(bc|b))c/`;
    expect(exec(exp, 'abc')).toEqual(['abc', 'ab', 'b']);
  });

  it('[\\]\\\\]', () => {
    const exp = m`/[\]\\]/`;
    expect(exec(exp, '\\')).toEqual(['\\']);
    expect(exec(exp, ']')).toEqual([']']);
    expect(exec(exp, 'a')).toEqual([]);
  });

  it('f{1,2}', () => {
    const exp = m`/f{1,2}/`;
    expect(exec(exp, '')).toEqual([]);
    expect(exec(exp, 'f')).toEqual(['f']);
    expect(exec(exp, 'ff')).toEqual(['ff']);
    expect(exec(exp, 'fff')).toEqual(['ff']);
  });

  it('(f{1,2})*', () => {
    const exp = m`/(f{1,2})*/`;
    expect(exec(exp, 'f')).toEqual(['f', 'f']);
    expect(exec(exp, 'ff')).toEqual(['ff', 'ff']);
    expect(exec(exp, 'fff')).toEqual(['fff', 'f']);
    expect(exec(exp, 'ffff')).toEqual(['ffff', 'ff']);
  });

  it('(h{1,2}a)*', () => {
    const exp = m`/(h{1,2}a)*/`;
    expect(exec(exp, 'hahaha')).toEqual(['hahaha', 'ha']);
  });

  it('.*x', () => {
    const exp = m`/.*x/`;
    expect(exec(exp, '')).toEqual([]);
    expect(exec(exp, 'a')).toEqual([]);
    expect(exec(exp, 'x')).toEqual(['x']);
    expect(exec(exp, 'ax')).toEqual(['ax']);
  });

  it('ab*?.', () => {
    const exp = m`/ab*?./`;
    expect(exec(exp, 'a')).toEqual([]);
    expect(exec(exp, 'ab')).toEqual(['ab']);
    expect(exec(exp, 'abb')).toEqual(['ab']);
  });

  it('[ab]', () => {
    const exp = m`/[ab]/`;
    expect(exec(exp, 'a')).toEqual(['a']);
    expect(exec(exp, 'b')).toEqual(['b']);
    expect(exec(exp, 'x')).toEqual([]);
  });

  it('[--.]', () => {
    const exp = m`/[--.]/`;
    expect(exec(exp, '-')).toEqual(['-']);
    expect(exec(exp, '.')).toEqual(['.']);
    expect(exec(exp, 'x')).toEqual([]);
  });

  it('[^a]', () => {
    const exp = m`/[^a]/`;
    expect(exec(exp, 'a')).toEqual([]);
    expect(exec(exp, 'b')).toEqual(['b']);
  });

  it('/[^\\n]/', () => {
    const exp = m`/[^\n]/`;
    expect(exec(exp, '1')).toEqual(['1']);
  });

  it('()*', () => {
    const exp = m`/()*/`;
    expect(exec(exp, '')).toEqual(['', undefined]);
  });

  it('\\w', () => {
    const exp = m`/\w/`;
    expect(exec(exp, ' ')).toEqual([]);
    expect(exec(exp, '0')).toEqual(['0']);
    expect(exec(exp, '1')).toEqual(['1']);
    expect(exec(exp, '9')).toEqual(['9']);
    expect(exec(exp, 'a')).toEqual(['a']);
    expect(exec(exp, 'b')).toEqual(['b']);
    expect(exec(exp, 'z')).toEqual(['z']);
    expect(exec(exp, 'A')).toEqual(['A']);
    expect(exec(exp, 'B')).toEqual(['B']);
    expect(exec(exp, 'Z')).toEqual(['Z']);
    expect(exec(exp, '_')).toEqual(['_']);
  });

  it('\\W', () => {
    const exp = m`/\W/`;
    expect(exec(exp, ' ')).toEqual([' ']);
    expect(exec(exp, '0')).toEqual([]);
  });

  it('\\d', () => {
    const exp = m`/\d/`;
    expect(exec(exp, 'd')).toEqual([]);
    expect(exec(exp, '0')).toEqual(['0']);
    expect(exec(exp, '1')).toEqual(['1']);
    expect(exec(exp, '9')).toEqual(['9']);
  });

  it('\\D', () => {
    const exp = m`/\D/`;
    expect(exec(exp, 'f')).toEqual(['f']);
    expect(exec(exp, '0')).toEqual([]);
  });

  it('\\s', () => {
    const exp = m`/\s/`;
    expect(exec(exp, 's')).toEqual([]);
    expect(exec(exp, ' ')).toEqual([' ']);
    expect(exec(exp, '\u2028')).toEqual(['\u2028']);
  });

  it('\\S', () => {
    const exp = m`/\S/`;
    expect(exec(exp, 'f')).toEqual(['f']);
    expect(exec(exp, ' ')).toEqual([]);
  });

  it('\\b', () => {
    const exp = m`/\b/`;
    expect(exec(exp, '')).toEqual([]);
    expect(exec(exp, ' ')).toEqual([]);
    expect(exec(exp, 'f')).toEqual(['']);
  });

  it('\\bf\\b', () => {
    const exp = m`/\bf\b/`;
    expect(exec(exp, 'f')).toEqual(['f']);
    expect(exec(exp, 'f ')).toEqual(['f']);
  });

  it('[a-z]', () => {
    const exp = m`/[a-z]/`;
    expect(exec(exp, 'a')).toEqual(['a']);
    expect(exec(exp, 'b')).toEqual(['b']);
    expect(exec(exp, 'z')).toEqual(['z']);
    expect(exec(exp, ' ')).toEqual([]);
    expect(exec(exp, 'A')).toEqual([]);
  });

  it('(a)?', () => {
    const exp = m`/(a)?/`;
    expect(exec(exp, '')).toEqual(['', undefined]);
    expect(exec(exp, 'a')).toEqual(['a', 'a']);
  });

  it.skip('/[^\\r\\n\\"]+/', () => {
    const exp = m`/[^\r\n\\"]+/`;

    expect(exec(exp, 'a'.repeat(100000))).toEqual(['a'.repeat(100000)]);
  });
});

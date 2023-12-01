import { exec, execGlobal } from '@bablr/regex-vm';
import { re } from '@bablr/boot';
import { expect } from 'expect';

describe('exec', () => {
  it('[emtpy]', () => {
    const exp = re`//`;
    expect(exec(exp, '')).toEqual(['']);
    expect(exec(exp, 'f')).toEqual(['']);
  });

  it('f', () => {
    const exp = re`/f/`;
    expect(exec(exp, '')).toEqual([]);
    expect(exec(exp, 'f')).toEqual(['f']);
    expect(exec(exp, 'ff')).toEqual(['f']);
  });

  it('^f', () => {
    const exp = re`/^f/`;
    expect(exec(exp, 'f')).toEqual(['f']);
    expect(exec(exp, 'ff')).toEqual(['f']);
    expect(exec(exp, 'of')).toEqual([]);
  });

  it('f$', () => {
    const exp = re`/f$/`;
    expect(exec(exp, 'f')).toEqual(['f']);
    expect(exec(exp, 'fo')).toEqual([]);
  });

  it('foo', () => {
    const exp = re`/foo/`;
    expect(exec(exp, '')).toEqual([]);
    expect(exec(exp, 'foo')).toEqual(['foo']);
    expect(exec(exp, 'food')).toEqual(['foo']);
  });

  it('()', () => {
    const exp = re`/()/`;
    expect(exec(exp, '')).toEqual(['', '']);
    expect(exec(exp, 'a')).toEqual(['', '']);
  });

  it('(ab)', () => {
    const exp = re`/(ab)/`;
    expect(exec(exp, 'ab')).toEqual(['ab', 'ab']);
    expect(exec(exp, 'a')).toEqual([]);
  });

  it('(a)(b)', () => {
    const exp = re`/(a)(b)/`;
    expect(exec(exp, 'ab')).toEqual(['ab', 'a', 'b']);
  });

  it('a|ab', () => {
    const exp = re`/a|ab/`;
    expect(exec(exp, 'ab')).toEqual(['a']);
    expect(exec(exp, 'a')).toEqual(['a']);
  });

  it('ab|a', () => {
    const exp = re`/ab|a/`;
    expect(exec(exp, 'ab')).toEqual(['ab']);
    expect(exec(exp, 'a')).toEqual(['a']);
  });

  it('|', () => {
    expect(exec(re`/|/`, '')).toEqual(['']);
    expect(exec(re`/a|/`, 'a')).toEqual(['a']);
    expect(exec(re`/|a/`, 'a')).toEqual(['']);
  });

  it('f.o', () => {
    const exp = re`/f.o/`;
    expect(exec(exp, '')).toEqual([]);
    expect(exec(exp, 'foo')).toEqual(['foo']);
    expect(exec(exp, 'f\no')).toEqual([]);
    expect(exec(exp, 'food')).toEqual(['foo']);
    expect(exec(exp, 'foof')).toEqual(['foo']);
  });

  it('.*', () => {
    const exp = re`/.*/`;
    expect(exec(exp, '')).toEqual(['']);
    expect(exec(exp, 'f')).toEqual(['f']);
    expect(exec(exp, 'foo')).toEqual(['foo']);
  });

  it('(.*)*', () => {
    const exp = re`/(.*)*/`;
    expect(exec(exp, '')).toEqual(['', undefined]);
    expect(exec(exp, 'f')).toEqual(['f', 'f']);
  });

  it('\\.', () => {
    const exp = re`/\./`;
    expect(exec(exp, '')).toEqual([]);
    expect(exec(exp, '.')).toEqual(['.']);
    expect(exec(exp, 'f')).toEqual([]);
  });

  it('.*\\.', () => {
    const exp = re`/.*\./`;
    expect(exec(exp, '.')).toEqual(['.']);
    expect(exec(exp, '..')).toEqual(['..']);
  });

  it('(foo)', () => {
    const exp = re`/(foo)/`;
    expect(exec(exp, '')).toEqual([]);
    expect(exec(exp, 'foo')).toEqual(['foo', 'foo']);
    expect(exec(exp, 'food')).toEqual(['foo', 'foo']);
    expect(exec(exp, 'foof')).toEqual(['foo', 'foo']);
  });

  it('(ab)+', () => {
    const exp = re`/(ab)+/`;
    expect(exec(exp, '')).toEqual([]);
    expect(exec(exp, 'ab')).toEqual(['ab', 'ab']);
    expect(exec(exp, 'aba')).toEqual(['ab', 'ab']);
    expect(exec(exp, 'abab')).toEqual(['abab', 'ab']);
  });

  it('(ab|a)+', () => {
    const exp = re`/(ab|a)+/`;
    expect(exec(exp, 'aab')).toEqual(['aab', 'ab']);
    expect(exec(exp, 'aba')).toEqual(['aba', 'a']);
    expect(exec(exp, 'abc')).toEqual(['ab', 'ab']);
  });

  it('(a)|', () => {
    const exp = re`/(a)|/`;
    expect(exec(exp, 'a')).toEqual(['a', 'a']);
    expect(exec(exp, 'b')).toEqual(['', undefined]);
  });

  it('(a(bc|b))c', () => {
    const exp = re`/(a(bc|b))c/`;
    expect(exec(exp, 'abc')).toEqual(['abc', 'ab', 'b']);
  });

  it('f{1,2}', () => {
    const exp = re`/f{1,2}/`;
    expect(exec(exp, '')).toEqual([]);
    expect(exec(exp, 'f')).toEqual(['f']);
    expect(exec(exp, 'ff')).toEqual(['ff']);
    expect(exec(exp, 'fff')).toEqual(['ff']);
  });

  it('(f{1,2})*', () => {
    const exp = re`/(f{1,2})*/`;
    expect(exec(exp, 'f')).toEqual(['f', 'f']);
    expect(exec(exp, 'ff')).toEqual(['ff', 'ff']);
    expect(exec(exp, 'fff')).toEqual(['fff', 'f']);
    expect(exec(exp, 'ffff')).toEqual(['ffff', 'ff']);
  });

  it('(h{1,2}a)*', () => {
    const exp = re`/(h{1,2}a)*/`;
    expect(exec(exp, 'hahaha')).toEqual(['hahaha', 'ha']);
  });

  it('.*x', () => {
    const exp = re`/.*x/`;
    expect(exec(exp, '')).toEqual([]);
    expect(exec(exp, 'a')).toEqual([]);
    expect(exec(exp, 'x')).toEqual(['x']);
    expect(exec(exp, 'ax')).toEqual(['ax']);
  });

  it('[--\\.]', () => {
    const exp = re`/[--\.]/`;
    expect(exec(exp, '-')).toEqual(['-']);
    expect(exec(exp, '.')).toEqual(['.']);
    expect(exec(exp, 'x')).toEqual([]);
  });

  it('[^a]', () => {
    const exp = re`/[^a]/`;
    expect(exec(exp, 'a')).toEqual([]);
    expect(exec(exp, 'b')).toEqual(['b']);
  });

  it('/[^\\n]/', () => {
    const exp = re`/[^\n]/`;
    expect(exec(exp, '1')).toEqual(['1']);
  });

  it('()*', () => {
    const exp = re`/()*/`;
    expect(exec(exp, '')).toEqual(['', undefined]);
  });

  it('\\w', () => {
    const exp = re`/\w/`;
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
    const exp = re`/\W/`;
    expect(exec(exp, ' ')).toEqual([' ']);
    expect(exec(exp, '0')).toEqual([]);
  });

  it('\\d', () => {
    const exp = re`/\d/`;
    expect(exec(exp, 'd')).toEqual([]);
    expect(exec(exp, '0')).toEqual(['0']);
    expect(exec(exp, '1')).toEqual(['1']);
    expect(exec(exp, '9')).toEqual(['9']);
  });

  it('\\D', () => {
    const exp = re`/\D/`;
    expect(exec(exp, 'f')).toEqual(['f']);
    expect(exec(exp, '0')).toEqual([]);
  });

  it('\\s', () => {
    const exp = re`/\s/`;
    expect(exec(exp, 's')).toEqual([]);
    expect(exec(exp, ' ')).toEqual([' ']);
    expect(exec(exp, '\u2028')).toEqual(['\u2028']);
  });

  it('\\S', () => {
    const exp = re`/\S/`;
    expect(exec(exp, 'f')).toEqual(['f']);
    expect(exec(exp, ' ')).toEqual([]);
  });

  it('\\b', () => {
    const exp = re`/\b/`;
    expect(exec(exp, '')).toEqual([]);
    expect(exec(exp, ' ')).toEqual([]);
    expect(exec(exp, 'f')).toEqual(['']);
  });

  it('\\bf\\b', () => {
    const exp = re`/\bf\b/`;
    expect(exec(exp, 'f')).toEqual(['f']);
    expect(exec(exp, 'f ')).toEqual(['f']);
  });

  it('[a-z]', () => {
    const exp = re`/[a-z]/`;
    expect(exec(exp, 'a')).toEqual(['a']);
    expect(exec(exp, 'b')).toEqual(['b']);
    expect(exec(exp, 'z')).toEqual(['z']);
    expect(exec(exp, ' ')).toEqual([]);
    expect(exec(exp, 'A')).toEqual([]);
  });

  it('(a)?', () => {
    const exp = re`/(a)?/`;
    expect(exec(exp, '')).toEqual(['', undefined]);
    expect(exec(exp, 'a')).toEqual(['a', 'a']);
  });
});

describe('execGlobal', () => {
  describe('when pattern is not global', () => {
    it('.', () => {
      const exp = re`/./`;
      expect([...execGlobal(exp, 'abc')]).toEqual([['a']]);
    });
  });

  describe('s flag', () => {
    it('f.o', () => {
      const exp = re`/f.o/s`;
      expect(exec(exp, '')).toEqual([]);
      expect(exec(exp, 'foo')).toEqual(['foo']);
      expect(exec(exp, 'f\no')).toEqual(['f\no']);
      expect(exec(exp, 'food')).toEqual(['foo']);
      expect(exec(exp, 'foof')).toEqual(['foo']);
    });

    it('.*', () => {
      const exp = re`/.*/s`;
      expect(exec(exp, 'a\nb\nc')).toEqual(['a\nb\nc']);
      expect(exec(exp, '\n\n\n')).toEqual(['\n\n\n']);
      expect(exec(exp, '\r\n\r\n')).toEqual(['\r\n\r\n']);
    });
  });
});

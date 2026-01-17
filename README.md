# @bablr/regex-vm

`@bablr/regex-vm` is a fully-featured streaming regex implementation.

## API

[test](#test)(pattern, input)  
[exec](#exec)(pattern, input)  
[execGlobal](#execglobal)(pattern, input)

`input` is expected to be a stream iterator

### test

```js
import { test } from '@bablr/regex-vm';

const didMatch = test(pattern, input);
```

`didMatch` will be `true` if `pattern` matches at some location in `input`.

### exec

```js
import { exec } from '@bablr/regex-vm';

const captures = exec(pattern, input);
// 1-indexed by lexical order of `(` ($2 is b)
const [match, $1, $2, $3] = exec(/(a(b))(c)/, input);
```

`captures` will be the array of `[match, ...captures]` from the first location where `pattern` matches in `input`. This method differs from the spec in that it returns `[]` (**NOT** `null`) when `pattern` is not found in `input`. This is so that it may be used more nicely with destructuring. If you need to check if the match was present, you can still do it nicely with destructuring syntax:

```js
const [match = null, $1] = exec(/.*(a)/, input);

if (match !== null) console.log(`match: '${match}'`);
if ($1 !== undefined) console.log(`$1: '${$1}'`);
```

### execGlobal

<!--prettier-ignore-->
```js
import { execGlobal } from '@bablr/regex-vm';

const [...matches] = execGlobal(pattern, input);
```

`matches` is an iterable of match arrays (`StreamIterable[[match, ...captures], ...matches]`). If `pattern` is not found in `input` the iterable of matches will be empty. `execGlobal` interacts with the `global` (`/g`) flag. **If the `/g` flag is not present the `matches` iterable will never contain more than one match.**

## Patterns and flags

Some syntaxes are unsupported. Unsupported syntaxes are still parsed as long as they are in the well-supported [regexpp](https://github.com/mysticatea/regexpp) parser, so that you will not be allowed to write expressions which would not be compatible with other engines.

- Patterns use "unicode mode" escaping rules. Only valid escapes are syntactically legal.

- Patterns do not support lookbehind (`(?<=abc)` and `(?<!abc)`).

- Patterns do not (and will not) support backreferences (`(.)\0`).

- Patterns do not support lookahead (yet) (`(?=abc)` and `(?!abc)`). See [#11](https://github.com/bablr-lang/regex/issues/11).

- Patterns do not support named capture groups (`(?<name>)`) (yet).

- The unicode flag (`/u`) is not supported yet. Supporting it is a top priority. See [#33](https://github.com/bablr-lang/regex/issues/33).

- The sticky flag (`/y`) is partially supported. It restricts matching to only attempt to match `pattern` at the start of `input` or at the end of a global match (when `/g` is also present). Not the same as putting a `^` in the pattern, which may be affected by the multiline flag (`/m`).

## Credits

Thanks Jason Priestley! Without your [blog post](https://jasonhpriestley.com/regex) I would not have known where to start. Also thanks to my friends and family, who have heard me talk about this more than any of them could possibly want to.

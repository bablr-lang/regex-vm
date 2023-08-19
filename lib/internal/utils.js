export function* map(iterable, mapper) {
  for (const value of iterable) {
    yield mapper(value);
  }
}

export const isString = (obj) => typeof obj === 'string';

export const isObject = (obj) => typeof obj === 'object' && obj;

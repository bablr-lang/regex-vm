export async function* map(iterable, mapper) {
  for await (const value of iterable) {
    yield await mapper(value);
  }
}

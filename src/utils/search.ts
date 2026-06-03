import Fuse, { IFuseOptions } from 'fuse.js';

export function fuzzySearch<T>(
  list: T[],
  searchTerm: string,
  keys: string[],
  options: IFuseOptions<T> = {}
): T[] {
  if (!searchTerm) return list;

  const fuse = new Fuse(list, {
    threshold: 0.3,
    location: 0,
    distance: 100,
    minMatchCharLength: 1,
    keys,
    ...options,
  });

  return fuse.search(searchTerm).map((result) => result.item);
}

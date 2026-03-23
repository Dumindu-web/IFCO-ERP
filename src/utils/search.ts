export function fuzzySearch<T>(items: T[], searchTerm: string, keys: (keyof T)[]): T[] {
  if (!searchTerm) return items;
  const lowerSearchTerm = searchTerm.toLowerCase();
  return items.filter(item => {
    return keys.some(key => {
      const value = item[key];
      if (typeof value === 'string') {
        return value.toLowerCase().includes(lowerSearchTerm);
      }
      return false;
    });
  });
}

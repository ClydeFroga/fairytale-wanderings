export class Filter {
  static makeFilter<T>(filters?: { [key in keyof T]?: T[key] }) {
    const filter: Partial<T> = {};

    if (!filters) return filter;

    for (const key in filters) {
      if (filters[key] !== undefined) {
        filter[key] = filters[key];
      }
    }

    return filter;
  }
}

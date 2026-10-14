// Shared by the app and its tests, so nothing here imports React Native.

// The API's largest page.
const PAGE_SIZE = 500;
// Pages asked for at the same time. Two cover a list of up to 1,000 rows in
// one round trip; a longer list takes another round.
const PAGES_AT_ONCE = 2;

// Every row of a paged list whose length isn't known up front. Pages are
// asked for together rather than one after another, and asking stops at the
// first page that comes back short.
export async function fetchAllPages<T>(
  fetchPage: (limit: number, offset: number) => Promise<T[]>
): Promise<T[]> {
  const rows: T[] = [];

  for (let first = 0; ; first += PAGES_AT_ONCE) {
    const pages = await Promise.all(
      Array.from({ length: PAGES_AT_ONCE }, (_, index) =>
        fetchPage(PAGE_SIZE, (first + index) * PAGE_SIZE)
      )
    );
    for (const page of pages) {
      rows.push(...page);
      if (page.length < PAGE_SIZE) return rows;
    }
  }
}

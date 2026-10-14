import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchAllPages } from "../src/lib/api/fetchAllPages.ts";

// A paged list of `total` rows, recording when each page was asked for.
function pagedList(total) {
  const catalogue = Array.from({ length: total }, (_, id) => id);
  const asked = [];
  let inFlight = 0;
  let mostAtOnce = 0;
  const fetchPage = async (limit, offset) => {
    asked.push(offset);
    inFlight += 1;
    mostAtOnce = Math.max(mostAtOnce, inFlight);
    await new Promise((resolve) => queueMicrotask(resolve));
    inFlight -= 1;
    return catalogue.slice(offset, offset + limit);
  };
  return { fetchPage, catalogue, asked, mostAtOnce: () => mostAtOnce };
}

test("the 506-row catalogue comes back whole in one round of two pages", async () => {
  const list = pagedList(506);
  const rows = await fetchAllPages(list.fetchPage);

  assert.deepEqual(rows, list.catalogue);
  assert.deepEqual(list.asked, [0, 500]);
  assert.equal(list.mostAtOnce(), 2);
});

test("a list longer than two pages takes another round", async () => {
  const list = pagedList(1200);
  const rows = await fetchAllPages(list.fetchPage);

  assert.deepEqual(rows, list.catalogue);
  assert.deepEqual(list.asked, [0, 500, 1000, 1500]);
});

test("a list of exactly one page stops at the empty second page", async () => {
  const list = pagedList(500);
  assert.deepEqual(await fetchAllPages(list.fetchPage), list.catalogue);
});

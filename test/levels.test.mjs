import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DAILY_XP_CAP,
  capPlayXp,
  levelFor,
  levelProgress,
  xpToReach,
} from "../src/levels.mjs";
import { HONORS, honorName, honorOf, roman } from "../src/honors.mjs";

test("level n starts at 50·n·(n−1) XP", () => {
  assert.deepEqual([1, 2, 3, 4].map(xpToReach), [0, 100, 300, 600]);
  assert.equal(levelFor(0), 1);
  assert.equal(levelFor(99), 1);
  assert.equal(levelFor(100), 2);
  assert.equal(levelFor(310), 3);
  assert.deepEqual(levelProgress(310), {
    level: 3,
    xp: 310,
    floor: 300,
    next: 600,
  });
});

test("play XP stops at the daily cap", () => {
  assert.deepEqual(capPlayXp(50, 0), { gained: 50, capped: false });
  assert.deepEqual(capPlayXp(50, DAILY_XP_CAP - 20), {
    gained: 20,
    capped: true,
  });
  assert.deepEqual(capPlayXp(50, DAILY_XP_CAP), { gained: 0, capped: true });
});

test("honors take a numeral for each level within them", () => {
  assert.equal(roman(4), "IV");
  assert.equal(roman(19), "XIX");
  assert.deepEqual(honorOf(1), { tier: "bronze", title: "Wanderer", rank: 1 });
  assert.equal(honorName(7), "Town lord II");
  assert.equal(honorName(25, (t) => t.toUpperCase()), "HIGH MONARCH VI");
  // Each honor opens at a higher level than the one before.
  for (let i = 1; i < HONORS.length; i++)
    assert.ok(HONORS[i].level > HONORS[i - 1].level);
});

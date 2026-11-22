// The kingdom: the level opens stages and land, and buildings cost coins
// under rules the host's server enforces.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as rules from "../src/kingdom.mjs";

test("stages open with the account level and the land keeps growing", () => {
  assert.equal(rules.stageFor(1), null);
  assert.equal(rules.stageFor(2).id, "camp");
  assert.equal(rules.stageFor(5).id, "village");
  assert.equal(rules.stageFor(99).id, "capital");
  assert.deepEqual(rules.landBounds(4), { lo: -1, hi: 2 });
  assert.deepEqual(rules.landBounds(5), { lo: -2, hi: 2 });
  // Every tile of a stage stays land at the next one.
  for (let i = 1; i < rules.STAGES.length; i++) {
    const small = rules.landBounds(rules.STAGES[i - 1].size);
    for (let x = small.lo; x <= small.hi; x++)
      assert.ok(rules.onLand(rules.STAGES[i].size, x, small.lo));
  }
  // Each hall upgrade belongs to a stage after the camp, in order.
  const halls = rules.BUILDINGS.filter((b) => b.hall).map((b) => b.stage);
  assert.deepEqual(halls, rules.STAGE_IDS.slice(1));
});

test("building follows the rules", () => {
  const empty = rules.kingdomOf(null);
  const at = (level, coins, request, k = empty) => {
    try {
      return rules.build(k, request, level, coins);
    } catch (e) {
      return e.code;
    }
  };
  assert.equal(at(1, 99, { id: "cottage", x: 1, y: 0 }), "locked");
  assert.equal(at(9, 99, { id: "nope", x: 1, y: 0 }), "unknown-building");
  assert.equal(at(2, 99, { id: "cottage", x: 0, y: 0 }), "off-land");
  assert.equal(at(2, 99, { id: "cottage", x: 3, y: 0 }), "off-land");
  // The hall's grounds are the 3 x 3 tiles around it.
  assert.equal(at(2, 99, { id: "cottage", x: 1, y: -1 }), "off-land");
  assert.equal(at(2, 10, { id: "cottage", x: 2, y: 0 }), "not-enough-coins");
  assert.equal(at(2, 999, { id: "market", x: 2, y: 0 }), "level");
  assert.equal(at(4, 999, { id: "market", x: 2, y: 0 }), "hall-first");
  assert.equal(at(4, 999, { id: "hall-town" }), "level");
  assert.equal(at(6, 999, { id: "hall-town" }), "hall-first");

  const first = at(2, 20, { id: "cottage", x: 2, y: -1 });
  assert.equal(first.coins, 20);
  assert.equal(first.kingdom.tiles["2,-1"], "cottage");
  assert.equal(
    at(2, 99, { id: "farm", x: 2, y: -1 }, first.kingdom),
    "occupied",
  );
  const hall = at(4, 100, { id: "hall-village" }, first.kingdom);
  assert.equal(hall.kingdom.hall, "village");
  assert.equal(
    at(4, 999, { id: "hall-village" }, hall.kingdom),
    "already-built",
  );
  assert.equal(
    at(4, 80, { id: "market", x: -2, y: 2 }, hall.kingdom).coins,
    40,
  );

  let k = empty;
  for (let x = -2; x <= 2; x++)
    for (let y = -2; y <= 2; y++)
      if (!rules.isHallTile(x, y) && Object.keys(k.tiles).length < 6)
        k = rules.build(k, { id: "farm", x, y }, 2, 99).kingdom;
  assert.equal(at(2, 99, { id: "farm", x: 2, y: 2 }, k), "max");

  const moved = rules.move(first.kingdom, { from: [2, -1], to: [-2, 1] }, 2);
  assert.deepEqual(moved.tiles, { "-2,1": "cottage" });
  assert.throws(
    () => rules.move(first.kingdom, { from: [2, -1], to: [1, 1] }, 2),
    { code: "off-land" },
  );
  assert.throws(
    () => rules.move(first.kingdom, { from: [2, 2], to: [2, 1] }, 2),
    {
      code: "empty",
    },
  );
});

test("a kingdom view and building in a rewards document", () => {
  const empty = rules.kingdomView(null, null);
  assert.equal(empty.stage, null);
  assert.equal(empty.coins, 0);
  const view = rules.kingdomView({ coins: 50 }, { xp: 100 });
  assert.deepEqual(
    [view.level, view.stage, view.size, view.hall, view.coins],
    [2, "camp", 5, "camp", 50],
  );
  const built = rules.buildIn(
    { coins: 50, spent: 5 },
    { id: "cottage", x: 2, y: 0 },
    2,
  );
  assert.equal(built.coins, 20);
  assert.deepEqual(built.doc, {
    coins: 30,
    spent: 25,
    kingdom: { hall: "camp", tiles: { "2,0": "cottage" } },
  });
  assert.throws(
    () => rules.buildIn({ coins: 5 }, { id: "cottage", x: 2, y: 0 }, 2),
    { code: "not-enough-coins" },
  );
});

test("visitors see the kingdom, never the coins", () => {
  assert.equal(rules.publicKingdom({ coins: 9 }, 1), null);
  assert.deepEqual(
    rules.publicKingdom(
      { coins: 9, kingdom: { hall: "camp", tiles: { "2,0": "farm" } } },
      4,
    ),
    { stage: "village", size: 6, hall: "camp", tiles: { "2,0": "farm" } },
  );
});

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
});

test("every stage's free buildings fit its land, without moving", () => {
  // Each stage's starters, placed on an empty kingdom one stage at a time,
  // land on their own spots: on that stage's land, off the hall, and on
  // tiles no earlier starter took.
  let k = rules.kingdomOf(null);
  const counts = {};
  for (const stage of rules.STAGES) {
    for (const [id, x, y] of rules.STARTERS[stage.id]) {
      const def = rules.building(id);
      assert.ok(def, id);
      assert.ok(
        rules.STAGE_IDS.indexOf(def.stage) <= rules.STAGE_IDS.indexOf(stage.id),
        `${id} opens after ${stage.id}`,
      );
      assert.ok(rules.onLand(stage.size, x, y), `${id} ${x},${y}`);
      assert.ok(!rules.isHallTile(x, y), `${id} ${x},${y}`);
      counts[id] = (counts[id] ?? 0) + 1;
      assert.ok(counts[id] <= def.max, id);
    }
    k = rules.settle(k, stage.level);
    assert.equal(k.hall, stage.id);
    for (const [id, x, y] of rules.STARTERS[stage.id])
      assert.equal(k.tiles[rules.tileKey(x, y)], id);
  }
});

test("the level gives the hall and free buildings, once", () => {
  const empty = rules.kingdomOf(null);
  assert.equal(rules.settle(empty, 1), empty);
  const camp = rules.settle(empty, 2);
  assert.equal(camp.hall, "camp");
  assert.deepEqual(camp.granted, ["camp"]);
  assert.equal(Object.keys(camp.tiles).length, rules.STARTERS.camp.length);
  // Settled already: nothing changes.
  assert.equal(rules.settle(camp, 3), camp);
  // A player who moved or built over a starter spot keeps their layout;
  // the free building goes to the nearest free tile instead.
  const moved = rules.move(camp, { from: [2, 2], to: [2, 1] }, 3);
  const village = rules.settle(moved, 4);
  assert.equal(village.hall, "village");
  assert.equal(village.tiles["2,1"], "cottage");
  // The well wanted 2,1; it stands on the free tile beside it.
  assert.equal(village.tiles["2,2"], "well");
  assert.equal(
    Object.keys(village.tiles).length,
    rules.STARTERS.camp.length + rules.STARTERS.village.length,
  );
  // Levels skipped at once give every stage in between.
  const town = rules.settle(empty, 6);
  assert.equal(town.hall, "town");
  assert.deepEqual(town.granted, ["camp", "village", "town"]);
  // A building already at its limit isn't given again.
  let full = rules.settle(empty, 9);
  const statues = { ...full, granted: [...full.granted] };
  statues.tiles = { ...full.tiles, "4,4": "statue", "-4,4": "statue" };
  full = rules.settle(statues, 15);
  assert.equal(
    Object.values(full.tiles).filter((b) => b === "statue").length,
    2,
  );

  // Halls bought before they came free are paid back, once.
  assert.equal(rules.hallRefund(null), 0);
  assert.equal(rules.hallRefund({ kingdom: { hall: "camp", tiles: {} } }), 0);
  assert.equal(
    rules.hallRefund({ kingdom: { hall: "town", tiles: {} } }),
    100 + 250,
  );
  assert.equal(
    rules.hallRefund({ kingdom: { hall: "town", tiles: {}, granted: [] } }),
    0,
  );
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
  assert.equal(at(2, 10, { id: "cottage", x: 2, y: -1 }), "not-enough-coins");
  assert.equal(at(2, 999, { id: "market", x: 2, y: -1 }), "level");
  // The free camp path stands at 2,0.
  assert.equal(at(2, 999, { id: "cottage", x: 2, y: 0 }), "occupied");

  const first = at(2, 20, { id: "cottage", x: 2, y: -1 });
  assert.equal(first.coins, 20);
  assert.equal(first.kingdom.tiles["2,-1"], "cottage");
  assert.equal(first.kingdom.hall, "camp");
  assert.deepEqual(first.kingdom.granted, ["camp"]);
  assert.equal(
    at(2, 99, { id: "farm", x: 2, y: -1 }, first.kingdom),
    "occupied",
  );
  // The village opens with its hall, free.
  const village = at(4, 80, { id: "market", x: -2, y: 1 }, first.kingdom);
  assert.equal(village.coins, 40);
  assert.equal(village.kingdom.hall, "village");

  // The camp gives one wheat field; five more fill the limit.
  let k = rules.settle(empty, 2);
  for (const [x, y] of [
    [-2, -1],
    [-2, 1],
    [-1, -2],
    [1, -2],
    [-1, 2],
  ])
    k = rules.build(k, { id: "farm", x, y }, 2, 99).kingdom;
  assert.equal(at(2, 99, { id: "farm", x: 1, y: 2 }, k), "max");

  const moved = rules.move(first.kingdom, { from: [2, -1], to: [-2, 1] }, 2);
  assert.equal(moved.tiles["-2,1"], "cottage");
  assert.equal(moved.tiles["2,-1"], undefined);
  assert.throws(
    () => rules.move(first.kingdom, { from: [2, -1], to: [1, 1] }, 2),
    { code: "off-land" },
  );
  assert.throws(
    () => rules.move(first.kingdom, { from: [1, 2], to: [2, 1] }, 2),
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
  // The camp's free buildings show before they are saved.
  assert.equal(view.tiles["2,2"], "cottage");
  const built = rules.buildIn(
    { coins: 50, spent: 5 },
    { id: "flowers", x: 1, y: 2 },
    2,
  );
  assert.equal(built.coins, 5);
  assert.equal(built.doc.coins, 45);
  assert.equal(built.doc.spent, 10);
  assert.equal(built.doc.kingdom.tiles["1,2"], "flowers");
  assert.deepEqual(built.doc.kingdom.granted, ["camp"]);
  assert.throws(
    () => rules.buildIn({ coins: 1 }, { id: "flowers", x: 1, y: 2 }, 2),
    { code: "not-enough-coins" },
  );
  const moved = rules.moveIn(built.doc, { from: [1, 2], to: [-1, 2] }, 2);
  assert.equal(moved.kingdom.tiles["-1,2"], "flowers");
  assert.equal(moved.coins, 45);
});

test("a hall bought before halls came free is paid back once", () => {
  const doc = {
    coins: 10,
    spent: 400,
    kingdom: { hall: "village", tiles: { "2,0": "cottage" } },
  };
  const first = rules.settleDoc(doc, 6); // level 6: the town
  assert.deepEqual(first.gifts, ["camp", "village", "town"]);
  assert.equal(first.doc.kingdom.hall, "town");
  assert.equal(first.doc.coins, 110);
  assert.equal(first.doc.spent, 300);
  assert.equal(first.doc.kingdom.tiles["2,0"], "cottage");
  const again = rules.settleDoc(first.doc, 6);
  assert.equal(again.doc, first.doc);
  assert.deepEqual(again.gifts, []);
  assert.deepEqual(rules.settleDoc(doc, 1), { doc, gifts: [] });
});

test("visitors see the kingdom, never the coins", () => {
  assert.equal(rules.publicKingdom({ coins: 9 }, 1), null);
  const seen = rules.publicKingdom(
    { coins: 9, kingdom: { hall: "camp", tiles: { "2,0": "farm" } } },
    4,
  );
  assert.deepEqual(Object.keys(seen), ["stage", "size", "hall", "tiles"]);
  assert.equal(seen.stage, "village");
  assert.equal(seen.hall, "village");
  assert.equal(seen.tiles["2,0"], "farm");
});

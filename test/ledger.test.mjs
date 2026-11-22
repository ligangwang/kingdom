import { test } from "node:test";
import assert from "node:assert/strict";
import * as ledger from "../src/ledger.mjs";
import { DAILY_GAME_COINS, MAX_GAME_COINS } from "../src/coins.mjs";

const badge = (id, extra = {}) => ({
  id,
  tier: "silver",
  level: 10,
  title: { en: "Clear level 10", zh: "通过第 10 关" },
  ...extra,
});
const item = (id, price, extra = {}) => ({
  id,
  price,
  title: { en: `Upgrade ${id}`, zh: `升级 ${id}` },
  ...extra,
});

test("a badge pays once, and a game's coins are capped", () => {
  let step = ledger.awardBadge(null, "rush", badge("level-10"), "2026-01-01");
  assert.deepEqual(step.result, { new: true, coins: 25, balance: 25 });
  step = ledger.awardBadge(step.doc, "rush", badge("level-10"));
  assert.deepEqual(step.result, { new: false, coins: 0, balance: 25 });
  const near = { coins: 0, games: { rush: MAX_GAME_COINS - 5 }, badges: {} };
  step = ledger.awardBadge(
    near,
    "rush",
    badge("big", { tier: "diamond" }),
    "2026-01-02",
  );
  assert.equal(step.result.coins, 5);
  step = ledger.awardBadge(step.doc, "rush", badge("more"), "2026-01-03");
  assert.equal(step.result.coins, 0);
  // Another game has its own cap.
  step = ledger.awardBadge(step.doc, "pop", badge("x"), "2026-01-04");
  assert.equal(step.result.coins, 25);
  // A game id never reads Object.prototype.
  step = ledger.awardBadge(step.doc, "constructor", badge("a"), "2026-01-05");
  assert.equal(step.result.coins, 25);
  assert.deepEqual(
    ledger.publicBadges(step.doc).map((b) => `${b.game}/${b.id}`),
    ["constructor/a", "pop/x", "rush/more", "rush/big"],
  );
  assert.equal("coins" in ledger.publicBadges(step.doc)[0], false);
});

test("buying an upgrade spends coins once, in order, never into debt", () => {
  const p1 = item("power-1", 60);
  const p2 = item("power-2", 150, { requires: "power-1" });
  const doc = { coins: 200, games: { rush: 200 }, badges: {} };
  assert.throws(() => ledger.buyItem(doc, "rush", p2), {
    code: "requires",
    status: 409,
  });
  let step = ledger.buyItem(doc, "rush", p1, "2026-01-01");
  assert.deepEqual(step.result, { new: true, coins: 60, balance: 140 });
  step = ledger.buyItem(step.doc, "rush", p1);
  assert.deepEqual(step.result, { new: false, coins: 0, balance: 140 });
  assert.throws(() => ledger.buyItem(step.doc, "rush", p2), {
    code: "not-enough-coins",
    status: 402,
  });
  assert.equal(step.doc.spent, 60);
  assert.deepEqual(ledger.wallet(step.doc).items, [
    { game: "rush", id: "power-1", title: p1.title },
  ]);
});

test("coins for play stop at the game's daily allowance", () => {
  let step = ledger.earnCoins(null, "rush", 10, "2026-01-01T10:00:00Z");
  assert.deepEqual(step.result, {
    coins: 10,
    balance: 10,
    left: DAILY_GAME_COINS - 10,
  });
  step.doc.daily.games.rush = DAILY_GAME_COINS - 3;
  step = ledger.earnCoins(step.doc, "rush", 10, "2026-01-01T11:00:00Z");
  assert.equal(step.result.coins, 3);
  step = ledger.earnCoins(step.doc, "rush", 10, "2026-01-01T12:00:00Z");
  assert.equal(step.result.coins, 0);
  // A new UTC day starts a new allowance.
  step = ledger.earnCoins(step.doc, "rush", 10, "2026-01-02T00:00:00Z");
  assert.equal(step.result.coins, 10);
});

test("badges pay account XP once, even when settled twice", () => {
  const doc = {
    coins: 0,
    badges: {
      "rush/a": { tier: "bronze" },
      "rush/b": { tier: "diamond" },
    },
  };
  assert.equal(ledger.badgeXpOwed(doc), 220);
  const paid = ledger.payBadgeXp(doc, { xp: 90, name: "Ann" }, "Kim");
  assert.equal(paid.xp, 220);
  assert.deepEqual(paid.player, {
    xp: 310,
    level: 3,
    badgeXp: 220,
    name: "Ann",
  });
  assert.equal(paid.doc.xpPaid, 220);
  assert.equal(ledger.badgeXpOwed(paid.doc), 0);
  assert.equal(ledger.payBadgeXp(paid.doc, paid.player).xp, 0);
  assert.equal(ledger.payBadgeXp(doc, null, "Kim").player.name, "Kim");
});

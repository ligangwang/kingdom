import { test } from "node:test";
import assert from "node:assert/strict";
import { REWARD_KINDS, grant, total } from "../src/rewards.mjs";

const gold = {
  id: "gold-1",
  tier: "gold",
  icon: "trophy",
  title: { en: "A", zh: "甲" },
};

test("a badge grants its coins, its XP and the level it reaches", () => {
  const first = grant(
    { rewards: null, player: null },
    { type: "badge", game: "rush", badge: gold },
    { now: "2026-01-01", name: "Kim" },
  );
  assert.deepEqual(first.granted, [
    { reward: "coins", new: true, coins: 50, balance: 50 },
    { reward: "xp", xp: 100 },
    { reward: "level", from: 1, to: 2 },
    { reward: "honor", level: 2, title: "Camp leader", tier: "bronze" },
  ]);
  assert.equal(first.rewards.coins, 50);
  assert.equal(first.player.xp, 100);
  assert.equal(first.player.name, "Kim");
  // The same badge again grants nothing.
  const again = grant(first, { type: "badge", game: "rush", badge: gold });
  assert.equal(total(again.granted, "coins"), 0);
  assert.equal(total(again.granted, "xp"), 0);
  assert.equal(again.granted.length, 1);
});

test("coins for play stay within the allowed amounts", () => {
  const paid = grant(null, { type: "earn", game: "rush", coins: 7 });
  assert.equal(total(paid.granted, "coins"), 7);
  assert.equal(paid.player, null);
  assert.throws(() => grant(null, { type: "earn", game: "rush", coins: 99 }), {
    code: "invalid-request",
  });
});

test("a new reward kind joins without changing the host", () => {
  const stars = {
    id: "stars",
    on: ["badge"],
    grant(state) {
      const stars = (state.rewards?.stars ?? 0) + 1;
      return {
        state: { ...state, rewards: { ...state.rewards, stars } },
        granted: [{ reward: "stars", stars: 1 }],
      };
    },
  };
  const out = grant(
    null,
    { type: "badge", game: "rush", badge: gold },
    { kinds: [...REWARD_KINDS, stars] },
  );
  assert.equal(out.rewards.stars, 1);
  assert.equal(out.rewards.coins, 50);
  assert.equal(total(out.granted, "stars"), 1);
  assert.throws(() => grant(null, { type: "dance" }), {
    code: "unknown-event",
  });
});

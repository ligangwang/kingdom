// The honors a player rises through with their account level: a title, and
// the metal of the ring and medal round their avatar. The titles follow the
// kingdom's stages (kingdom.mjs).

/** The ranks, from a wanderer to the ruler of a capital, by opening level. */
export const HONORS = [
  { level: 1, tier: "bronze", title: "Wanderer" },
  { level: 2, tier: "bronze", title: "Camp leader" },
  { level: 4, tier: "bronze", title: "Village elder" },
  { level: 6, tier: "silver", title: "Town lord" },
  { level: 10, tier: "gold", title: "City governor" },
  { level: 15, tier: "gold", title: "Monarch" },
  { level: 20, tier: "diamond", title: "High monarch" },
];

const NUMERALS = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

/** I, II, III … for the steps within an honor. */
export function roman(n) {
  let out = "";
  for (const [value, mark] of NUMERALS)
    for (; n >= value; n -= value) out += mark;
  return out;
}

/**
 * The honor a level earns: its metal, its title, and its step within the
 * honor (`rank`, from 1: Town lord at level 6 is Town lord I, at 7 Town
 * lord II).
 */
export function honorOf(level) {
  let honor = HONORS[0];
  for (const h of HONORS) if (level >= h.level) honor = h;
  return {
    tier: honor.tier,
    title: honor.title,
    rank: Math.max(1, level - honor.level + 1),
  };
}

/**
 * The honor's full name: "Town lord II". `t` translates the title into the
 * player's language; without it the title stays English.
 */
export function honorName(level, t = (text) => text) {
  const honor = honorOf(level);
  return `${t(honor.title)} ${roman(honor.rank)}`;
}

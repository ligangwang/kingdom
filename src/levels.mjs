// Account levels and XP. Every player has one account level, earned with XP
// from any game: the host's own games pay XP for play (capped each day), and
// every badge pays XP once (coins.mjs, BADGE_XP).
//
// The level sets the player's honor (honors.mjs) and how far their kingdom
// can grow (kingdom.mjs).

/** Play XP a player can earn in one UTC day. Badge XP is not capped. */
export const DAILY_XP_CAP = 300;

/** XP that reaches a level: 50·n·(n−1), so 0, 100, 300, 600, 1000, … */
export const xpToReach = (level) => 50 * level * (level - 1);

/** The level a total of XP has reached. */
export function levelFor(xp) {
  let level = 1;
  while (xpToReach(level + 1) <= xp) level++;
  return level;
}

/** The level, the XP and where the level starts and ends. */
export function levelProgress(xp) {
  const level = levelFor(xp);
  return { level, xp, floor: xpToReach(level), next: xpToReach(level + 1) };
}

/**
 * Play XP after the daily cap: `earned` is what a play scored, `today` the
 * play XP the player already got this UTC day.
 */
export function capPlayXp(earned, today) {
  const gained = Math.max(0, Math.min(earned, DAILY_XP_CAP - today));
  return { gained, capped: gained < earned };
}

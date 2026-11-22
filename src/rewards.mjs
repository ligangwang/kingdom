// The reward system's front door. The host (dingn) reports what a player
// did as an event, and every reward kind that listens for that event grants
// its share, all against the same two documents so the host can write them
// in one transaction:
//
//   const { rewards, player, granted } = grant(
//     { rewards: rewardsDoc, player: playerDoc },
//     { type: "badge", game: "rush", badge },
//   );
//
// `granted` lists what the player got, one entry per reward, such as
//   { reward: "coins", coins: 25, new: true, balance: 25 }
//   { reward: "xp", xp: 50 }
//   { reward: "level", from: 1, to: 2 }
//   { reward: "honor", level: 2, title: "Camp leader", tier: "bronze" }
// so the host can show a popup for each without knowing every kind.
//
// Adding a reward: write a kind ({ id, on, grant }) and add it to
// REWARD_KINDS. A host that passes events through `grant` gets it with the
// next package version, without changing its own code. A kind may keep its
// own field in the rewards document (as the kingdom keeps `kingdom`), and
// must never take anything from another kind's fields.
import { awardBadge, earnCoins, payBadgeXp, RewardError } from "./ledger.mjs";
import { honorOf } from "./honors.mjs";
import { levelFor } from "./levels.mjs";
import { MAX_EARN } from "./coins.mjs";

/** The events a host can report. */
export const EVENTS = {
  /** A game awarded a badge it lists: { game, badge }. */
  badge: "badge",
  /** A game paid a few coins for play itself: { game, coins }. */
  earn: "earn",
};

/** Coins for badges (each pays once, capped per game). */
export const badgeCoins = {
  id: "badge-coins",
  on: [EVENTS.badge],
  grant(state, { game, badge }, { now }) {
    const { doc, result } = awardBadge(state.rewards, game, badge, now);
    return {
      state: { ...state, rewards: doc },
      granted: [{ reward: "coins", ...result }],
    };
  },
};

/** Coins for play, within each game's daily allowance. */
export const playCoins = {
  id: "play-coins",
  on: [EVENTS.earn],
  grant(state, { game, coins }, { now }) {
    if (!Number.isInteger(coins) || coins < 1 || coins > MAX_EARN)
      throw new RewardError(400, "invalid-request");
    const { doc, result } = earnCoins(state.rewards, game, coins, now);
    return {
      state: { ...state, rewards: doc },
      granted: [{ reward: "coins", new: true, ...result }],
    };
  },
};

/** Account XP for badges: twice the coins of the badge's tier. */
export const badgeXp = {
  id: "badge-xp",
  on: [EVENTS.badge],
  grant(state, _event, { name }) {
    const paid = payBadgeXp(state.rewards, state.player, name);
    if (!paid.xp) return { state };
    return {
      state: { rewards: paid.doc, player: paid.player },
      granted: [{ reward: "xp", xp: paid.xp }],
    };
  },
};

/** A new level, and a new honor when the level opens one. */
export const levelUps = {
  id: "level-ups",
  on: Object.values(EVENTS),
  grant(state, _event, { before }) {
    const from = levelFor(before.player?.xp ?? 0);
    const to = levelFor(state.player?.xp ?? 0);
    if (to <= from) return { state };
    const granted = [{ reward: "level", from, to }];
    const honor = honorOf(to);
    if (honor.title !== honorOf(from).title)
      granted.push({
        reward: "honor",
        level: to,
        title: honor.title,
        tier: honor.tier,
      });
    return { state, granted };
  },
};

/** Every reward kind, in the order they grant. */
export const REWARD_KINDS = [badgeCoins, playCoins, badgeXp, levelUps];

/**
 * Grants what an event earns. `state` holds the player's rewards document
 * and XP document (either may be null for a new player). Returns the new
 * documents and what was granted. Throws RewardError for an event no kind
 * knows. `name` is a leaderboard name for a player who has none yet.
 */
export function grant(
  state,
  event,
  { now = new Date().toISOString(), name, kinds = REWARD_KINDS } = {},
) {
  const listening = kinds.filter((k) => k.on.includes(event?.type));
  if (!listening.length) throw new RewardError(400, "unknown-event");
  const before = { rewards: state?.rewards ?? null, player: state?.player ?? null };
  let current = before;
  const granted = [];
  for (const kind of listening) {
    const out = kind.grant(current, event, { now, name, before });
    current = out.state;
    granted.push(...(out.granted ?? []));
  }
  return { ...current, granted };
}

/** The total of one reward in a `granted` list, such as coins or xp. */
export const total = (granted, reward, field = reward) =>
  granted
    .filter((g) => g.reward === reward)
    .reduce((sum, g) => sum + (g[field] ?? 0), 0);

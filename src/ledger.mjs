// The reward ledger: pure functions over one player's rewards document. The
// host loads the document, calls one of these, and writes the result back in
// a transaction, so the rules live here and the storage stays with the host.
//
// Each player has one rewards document, which only the server writes:
//   { coins, spent, games: { <game>: coins its badges paid },
//     badges: { "<game>/<id>": … }, items: { "<game>/<id>": … },
//     daily: { day, games: { <game>: coins paid for play today } },
//     xpPaid, kingdom: { hall, tiles } }
// `coins` is the balance; coins earned in all = coins + spent.
//
// Games run in the player's browser, so nobody can prove a level was really
// passed. These rules limit what cheating can win instead: each badge pays
// once, each game's badge coins are capped (MAX_GAME_COINS), and coins for
// play are capped per game and day (DAILY_GAME_COINS).
import {
  BADGE_XP,
  DAILY_GAME_COINS,
  MAX_GAME_COINS,
  TIER_COINS,
} from "./coins.mjs";
import { levelFor } from "./levels.mjs";

/** A rule a request breaks: `code` says which, `status` is its HTTP status. */
export class RewardError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

/**
 * Records one badge. Returns the new document and what the player got:
 * `new` is false for a badge they already had, and `coins` is what it paid
 * (less than the tier's coins once the game's cap is reached).
 */
export function awardBadge(doc, game, badge, now = new Date().toISOString()) {
  const current = {
    ...(doc ?? {}),
    coins: doc?.coins ?? 0,
    games: { ...(doc?.games ?? {}) },
    badges: { ...(doc?.badges ?? {}) },
  };
  const key = `${game}/${badge.id}`;
  if (current.badges[key])
    return {
      doc: current,
      result: { new: false, coins: 0, balance: current.coins },
    };
  // Own properties only: a game id such as "constructor" must not read
  // Object.prototype.
  const earned = Object.hasOwn(current.games, game) ? current.games[game] : 0;
  // The tier's coins now, so what a tier pays can change.
  const coins = Math.max(
    0,
    Math.min(TIER_COINS[badge.tier] ?? 0, MAX_GAME_COINS - earned),
  );
  current.badges[key] = {
    game,
    id: badge.id,
    tier: badge.tier,
    ...(badge.level != null ? { level: badge.level } : { icon: badge.icon }),
    title: badge.title,
    coins,
    at: now,
  };
  current.games[game] = earned + coins;
  current.coins += coins;
  return {
    doc: current,
    result: { new: true, coins, balance: current.coins },
  };
}

/**
 * Buys one upgrade a game sells. Returns the new document and what happened:
 * `new` is false for an upgrade they already own (nothing is charged).
 * Throws RewardError when they need an earlier upgrade first ("requires") or
 * do not have enough coins ("not-enough-coins").
 */
export function buyItem(doc, game, item, now = new Date().toISOString()) {
  const current = {
    ...(doc ?? {}),
    coins: doc?.coins ?? 0,
    spent: doc?.spent ?? 0,
    games: { ...(doc?.games ?? {}) },
    badges: { ...(doc?.badges ?? {}) },
    items: { ...(doc?.items ?? {}) },
  };
  const key = `${game}/${item.id}`;
  if (current.items[key])
    return {
      doc: current,
      result: { new: false, coins: 0, balance: current.coins },
    };
  if (item.requires && !current.items[`${game}/${item.requires}`])
    throw new RewardError(409, "requires");
  if (current.coins < item.price)
    throw new RewardError(402, "not-enough-coins");
  current.items[key] = {
    game,
    id: item.id,
    price: item.price,
    title: item.title,
    at: now,
  };
  current.coins -= item.price;
  current.spent += item.price;
  return {
    doc: current,
    result: { new: true, coins: item.price, balance: current.coins },
  };
}

/**
 * Pays coins for play, up to the game's daily allowance. Returns the new
 * document and what was paid: `coins` is less than asked once today's
 * allowance runs out, and 0 after that.
 */
export function earnCoins(doc, game, coins, now = new Date().toISOString()) {
  const day = now.slice(0, 10);
  const daily = doc?.daily?.day === day ? doc.daily : { day, games: {} };
  const today = Object.hasOwn(daily.games, game) ? daily.games[game] : 0;
  const paid = Math.max(0, Math.min(coins, DAILY_GAME_COINS - today));
  const current = {
    ...(doc ?? {}),
    coins: (doc?.coins ?? 0) + paid,
    daily: { day, games: { ...daily.games, [game]: today + paid } },
  };
  return {
    doc: current,
    result: {
      coins: paid,
      balance: current.coins,
      left: DAILY_GAME_COINS - today - paid,
    },
  };
}

/** Account XP a player's badges have earned but not yet been paid. */
export function badgeXpOwed(doc) {
  const earned = Object.values(doc?.badges ?? {}).reduce(
    (sum, b) => sum + (BADGE_XP[b.tier] ?? 0),
    0,
  );
  return Math.max(0, earned - (doc?.xpPaid ?? 0));
}

/**
 * Pays the XP a rewards document owes into the player's XP document
 * ({ xp, level, … }). Returns the two new documents and the XP paid; `xpPaid`
 * in the rewards document counts what was added, so paying twice (or a
 * crash between the two writes) never pays twice. `name` is a leaderboard
 * name for a player who has none yet.
 */
export function payBadgeXp(doc, player, name) {
  const owed = badgeXpOwed(doc);
  if (!owed || !doc) return { doc, player, xp: 0 };
  const xp = (player?.xp ?? 0) + owed;
  return {
    doc: { ...doc, xpPaid: (doc.xpPaid ?? 0) + owed },
    player: {
      ...(player ?? {}),
      xp,
      level: levelFor(xp),
      badgeXp: (player?.badgeXp ?? 0) + owed,
      ...(player?.name || !name ? {} : { name }),
    },
    xp: owed,
  };
}

/**
 * A player's coins, badges (newest first), the upgrades they own and how
 * many friends joined through their challenges.
 */
export function wallet(doc) {
  return {
    coins: doc?.coins ?? 0,
    friends: doc?.referrals?.friends ?? 0,
    badges: Object.values(doc?.badges ?? {}).sort((a, b) =>
      b.at.localeCompare(a.at),
    ),
    items: Object.values(doc?.items ?? {})
      .sort((a, b) => b.at.localeCompare(a.at))
      .map(({ game, id, title }) => ({ game, id, title })),
  };
}

/**
 * A player's badges as anyone may see them, newest first: never what they
 * paid or when.
 */
export function publicBadges(doc) {
  return Object.values(doc?.badges ?? {})
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .map(({ game, id, tier, level, icon, title }) => ({
      game,
      id,
      tier,
      ...(level != null ? { level } : { icon }),
      title,
    }));
}

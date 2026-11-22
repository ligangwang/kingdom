// What rewards pay. Games list the badges they can award; the reward system,
// not the game, decides what each badge is worth in coins and XP.

/** Coins a badge pays, by tier. */
export const TIER_COINS = { bronze: 10, silver: 25, gold: 50, diamond: 100 };
/** Account XP a badge pays, by tier: twice its coins. */
export const BADGE_XP = { bronze: 20, silver: 50, gold: 100, diamond: 200 };
/** The most coins one game's badges can pay a player in all. */
export const MAX_GAME_COINS = 1000;
/**
 * Coins one game may pay a player in a UTC day for play itself (earnCoins),
 * such as a failed level that still got somewhere. Apart from
 * MAX_GAME_COINS. High enough for a good day of play, low enough that a
 * cheating game can't print coins.
 */
export const DAILY_GAME_COINS = 500;
/** The most coins one earnCoins call may ask for. */
export const MAX_EARN = 10;

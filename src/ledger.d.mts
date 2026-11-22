import type { Tier } from "./coins.mjs";
type Title = { en: string; zh: string };
export class RewardError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string);
}
export type BadgeDef = {
  id: string;
  tier: Tier;
  level?: number;
  icon?: string;
  title: Title;
};
export type ItemDef = {
  id: string;
  price: number;
  requires?: string;
  title: Title;
};
export type RewardsDoc = Record<string, any> | null | undefined;
export function awardBadge(
  doc: RewardsDoc,
  game: string,
  badge: BadgeDef,
  now?: string,
): {
  doc: Record<string, any>;
  result: { new: boolean; coins: number; balance: number };
};
export function buyItem(
  doc: RewardsDoc,
  game: string,
  item: ItemDef,
  now?: string,
): {
  doc: Record<string, any>;
  result: { new: boolean; coins: number; balance: number };
};
export function earnCoins(
  doc: RewardsDoc,
  game: string,
  coins: number,
  now?: string,
): {
  doc: Record<string, any>;
  result: { coins: number; balance: number; left: number };
};
export function badgeXpOwed(doc: RewardsDoc): number;
export function payBadgeXp(
  doc: RewardsDoc,
  player: Record<string, any> | null | undefined,
  name?: string,
): { doc: any; player: any; xp: number };
export type EarnedBadge = BadgeDef & {
  game: string;
  coins: number;
  at: string;
};
export function wallet(doc: RewardsDoc): {
  coins: number;
  friends: number;
  badges: EarnedBadge[];
  items: { game: string; id: string; title?: Title }[];
};
export function publicBadges(
  doc: RewardsDoc,
): Omit<EarnedBadge, "coins" | "at">[];

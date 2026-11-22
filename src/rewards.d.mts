import type { BadgeDef, RewardsDoc } from "./ledger.mjs";
export const EVENTS: { badge: "badge"; earn: "earn" };
export type RewardEvent =
  | { type: "badge"; game: string; badge: BadgeDef }
  | { type: "earn"; game: string; coins: number };
export type RewardState = {
  rewards: RewardsDoc | null;
  player: Record<string, any> | null | undefined;
};
export type Granted =
  | {
      reward: "coins";
      coins: number;
      new: boolean;
      balance: number;
      left?: number;
    }
  | { reward: "xp"; xp: number }
  | { reward: "level"; from: number; to: number }
  | { reward: "honor"; level: number; title: string; tier: string }
  | { reward: string; [field: string]: unknown };
export type RewardKind = {
  id: string;
  on: string[];
  grant(
    state: RewardState,
    event: RewardEvent,
    ctx: { now: string; name?: string; before: RewardState },
  ): { state: RewardState; granted?: Granted[] };
};
export const badgeCoins: RewardKind;
export const playCoins: RewardKind;
export const badgeXp: RewardKind;
export const levelUps: RewardKind;
export const REWARD_KINDS: RewardKind[];
export function grant(
  state: RewardState | null | undefined,
  event: RewardEvent,
  options?: { now?: string; name?: string; kinds?: RewardKind[] },
): { rewards: any; player: any; granted: Granted[] };
export function total(
  granted: Granted[],
  reward: string,
  field?: string,
): number;

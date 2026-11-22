export const DAILY_XP_CAP: number;
export function xpToReach(level: number): number;
export function levelFor(xp: number): number;
export type LevelProgress = {
  level: number;
  xp: number;
  floor: number;
  next: number;
};
export function levelProgress(xp: number): LevelProgress;
export function capPlayXp(
  earned: number,
  today: number,
): { gained: number; capped: boolean };

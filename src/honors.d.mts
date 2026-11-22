export type HonorTier = "bronze" | "silver" | "gold" | "diamond";
export type Honor = { level: number; tier: HonorTier; title: string };
export const HONORS: readonly Honor[];
export function roman(n: number): string;
export function honorOf(level: number): {
  tier: HonorTier;
  title: string;
  rank: number;
};
export function honorName(level: number, t?: (text: string) => string): string;

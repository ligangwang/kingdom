// What a host site gives the kingdom's pages: its words, its links, its
// coin picture and its API. The kingdom draws the pages; the host keeps
// sign-in, storage, routes and translations (dingn's src/components/
// kingdom-host.tsx).
import type { ComponentType, ReactNode } from "react";
import type {
  KingdomView as BaseView,
  PublicKingdom,
  StageId,
  Title,
} from "../kingdom.mjs";

/** The player's kingdom as the host's API returns it (kingdomView). */
export type KingdomView = BaseView & {
  /** Stages whose free buildings this visit placed (settleDoc's gifts). */
  gifts?: StageId[];
};

/** Another player's kingdom, as built (publicKingdom), for a visit. */
export type VisitedKingdom = PublicKingdom;

/** A failed API call; `code` names the reason (see ERRORS in kingdom-page). */
export type KingdomApiError = Error & { code?: string };

export type KingdomHost = {
  /** The host's language, for numbers. */
  locale: string;
  /**
   * English text in the page's language. Text with values in it is passed
   * whole ("Level 3 · Camp"); the host matches it against its patterns.
   */
  t: (text: string) => string;
  /** A building's, stage's or hall's name in the page's language. */
  name: (title: Title) => string;
  /** A link within the host. */
  Link: ComponentType<{
    href: string;
    className?: string;
    children?: ReactNode;
  }>;
  /** The host's coin picture. */
  Coin: ComponentType<{ size?: number }>;
  /** Where the pages link to. */
  links: {
    /** The kingdom page. */
    kingdom: string;
    /** Sign in, then come back to the kingdom page. */
    signIn: string;
    /** A game to earn XP in. */
    play: string;
  };
  /** The host's kingdom API. */
  api: {
    fetch: () => Promise<KingdomView>;
    build: (
      building: string,
      x: number,
      y: number,
    ) => Promise<KingdomView & { paid: number }>;
    move: (
      from: [number, number],
      to: [number, number],
    ) => Promise<KingdomView>;
  };
  /** Called with the player's coins after the kingdom loads or spends some. */
  onCoins?: (coins: number) => void;
};

export const reducedMotion = () =>
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

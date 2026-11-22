"use client";
// The kingdom on the player's account page: the stage, and what the next
// level opens.
import { useEffect, useState } from "react";
import { HALL_TITLES, MIN_LEVEL, STAGES } from "../kingdom.mjs";
import { xpToReach } from "../levels.mjs";
import type { KingdomHost, KingdomView } from "./host";

export function KingdomCard({ host: kingdomHost }: { host: KingdomHost }) {
  const { t, locale, name, Link, links, api } = kingdomHost;
  const [view, setView] = useState<KingdomView | null>(null);
  useEffect(() => {
    api
      .fetch()
      .then(setView)
      .catch(() => {});
    // Once, when the card mounts: a host may build a new host object on
    // each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const stage = STAGES.find((s) => s.id === view?.stage);
  const next = STAGES.find((s) => s.level > (view?.level ?? 0));
  const toGo = view && next ? Math.max(0, xpToReach(next.level) - view.xp) : 0;
  return (
    <section className="panel kingdom-card">
      <h2>{t("Your kingdom")}</h2>
      {!view ? (
        <p className="muted">{t("Loading…")}</p>
      ) : stage ? (
        <>
          <p>
            {t(
              `A ${name(stage.title).toLowerCase()} with a ${name(HALL_TITLES[view.hall]).toLowerCase()} and ${Object.keys(view.tiles).length} buildings.`,
            )}
          </p>
          {next && (
            <p className="muted">
              {t(
                `${toGo.toLocaleString(locale)} XP to a ${name(next.title).toLowerCase()}`,
              )}
            </p>
          )}
        </>
      ) : (
        <p>
          {t(
            `Reach level ${MIN_LEVEL} to found your kingdom, ${toGo.toLocaleString(locale)} XP to go.`,
          )}
        </p>
      )}
      <Link className="button" href={links.kingdom}>
        {t("Visit your kingdom →")}
      </Link>
    </section>
  );
}

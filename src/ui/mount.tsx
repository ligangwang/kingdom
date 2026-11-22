// The kingdom as a plugin: functions that draw its pages into an element
// with their own copy of React, so a host can load the plugin bundle
// (dist/plugin/ui.js, scripts/build-plugin.mjs) at run time without
// building it in. The host gives plain values and functions, never its own
// React components (PluginHost).
import { createRoot, type Root } from "react-dom/client";
import type { MouseEvent, ReactNode } from "react";
import { setAssetBase } from "../scene/asset-base";
import { KingdomCard } from "./kingdom-card";
import { KingdomPage } from "./kingdom-page";
import { KingdomVisit } from "./kingdom-visit";
import type { KingdomHost, VisitedKingdom } from "./host";

/** What a host gives the plugin: KingdomHost, with plain values for its parts. */
export type PluginHost = Omit<KingdomHost, "Link" | "Coin"> & {
  /** Opens a page of the host, for a plain click on a kingdom link. */
  navigate: (href: string) => void;
  /** The host's coin picture (a URL). */
  coin: string;
  /** Where the bundle's assets/kingdom/ folder is served, if not /models/kingdom/. */
  assets?: string;
};

/** A drawn page: give it new values, or take it away. */
export type Mounted<P> = { update: (props: P) => void; unmount: () => void };

export type PageProps = { host: PluginHost; player: string; ready: boolean };
export type VisitProps = {
  host: Pick<PluginHost, "t" | "name" | "assets">;
  kingdom: VisitedKingdom;
  label: string;
};
export type CardProps = { host: PluginHost };

/** The host's parts as the pages' components. */
function asKingdomHost(host: PluginHost): KingdomHost {
  const { navigate, coin, assets: _assets, ...rest } = host;
  function Link({
    href,
    className,
    children,
  }: {
    href: string;
    className?: string;
    children?: ReactNode;
  }) {
    const open = (event: MouseEvent<HTMLAnchorElement>) => {
      // Let the browser handle new tabs and windows.
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      event.preventDefault();
      navigate(href);
    };
    return (
      <a href={href} className={className} onClick={open}>
        {children}
      </a>
    );
  }
  function Coin({ size = 20 }: { size?: number }) {
    return (
      <img className="coin" src={coin} width={size} height={size} alt="" />
    );
  }
  return { ...rest, Link, Coin };
}

function mount<P>(
  element: Element,
  props: P,
  draw: (props: P) => ReactNode,
  assets: (props: P) => string | undefined,
): Mounted<P> {
  const root: Root = createRoot(element);
  const render = (next: P) => {
    const base = assets(next);
    if (base) setAssetBase(base);
    root.render(draw(next));
  };
  render(props);
  return { update: render, unmount: () => root.unmount() };
}

// The host object is turned into components once per host, so React keeps
// the page's state when the host only re-renders.
const hosts = new WeakMap<PluginHost, KingdomHost>();
const kingdomHost = (host: PluginHost) => {
  let made = hosts.get(host);
  if (!made) hosts.set(host, (made = asKingdomHost(host)));
  return made;
};

/** The kingdom page. Signed-out visitors see a sample kingdom. */
export function mountKingdomPage(element: Element, props: PageProps) {
  return mount(
    element,
    props,
    ({ host, player, ready }) => (
      <KingdomPage host={kingdomHost(host)} player={player} ready={ready} />
    ),
    (p) => p.host.assets,
  );
}

/** Another player's kingdom, for visitors to look around. */
export function mountKingdomVisit(element: Element, props: VisitProps) {
  return mount(
    element,
    props,
    ({ host, kingdom, label }) => (
      <KingdomVisit host={host} kingdom={kingdom} label={label} />
    ),
    (p) => p.host.assets,
  );
}

/** The player's kingdom on their account page. */
export function mountKingdomCard(element: Element, props: CardProps) {
  return mount(
    element,
    props,
    ({ host }) => <KingdomCard host={kingdomHost(host)} />,
    (p) => p.host.assets,
  );
}

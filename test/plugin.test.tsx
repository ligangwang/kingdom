// The kingdom as a plugin: its pages drawn by the mount functions with a
// host of plain values, as dingn gives them when it loads the bundle.
import { afterEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react";
import { mountKingdomCard, type PluginHost } from "../src/ui/mount";
import { assetBase, setAssetBase } from "../src/scene/asset-base";
import * as rules from "../src/rules.mjs";

vi.mock("../src/scene/kingdom-scene", () => ({
  webglAvailable: () => false,
  KingdomScene: class {},
}));

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  setAssetBase("/models/kingdom/");
});

function host(over: Partial<PluginHost> = {}): PluginHost {
  return {
    locale: "en",
    t: (text) => text,
    name: (title) => title.en,
    navigate: vi.fn(),
    coin: "/coin.svg",
    links: { kingdom: "/k/", signIn: "/signin/?next=/k/", play: "/play/" },
    api: {
      fetch: vi.fn(async () => ({
        level: 12,
        xp: 1500,
        floor: 0,
        next: 0,
        stage: "village" as const,
        size: 6,
        hall: "village",
        tiles: { "1,1": "well" },
        coins: 500,
      })),
      build: vi.fn(),
      move: vi.fn(),
    },
    ...over,
  };
}

it("draws the account card, and opens host pages through navigate", async () => {
  const element = document.body.appendChild(document.createElement("div"));
  const plugin = host({ assets: "/rewards/kingdom/0.3.0/assets/kingdom" });
  let mounted!: ReturnType<typeof mountKingdomCard>;
  await act(async () => {
    mounted = mountKingdomCard(element, { host: plugin });
  });
  const link = await screen.findByRole("link");
  expect(link.getAttribute("href")).toBe("/k/");
  fireEvent.click(link);
  expect(plugin.navigate).toHaveBeenCalledWith("/k/");
  // A click that opens a new tab is left to the browser.
  fireEvent.click(link, { ctrlKey: true });
  expect(plugin.navigate).toHaveBeenCalledTimes(1);
  expect(assetBase()).toBe("/rewards/kingdom/0.3.0/assets/kingdom/");
  await act(async () => mounted.unmount());
  await waitFor(() => expect(element.innerHTML).toBe(""));
});

it("gathers the rules in one module with its plugin API version", () => {
  expect(rules.PLUGIN_API).toBe(1);
  expect(typeof rules.rewards.grant).toBe("function");
  expect(typeof rules.levels.levelFor).toBe("function");
  expect(typeof rules.honors.honorName).toBe("function");
  expect(rules.kingdom.STAGES.length).toBeGreaterThan(0);
  expect(typeof rules.ledger.buyItem).toBe("function");
  expect(rules.coins.TIER_COINS).toBeTruthy();
});

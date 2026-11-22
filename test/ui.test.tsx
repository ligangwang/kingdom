// The kingdom's pages with a stand-in host: its words as given, plain links,
// and an API the test controls.
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { KingdomCard, KingdomPage, KingdomVisit } from "../src/ui/index";
import type { KingdomHost, KingdomView } from "../src/ui/index";
import { xpToReach } from "../src/levels.mjs";
import { MIN_LEVEL } from "../src/kingdom.mjs";

// No WebGL here: the pages fall back to a list of buildings.
vi.mock("../src/scene/kingdom-scene", () => ({
  webglAvailable: () => false,
  KingdomScene: class {},
}));

afterEach(cleanup);

const view = (over: Partial<KingdomView> = {}): KingdomView => ({
  level: 12,
  xp: 1500,
  floor: 0,
  next: 0,
  stage: "village",
  size: 6,
  hall: "village",
  tiles: { "1,1": "well", "2,1": "cottage" },
  coins: 500,
  ...over,
});

function host(api: Partial<KingdomHost["api"]> = {}): KingdomHost {
  return {
    locale: "en",
    t: (text) => text,
    name: (title) => title.en,
    Link: ({ href, className, children }) => (
      <a href={href} className={className}>
        {children as ReactNode}
      </a>
    ),
    Coin: () => <span>coin</span>,
    links: { kingdom: "/k/", signIn: "/signin/?next=/k/", play: "/play/" },
    api: {
      fetch: vi.fn(async () => view()),
      build: vi.fn(),
      move: vi.fn(),
      ...api,
    },
    onCoins: vi.fn(),
  };
}

it("invites a signed-out visitor to sign in, over a sample kingdom", () => {
  const h = host();
  render(<KingdomPage host={h} player="" ready />);
  expect(screen.getByText("Build your own kingdom")).toBeTruthy();
  expect(
    screen.getByRole("link", { name: "Sign in to start" }).getAttribute("href"),
  ).toBe("/signin/?next=/k/");
  expect(h.api.fetch).not.toHaveBeenCalled();
});

it("counts the XP to found a kingdom with the package's XP curve", async () => {
  const xp = 10;
  render(
    <KingdomPage
      host={host({ fetch: async () => view({ level: 1, xp, stage: null }) })}
      player="me"
      ready
    />,
  );
  const toGo = (xpToReach(MIN_LEVEL) - xp).toLocaleString("en");
  expect(await screen.findByText(`${toGo} XP to go`)).toBeTruthy();
});

it("loads the player's kingdom through the host, with the build panel", async () => {
  const h = host();
  render(<KingdomPage host={h} player="me" ready />);
  expect(await screen.findByText("Your village")).toBeTruthy();
  expect(screen.getByText("Level 12 · Village hall")).toBeTruthy();
  expect(h.onCoins).toHaveBeenCalledWith(500);
  // With no 3D, the buildings that stand are listed.
  const list = (await screen.findByText(/can’t show 3D/)).parentElement!;
  expect(within(list).getByText("Well")).toBeTruthy();
  // The build panel offers buildings for coins.
  fireEvent.click(screen.getByRole("button", { name: "Build" }));
  const panel = screen.getByRole("region", { name: "Build" });
  expect(within(panel).getByRole("button", { name: /Windmill/ })).toBeTruthy();
});

it("forgets a player's kingdom when they sign out", async () => {
  const h = host();
  const { rerender } = render(<KingdomPage host={h} player="me" ready />);
  expect(await screen.findByText("Your village")).toBeTruthy();
  rerender(<KingdomPage host={h} player="" ready />);
  expect(screen.getByText("Build your own kingdom")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Build" })).toBeNull();
});

it("shows another player's kingdom to visit", () => {
  render(
    <KingdomVisit
      host={host()}
      kingdom={{
        stage: "village",
        size: 6,
        hall: "village",
        tiles: { "0,2": "windmill" },
      }}
      label="Ada’s kingdom in 3D"
    />,
  );
  expect(screen.getByRole("img", { name: "Ada’s kingdom in 3D" })).toBeTruthy();
});

it("sums up the kingdom on the account card", async () => {
  render(<KingdomCard host={host()} />);
  await waitFor(() =>
    expect(
      screen.getByText("A village with a village hall and 2 buildings."),
    ).toBeTruthy(),
  );
  expect(
    screen
      .getByRole("link", { name: "Visit your kingdom →" })
      .getAttribute("href"),
  ).toBe("/k/");
});

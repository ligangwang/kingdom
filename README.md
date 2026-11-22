# kingdom

The reward system for [dingn](https://github.com/ligangwang/dingn) games.
dingn is the platform: it runs the games, sign-in, storage and the API.
kingdom decides what players earn and what it opens:

| Module             | What it holds                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| `kingdom/rewards`  | `grant(state, event)`: the one call a host makes when a player earns something, and the reward kinds |
| `kingdom/levels`   | The XP curve, account levels and the daily cap on play XP                                            |
| `kingdom/honors`   | Honors (Wanderer … High monarch) with their numerals and metals                                      |
| `kingdom/coins`    | What badges pay in coins and XP, and the caps that keep a cheating game from printing coins          |
| `kingdom/ledger`   | Pure functions over a player's rewards document: badges, purchases, coins for play, the wallet       |
| `kingdom/kingdom`  | The kingdom's stages, buildings and building rules, and the views a page or a visitor sees           |
| `kingdom/scene`    | The 3D island, drawn with three.js (TypeScript source; the host bundles it)                          |
| `kingdom/ui`       | The kingdom's pages as React components: the build page, a visit to another player, the account card |
| `kingdom/assets/*` | The kingdom's models and textures, with `kingdom/CREDITS.md`                                         |

Everything in `src/*.mjs` is a pure function over plain documents, so the
host keeps its own storage and transactions.

## The pages

`kingdom/ui` draws the kingdom's pages; the host passes a `KingdomHost`
(`src/ui/host.ts`) with its words, links, coin picture and API, and keeps
sign-in, routes, storage and translations:

```tsx
import { KingdomPage, KingdomVisit, KingdomCard } from "kingdom/ui";
import "kingdom/ui/kingdom.css";

<KingdomPage host={host} player={uid} ready={ready} />  // the build page
<KingdomVisit host={host} kingdom={publicKingdom} label="Ada’s kingdom" />
<KingdomCard host={host} />                             // on the account page
```

`host.t` gets English text, with values already in it
(`` `Level ${level} · ${hall}` ``), so a host translates it with its own
patterns.

## Using it in dingn

dingn installs a released version, from its GitHub release so no `git` or
registry token is needed in its Docker build:

```json
"kingdom": "https://github.com/ligangwang/kingdom/releases/download/v<version>/kingdom-<version>.tgz"
```

- The server imports the `.mjs` modules directly.
- Next.js bundles `kingdom/scene` and `kingdom/ui`
  (`transpilePackages: ["kingdom"]`); dingn's `src/components/kingdom-host.tsx`
  gives the pages its words, links and API.
- The models are copied from `node_modules/kingdom/assets/kingdom` to
  `public/models/kingdom` before each build, and the scene loads them from
  `/models/kingdom/`.
- dingn's admin Rewards page (`/admin/rewards/`) shows the version it runs.

## Releasing a version

Every change that reaches dingn is a new version
([semver](https://semver.org/)):

- **patch** (0.1.1) for a fix,
- **minor** (0.2.0) for a new reward kind, rule or building,
- **major** (1.0.0) for a change dingn must adapt to, such as a new event
  or a renamed export.

1. Raise `version` in `package.json` and `package-lock.json` in the same
   pull request (`npm version <patch|minor|major> --no-git-tag-version`).
   CI fails a pull request that changes `src/`, `assets/` or `package.json`
   with a version that is already released.
2. Merge it. The Release workflow runs the checks, tags `v<version>` and
   publishes a GitHub release with notes, the package file
   `kingdom-<version>.tgz` and the plugin bundle `kingdom-<version>.zip`.
3. The workflow uploads the plugin bundle to dingn, like a game upload. It
   waits on dingn's admin Rewards page (`/admin/rewards/`) until an admin
   approves it there or with a review key. Approving makes it the live
   version: dingn's server and pages load it within about a minute, with no
   rebuild. Uploading needs one repository secret, `DINGN_UPLOAD_KEY`: an
   upload key (from dingn's API keys page, `/developers/keys/`) of an
   account that is a dingn admin and a developer.

## The plugin bundle

dingn loads the kingdom at run time, like a game, from the bundle that
`npm run build:plugin` makes in `dist/plugin/` (`-- --zip` zips it):

| File              | What it is                                                                                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reward.json`     | The system (`kingdom`), its version and the plugin API (`PLUGIN_API` in `src/rules.mjs`)                                                              |
| `rules.mjs`       | Every rule module in one file with no imports (`src/rules.mjs`): `rewards`, `levels`, `honors`, `coins`, `ledger`, `kingdom`. dingn's server runs it. |
| `ui.js`, chunks   | The pages, with their own React and three (`src/ui/mount.tsx`): `mountKingdomPage`, `mountKingdomVisit`, `mountKingdomCard`                           |
| `kingdom.css`     | The pages' styles                                                                                                                                     |
| `assets/kingdom/` | The models, land textures and sky                                                                                                                     |

The mount functions take a host of plain values (`PluginHost`): words, links
and a `navigate` function, a coin picture URL, the API and where the assets
are served. dingn also installs this package from its GitHub release, as the
copy it falls back on when no version has been approved yet or the live one
can't load. Raise `PLUGIN_API` (a major version) when a change needs dingn
to adapt.

## Granting rewards

The host reports what happened as an event, with the player's rewards
document and XP document, and writes back what comes out in one
transaction:

```js
import { grant, total } from "kingdom/rewards";

const out = grant(
  { rewards: rewardsDoc, player: playerDoc },
  { type: "badge", game: "rush", badge },
  { name: "Kim" }, // a leaderboard name for a player who has none yet
);
// out.rewards, out.player: the documents to save
// out.granted: [{ reward: "coins", coins: 50, … }, { reward: "xp", xp: 100 },
//               { reward: "level", from: 1, to: 2 }, { reward: "honor", … }]
total(out.granted, "coins"); // 50
```

Events today:

| Event   | Fields          | Granted by                                                         |
| ------- | --------------- | ------------------------------------------------------------------ |
| `badge` | `game`, `badge` | coins for the badge's tier, its XP, and any new level and honor    |
| `earn`  | `game`, `coins` | coins for play (1–10 at a time, within the game's daily allowance) |

## Adding a reward

A reward kind is `{ id, on, grant }`:

```js
export const stars = {
  id: "stars",
  on: ["badge"], // the events it listens for
  grant(state, event, { now, before }) {
    const stars = (state.rewards?.stars ?? 0) + 1;
    return {
      state: { ...state, rewards: { ...state.rewards, stars } },
      granted: [{ reward: "stars", stars: 1 }],
    };
  },
};
```

Add it to `REWARD_KINDS` in `src/rewards.mjs`, with tests. A kind keeps its
own field in the rewards document and never takes from another kind's
fields. dingn passes every event through `grant`, saves both documents
and sends `granted` back to the page, so it picks the new reward up with the
next package version. A new kind of event (a streak, a friend joining) needs dingn to
report it once; after that, any number of rewards can listen for it.

## Development

```sh
npm install
npm run verify   # typecheck and tests
```

See `AGENTS.md` for the levels, XP and honors design and the art credits.

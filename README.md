# kingdom

The reward system for [dingn](https://github.com/ligangwang/dingn) games.
dingn is the platform: it runs the games, sign-in, storage and the API.
kingdom decides what players earn and what it opens:

| Module             | What it holds                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| `kingdom/rewards`  | `grant(state, event)`: the one call a host makes when a player earns something, and the reward kinds |
| `kingdom/levels`   | The XP curve, account levels and the daily cap on play XP                                             |
| `kingdom/honors`   | Honors (Wanderer … High monarch) with their numerals and metals                                       |
| `kingdom/coins`    | What badges pay in coins and XP, and the caps that keep a cheating game from printing coins           |
| `kingdom/ledger`   | Pure functions over a player's rewards document: badges, purchases, coins for play, the wallet        |
| `kingdom/kingdom`  | The kingdom's stages, buildings and building rules, and the views a page or a visitor sees            |
| `kingdom/scene`    | The 3D island, drawn with three.js (TypeScript source; the host bundles it)                           |
| `kingdom/assets/*` | The kingdom's models and textures, with `kingdom/CREDITS.md`                                          |

Everything in `src/*.mjs` is a pure function over plain documents, so the
host keeps its own storage and transactions.

## Using it in dingn

dingn installs a pinned commit, from a tarball so no `git` is needed in its
Docker build:

```json
"kingdom": "https://codeload.github.com/ligangwang/kingdom/tar.gz/<commit>"
```

- The server imports the `.mjs` modules directly.
- Next.js bundles `kingdom/scene` (`transpilePackages: ["kingdom"]`).
- The models are copied from `node_modules/kingdom/assets/kingdom` to
  `public/models/kingdom` before each build, and the scene loads them from
  `/models/kingdom/`.

To ship a change: merge it here, then bump the commit in dingn's
`package.json` and `package-lock.json` (`npm install <tarball url>`).

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

| Event   | Fields           | Granted by                                                          |
| ------- | ---------------- | ------------------------------------------------------------------- |
| `badge` | `game`, `badge`  | coins for the badge's tier, its XP, and any new level and honor     |
| `earn`  | `game`, `coins`  | coins for play (1–10 at a time, within the game's daily allowance) |

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

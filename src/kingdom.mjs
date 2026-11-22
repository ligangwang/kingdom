// The kingdom: a small 3D island on every player's account that grows with
// the account level. Players build on it with coins. The host's server and
// its kingdom page both read this file, so the rules the page shows are the
// rules the server enforces.
//
// A player's kingdom is kept in their rewards document (see ledger.mjs), next
// to their coins, so buying a building and paying for it is one write:
//   kingdom: { hall: "camp", tiles: { "<x>,<y>": "<building id>" } }
// The hall's grounds are the 3 x 3 tiles around 0,0 (HALL_RADIUS), where it
// grows from a campfire into a palace; nothing else can be built there.
import { levelProgress } from "./levels.mjs";

/** Kingdom stages, by the account level that opens each one. */
export const STAGES = [
  { id: "camp", level: 2, size: 5, title: { en: "Camp", zh: "营地" } },
  { id: "village", level: 4, size: 6, title: { en: "Village", zh: "村庄" } },
  { id: "town", level: 6, size: 7, title: { en: "Town", zh: "城镇" } },
  { id: "city", level: 10, size: 8, title: { en: "City", zh: "城市" } },
  { id: "kingdom", level: 15, size: 9, title: { en: "Kingdom", zh: "王国" } },
  { id: "capital", level: 20, size: 10, title: { en: "Capital", zh: "王都" } },
];
export const STAGE_IDS = STAGES.map((s) => s.id);
export const MIN_LEVEL = STAGES[0].level;

const b = (id, stage, coins, max, en, zh, extra = {}) => ({
  id,
  stage,
  coins,
  max,
  ...extra,
  title: { en, zh },
});
/**
 * What players can build. `stage` is the hall they need first. A hall
 * building (`hall: true`) upgrades the hall to its stage instead of taking a
 * tile; `max` is how many one kingdom can have.
 */
export const BUILDINGS = [
  b("path", "camp", 2, 40, "Stone path", "石板路"),
  b("tree", "camp", 5, 20, "Oak tree", "橡树"),
  b("flowers", "camp", 5, 20, "Flower bed", "花坛"),
  b("cottage", "camp", 20, 6, "Thatched cottage", "茅草屋"),
  b("farm", "camp", 15, 6, "Wheat field", "麦田"),
  b("hall-village", "village", 100, 1, "Village hall", "村公所", {
    hall: true,
  }),
  b("well", "village", 30, 1, "Well", "水井"),
  b("market", "village", 40, 3, "Market stall", "集市摊位"),
  b("windmill", "village", 120, 1, "Windmill", "风车"),
  b("hall-town", "town", 250, 1, "Great hall", "大会堂", { hall: true }),
  b("house", "town", 60, 6, "Town house", "城镇住宅"),
  b("forge", "town", 100, 1, "Blacksmith", "铁匠铺"),
  b("tower", "town", 150, 2, "Watchtower", "瞭望塔"),
  b("hall-city", "city", 500, 1, "Keep", "城堡主楼", { hall: true }),
  b("chapel", "city", 200, 1, "Chapel", "礼拜堂"),
  b("fountain", "city", 250, 1, "Fountain", "喷泉"),
  b("clock", "city", 300, 1, "Clock tower", "钟楼"),
  b("hall-kingdom", "kingdom", 800, 1, "Castle", "城堡", { hall: true }),
  b("statue", "kingdom", 300, 2, "Knight statue", "骑士雕像"),
  b("hall-capital", "capital", 1200, 1, "Palace", "宫殿", { hall: true }),
];
/** The hall's look at each stage (camp's campfire is free). */
export const HALL_TITLES = {
  camp: { en: "Campfire", zh: "篝火营地" },
  village: { en: "Village hall", zh: "村公所" },
  town: { en: "Great hall", zh: "大会堂" },
  city: { en: "Keep", zh: "城堡主楼" },
  kingdom: { en: "Castle", zh: "城堡" },
  capital: { en: "Palace", zh: "宫殿" },
};

export const building = (id) => BUILDINGS.find((b) => b.id === id) ?? null;
const rank = (stage) => STAGE_IDS.indexOf(stage);

/** The furthest stage an account level opens, or null below level 2. */
export function stageFor(level) {
  let open = null;
  for (const stage of STAGES) if (level >= stage.level) open = stage;
  return open;
}

/**
 * The tiles of a square of `size`, around the hall at 0,0: x and y run from
 * -floor((size-1)/2) to ceil((size-1)/2), so every stage keeps the old land.
 */
export function landBounds(size) {
  const lo = -Math.floor((size - 1) / 2);
  return { lo, hi: lo + size - 1 };
}
export function onLand(size, x, y) {
  const { lo, hi } = landBounds(size);
  return x >= lo && x <= hi && y >= lo && y <= hi;
}
export const tileKey = (x, y) => `${x},${y}`;
export const HALL_RADIUS = 1;
/** True for the tiles the hall stands on. */
export const isHallTile = (x, y) =>
  Math.abs(x) <= HALL_RADIUS && Math.abs(y) <= HALL_RADIUS;

/** A player's kingdom as kept, with defaults for one not built yet. */
export function kingdomOf(doc) {
  const k = doc?.kingdom;
  return {
    hall: STAGE_IDS.includes(k?.hall) ? k.hall : "camp",
    tiles: { ...(k?.tiles ?? {}) },
  };
}

export class KingdomError extends Error {
  constructor(code, status = 409) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

/**
 * Builds `id` on tile x,y (a hall needs no tile) for a player at `level`
 * holding `coins`. Returns the new kingdom and what it cost, or throws a
 * KingdomError naming the rule it breaks.
 */
export function build(kingdom, { id, x, y }, level, coins) {
  const def = building(id);
  if (!def) throw new KingdomError("unknown-building", 404);
  const open = stageFor(level);
  if (!open) throw new KingdomError("locked", 403);
  if (rank(def.stage) > rank(open.id)) throw new KingdomError("level", 403);
  const next = { hall: kingdom.hall, tiles: { ...kingdom.tiles } };
  if (def.hall) {
    if (rank(def.stage) <= rank(kingdom.hall))
      throw new KingdomError("already-built");
    if (rank(def.stage) !== rank(kingdom.hall) + 1)
      throw new KingdomError("hall-first");
    next.hall = def.stage;
  } else {
    if (rank(def.stage) > rank(kingdom.hall))
      throw new KingdomError("hall-first");
    if (!Number.isInteger(x) || !Number.isInteger(y))
      throw new KingdomError("invalid-request", 400);
    if (!onLand(open.size, x, y) || isHallTile(x, y))
      throw new KingdomError("off-land");
    const key = tileKey(x, y);
    if (next.tiles[key]) throw new KingdomError("occupied");
    const count = Object.values(next.tiles).filter((b) => b === id).length;
    if (count >= def.max) throw new KingdomError("max");
    next.tiles[key] = id;
  }
  if (coins < def.coins) throw new KingdomError("not-enough-coins", 402);
  return { kingdom: next, coins: def.coins };
}

/** Moves the building on one tile to an empty tile, free. */
export function move(kingdom, { from, to }, level) {
  const open = stageFor(level);
  if (!open) throw new KingdomError("locked", 403);
  const valid = (t) =>
    Array.isArray(t) && t.length === 2 && t.every(Number.isInteger);
  if (!valid(from) || !valid(to))
    throw new KingdomError("invalid-request", 400);
  const a = tileKey(...from);
  const b = tileKey(...to);
  if (!kingdom.tiles[a]) throw new KingdomError("empty");
  if (!onLand(open.size, ...to) || isHallTile(...to))
    throw new KingdomError("off-land");
  if (kingdom.tiles[b]) throw new KingdomError("occupied");
  const tiles = { ...kingdom.tiles, [b]: kingdom.tiles[a] };
  delete tiles[a];
  return { hall: kingdom.hall, tiles };
}

/**
 * What a kingdom page needs, from a player's rewards document and their XP
 * document: the level, the open stage, the map and the coins.
 */
export function kingdomView(doc, player) {
  const progress = levelProgress(player?.xp ?? 0);
  const stage = stageFor(progress.level);
  const kingdom = kingdomOf(doc);
  return {
    ...progress,
    stage: stage?.id ?? null,
    size: stage?.size ?? 0,
    hall: kingdom.hall,
    tiles: kingdom.tiles,
    coins: doc?.coins ?? 0,
  };
}

/**
 * Builds in a rewards document for a player at `level`. Returns the new
 * document and what it cost, or throws a KingdomError.
 */
export function buildIn(doc, request, level) {
  const coins = doc?.coins ?? 0;
  const done = build(kingdomOf(doc), request, level, coins);
  return {
    doc: {
      ...(doc ?? {}),
      coins: coins - done.coins,
      spent: (doc?.spent ?? 0) + done.coins,
      kingdom: done.kingdom,
    },
    coins: done.coins,
  };
}

/**
 * Another player's kingdom as built, for visitors: the stage their level
 * opens, the hall and what stands on each tile. Null below the level that
 * founds one. Never their coins.
 */
export function publicKingdom(doc, level) {
  const stage = stageFor(level);
  if (!stage) return null;
  const kingdom = kingdomOf(doc);
  return {
    stage: stage.id,
    size: stage.size,
    hall: kingdom.hall,
    tiles: kingdom.tiles,
  };
}

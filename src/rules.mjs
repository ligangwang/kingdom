// The kingdom's rules in one module, for a host that loads the plugin
// bundle (dist/plugin/rules.mjs, scripts/build-plugin.mjs) at run time: its
// server reports events to them, and its pages draw honors and stages with
// them. Pure functions with no imports outside this package, so the same
// file runs in Node and in a browser.

/** The plugin contract's version. A host refuses a bundle it doesn't know. */
export const PLUGIN_API = 1;

export * as rewards from "./rewards.mjs";
export * as levels from "./levels.mjs";
export * as honors from "./honors.mjs";
export * as coins from "./coins.mjs";
export * as ledger from "./ledger.mjs";
export * as kingdom from "./kingdom.mjs";

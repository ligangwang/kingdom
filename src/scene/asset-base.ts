// Where the kingdom's models, land textures and sky are served from. A host
// that bundles the kingdom copies assets/kingdom/ to /models/kingdom/ (the
// default); one that loads the plugin bundle points it at the bundle's
// assets/kingdom/ folder (mount.tsx).
let base = "/models/kingdom/";

/** The folder the kingdom's assets are served from, ending in "/". */
export const assetBase = () => base;

/** Serves the kingdom's assets from another folder. */
export function setAssetBase(url: string) {
  base = url.endsWith("/") ? url : `${url}/`;
}

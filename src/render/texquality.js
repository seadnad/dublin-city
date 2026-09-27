// Texture sampling quality, applied once after the world is built (before textures are uploaded).
// Tiled ground-plane textures are seen at grazing angles from a chase camera, so they get the most
// anisotropic filtering; everything else gets a moderate amount. Phones are capped for bandwidth.
import { IS_MOBILE } from '../world/textures.js';

const MAP_SLOTS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'bumpMap', 'emissiveMap', 'aoMap', 'alphaMap'];

export function applyTextureQuality(root, renderer) {
  const max = renderer.capabilities.getMaxAnisotropy();
  const ground = Math.min(max, IS_MOBILE ? 4 : 16);
  const other = Math.min(max, IS_MOBILE ? 2 : 8);
  const seen = new Set();
  root.traverse((o) => {
    if (!o.material) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      for (const slot of MAP_SLOTS) {
        const t = m[slot];
        if (!t || seen.has(t) || t.isDataTexture && t.type !== 1009 /* UnsignedByteType */) continue;
        seen.add(t);
        // tiled (repeat-wrapped) textures cover roads, pavements and walls: the grazing-angle case
        const tiled = t.wrapS === 1000 /* RepeatWrapping */;
        const want = tiled ? ground : other;
        if (t.anisotropy !== want) { t.anisotropy = want; t.needsUpdate = true; }
      }
    }
  });
  return { textures: seen.size, ground, other };
}

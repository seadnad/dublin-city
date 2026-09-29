// One browser session for the Parliament House work: the footprint and bridge checks, then the review shots
// (tools/scenarios/parliament.mjs; its env vars apply).
import footprints from './footprints.mjs';
import bridges from './bridges.mjs';
import parliament from './parliament.mjs';
export default async function (page, shot, opts) {
  await footprints(page, shot, opts);
  await bridges(page, shot, opts);
  if (!process.env.CHECKS_ONLY) await parliament(page, shot, opts);
}

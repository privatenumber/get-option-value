/**
 * Generates src/flags.ts and docs/flags.json from the committed option
 * history (history/node-options.json), which `pnpm record-releases` fills by
 * dumping the internal option schema (names, types, aliases, defaults) of
 * every Node release in the supported range. Implications are not exposed at
 * runtime, so the recorder extracts them from each release's
 * src/node_options.cc.
 *
 * Generation needs no binaries: emit derives each flag's forms per release
 * and branches the flags that drift on the exact release they changed.
 * Read-set drift is a hard error there. Only the source links in
 * docs/flags.json need the network.
 *
 * Run: pnpm generate
 */
import { readHistory } from './history/index.ts';
import { readNodeSource } from './implications.ts';
import { compareVersions } from './version.ts';
import { emit } from './emit.ts';

const history = await readHistory();
if (history.size === 0) {
	throw new Error('The option history is empty; run `pnpm record-releases` first');
}
const releases = [...history.keys()].sort(compareVersions);

await emit({
	releases,
	schemas: releases.map(release => history.get(release)!),
	readSource: readNodeSource,
});

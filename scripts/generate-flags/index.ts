/**
 * Generates src/flags.ts from real Node.js binaries.
 *
 * For every major (18-26), the latest release is downloaded via get-node
 * and spawned with --expose-internals to dump its internal option schema
 * (names, types, aliases) and the default value of every
 * option. Implications are not exposed at runtime, so they are extracted
 * from the exact version's src/node_options.cc.
 *
 * The schemas are held in memory (not committed) and passed to emit, which
 * snapshots the newest major and branches the few flags that drift across
 * majors. Read-set drift is a hard error there.
 *
 * Run: pnpm generate
 */
import { buildSchema } from './build-schema.ts';
import { emit } from './emit.ts';

const majors = [18, 19, 20, 21, 22, 23, 24, 25, 26];

// Each major's schema is dumped from an independent Node binary, so build
// them concurrently rather than serializing the subprocess waits
const builds = await Promise.all(majors.map(buildSchema));

await emit({
	versions: builds.map(build => build.version),
	schemas: builds.map(build => build.schema),
	sources: builds.map(build => build.source),
});

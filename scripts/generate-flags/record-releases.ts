/**
 * Records every Node release in the supported range (package.json `engines`)
 * that the option history doesn't have yet: downloads each binary into a
 * temporary directory, dumps its option schema, then deletes the binary.
 * Recorded releases are never re-dumped (released binaries are immutable),
 * so routine runs touch only the newest releases.
 *
 * Run: pnpm record-releases
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import packageJson from '../../package.json' with { type: 'json' };
import { buildSchema } from './build-schema.ts';
import { readHistory, writeHistory } from './history/index.ts';
import { majorOf } from './version.ts';

// Each job holds one extracted binary (~110-190 MB) until it is dumped
const concurrency = 6;

const minimumMajor = Number(/\d+/.exec(packageJson.engines.node)![0]);

const fetchReleases = async () => {
	const response = await fetch('https://nodejs.org/dist/index.json');
	if (!response.ok) {
		throw new Error(`Failed to fetch the Node release index: ${response.status}`);
	}
	const index = await response.json() as { version: string }[];
	return index
		.map(release => release.version.slice(1))
		// Prereleases (e.g. 27.0.0-alpha.0.0.0) are excluded: their options are
		// still in flux, and forVersion can't order them before the final release
		.filter(version => /^\d+\.\d+\.\d+$/.test(version) && majorOf(version) >= minimumMajor);
};

const [schemas, releases] = await Promise.all([readHistory(), fetchReleases()]);
const pending = releases.filter(version => !schemas.has(version));
console.log(`${pending.length} unrecorded releases (${schemas.size} recorded)`);

await using temporaryDirectory = await fs.mkdtempDisposable(path.join(os.tmpdir(), 'get-option-value-'));

const failures: unknown[] = [];
let next = 0;
const worker = async () => {
	while (next < pending.length) {
		const version = pending[next];
		next += 1;
		const outputDirectory = path.join(temporaryDirectory.path, version);
		try {
			schemas.set(version, await buildSchema(version, outputDirectory));
			console.log(`Node ${version}: recorded`);
		} catch (error) {
			failures.push(error);
			console.error(`Node ${version}: failed`, error);
		} finally {
			await fs.rm(outputDirectory, {
				recursive: true,
				force: true,
			});
		}
	}
};
await Promise.all(Array.from({ length: concurrency }, worker));

// Keep the successful dumps even if some failed, so a rerun resumes
const recorded = await writeHistory(schemas);
console.log(`History has ${recorded.length} releases (${recorded[0]} - ${recorded.at(-1)})`);

if (failures.length > 0) {
	throw new AggregateError(failures, `${failures.length} releases failed to record`);
}

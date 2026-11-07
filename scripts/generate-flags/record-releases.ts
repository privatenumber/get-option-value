/**
 * Records every Node release in the supported range (package.json `engines`)
 * that the option history doesn't have yet: downloads each binary into a
 * temporary directory, dumps its option schema, then deletes the binary.
 * Recorded releases are never re-dumped (released binaries are immutable),
 * so routine runs touch only the newest releases.
 *
 * With --refresh-sources, it instead re-applies the source-derived data
 * (implications, environment variables) to every recorded release, without
 * downloading binaries. Run it after changing a source parser.
 *
 * Run: pnpm record-releases [--refresh-sources]
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import packageJson from '../../package.json' with { type: 'json' };
import { applySource, buildSchema } from './build-schema.ts';
import { readNodeSource } from './implications.ts';
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

const refreshSources = process.argv.includes('--refresh-sources');

const [schemas, releases] = await Promise.all([readHistory(), fetchReleases()]);

/** Runs `job` per version with bounded concurrency, collecting failures. */
const runJobs = async (versions: string[], job: (version: string) => Promise<void>) => {
	const failures: unknown[] = [];
	let next = 0;
	const worker = async () => {
		while (next < versions.length) {
			const version = versions[next];
			next += 1;
			try {
				await job(version);
			} catch (error) {
				failures.push(error);
				console.error(`Node ${version}: failed`, error);
			}
		}
	};
	await Promise.all(Array.from({ length: concurrency }, worker));
	return failures;
};

let failures: unknown[];
if (refreshSources) {
	failures = await runJobs([...schemas.keys()], async (version) => {
		const schema = schemas.get(version)!;
		const options = new Map(Object.entries(structuredClone(schema.options)));
		const [nodeOptions, node] = await Promise.all([
			readNodeSource(version),
			readNodeSource(version, 'node.cc'),
		]);
		applySource(version, options, {
			nodeOptions,
			node,
		});
		schemas.set(version, {
			...schema,
			options: Object.fromEntries(options),
		});
	});
	console.log(`Refreshed source data for ${schemas.size - failures.length} releases`);
} else {
	const pending = releases.filter(version => !schemas.has(version));
	console.log(`${pending.length} unrecorded releases (${schemas.size} recorded)`);

	await using temporaryDirectory = await fs.mkdtempDisposable(path.join(os.tmpdir(), 'get-option-value-'));
	failures = await runJobs(pending, async (version) => {
		const outputDirectory = path.join(temporaryDirectory.path, version);
		try {
			schemas.set(version, await buildSchema(version, outputDirectory));
			console.log(`Node ${version}: recorded`);
		} finally {
			await fs.rm(outputDirectory, {
				recursive: true,
				force: true,
			});
		}
	});
}

// Keep the successful dumps even if some failed, so a rerun resumes
const recorded = await writeHistory(schemas);
console.log(`History has ${recorded.length} releases (${recorded[0]} - ${recorded.at(-1)})`);

if (failures.length > 0) {
	throw new AggregateError(failures, `${failures.length} releases failed to record`);
}

/**
 * The committed option history: every recorded Node release's option schema,
 * stored as change points along the semver-sorted release axis. Released
 * binaries are immutable, so a recorded release never needs re-dumping; the
 * recorder appends only new releases, and generation reads this file offline.
 *
 * Each option/alias holds `[release, value]` entries; a value applies from
 * its release up to (excluding) the next entry's release. `null` means the
 * option/alias doesn't exist from that release on.
 */
import fs from 'node:fs/promises';
import type { OptionsSchema, OptionSpec } from '../schema-types.ts';
import { compareVersions } from '../version.ts';

type Timeline<Value> = [release: string, value: Value | null][];

type History = {
	releases: string[];
	options: Record<string, Timeline<OptionSpec>>;
	aliases: Record<string, Timeline<string[]>>;
};

export const historyPath = new URL('node-options.json', import.meta.url);

/** Fixed key order, so equal specs serialize identically (compared as JSON). */
const normalizeOption = ({
	type,
	default: default_,
	implies,
	impliesNot,
	negationImplies,
	negationImpliesNot,
	helpText,
}: OptionSpec): OptionSpec => ({
	type,
	...(default_ !== undefined && { default: default_ }),
	...(implies && { implies }),
	...(impliesNot && { impliesNot }),
	...(negationImplies && { negationImplies }),
	...(negationImpliesNot && { negationImpliesNot }),
	...(helpText && { helpText }),
});

const sortedKeys = (records: Record<string, unknown>[]) => (
	[...new Set(records.flatMap(record => Object.keys(record)))].sort()
);

const encodeTimelines = <Value>(
	releases: string[],
	records: Record<string, Value>[],
) => {
	const timelines: Record<string, Timeline<Value>> = {};
	for (const key of sortedKeys(records)) {
		const timeline: Timeline<Value> = [];
		let previous: string | undefined;
		for (const [index, record] of records.entries()) {
			const value = Object.hasOwn(record, key) ? record[key] : null;
			const serialized = JSON.stringify(value);
			if (serialized !== previous) {
				timeline.push([releases[index], value]);
				previous = serialized;
			}
		}
		timelines[key] = timeline;
	}
	return timelines;
};

const decodeTimelines = <Value>(
	releases: string[],
	timelines: Record<string, Timeline<Value>>,
) => {
	const records = releases.map((): Record<string, Value> => ({}));
	const indexOf = new Map(releases.map((release, index) => [release, index]));
	for (const [key, timeline] of Object.entries(timelines)) {
		for (const [entryIndex, [release, value]] of timeline.entries()) {
			if (value === null) {
				continue;
			}
			const start = indexOf.get(release)!;
			const nextRelease = timeline[entryIndex + 1]?.[0];
			const end = nextRelease === undefined ? releases.length : indexOf.get(nextRelease)!;
			for (let index = start; index < end; index += 1) {
				records[index][key] = value;
			}
		}
	}
	return records;
};

export type ReleaseSchemas = Map<string, OptionsSchema>;

export const readHistory = async (): Promise<ReleaseSchemas> => {
	let history: History;
	try {
		history = JSON.parse(await fs.readFile(historyPath, 'utf8')) as History;
	} catch (error) {
		// No history yet: the recorder backfills every release from scratch
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return new Map();
		}
		throw error;
	}
	const options = decodeTimelines(history.releases, history.options);
	const aliases = decodeTimelines(history.releases, history.aliases);
	return new Map(history.releases.map((release, index) => [
		release,
		{
			options: options[index],
			aliases: aliases[index],
		},
	]));
};

/**
 * Serializes one timeline entry per line, so a new release shows up in a diff
 * as exactly the options it changed.
 */
const stringifyTimelines = (timelines: Record<string, Timeline<unknown>>) => {
	const keys = Object.keys(timelines);
	if (keys.length === 0) {
		return '{}';
	}
	const body = keys.map((key) => {
		const entries = timelines[key].map(entry => `\t\t\t${JSON.stringify(entry)}`);
		return `\t\t${JSON.stringify(key)}: [\n${entries.join(',\n')}\n\t\t]`;
	});
	return `{\n${body.join(',\n')}\n\t}`;
};

export const writeHistory = async (schemas: ReleaseSchemas) => {
	const releases = [...schemas.keys()].sort(compareVersions);
	const ordered = releases.map(release => schemas.get(release)!);
	const options = encodeTimelines(
		releases,
		ordered.map(schema => Object.fromEntries(
			Object.entries(schema.options).map(([name, option]) => [name, normalizeOption(option)]),
		)),
	);
	const aliases = encodeTimelines(releases, ordered.map(schema => schema.aliases));

	const output = `{
\t"releases": [
${releases.map(release => `\t\t${JSON.stringify(release)}`).join(',\n')}
\t],
\t"options": ${stringifyTimelines(options)},
\t"aliases": ${stringifyTimelines(aliases)}
}
`;
	await fs.writeFile(historyPath, output);
	return releases;
};

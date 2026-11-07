import type { OptionSpec } from './schema-types.ts';

const sourceUrls = (version: string) => [
	// jsDelivr fronts the nodejs/node repo by tag over a CDN
	`https://cdn.jsdelivr.net/gh/nodejs/node@v${version}/src/node_options.cc`,
	`https://raw.githubusercontent.com/nodejs/node/v${version}/src/node_options.cc`,
];

/**
 * Reads src/node_options.cc for an exact version (implications aren't
 * exposed at runtime, so they must come from source). Either host
 * intermittently rejects bursts of concurrent requests (jsDelivr with 403,
 * raw.githubusercontent.com with 429), so each is tried twice.
 */
export const readNodeOptionsSource = async (version: string) => {
	const failures: string[] = [];
	for (const url of sourceUrls(version)) {
		for (let attempt = 0; attempt < 2; attempt += 1) {
			const response = await fetch(url);
			if (response.ok) {
				return response.text();
			}
			failures.push(`${url}: ${response.status}`);
		}
	}
	throw new Error(`Failed to fetch node_options.cc for ${version}:\n${failures.join('\n')}`);
};

type Implication = {
	fromName: string;
	targetName: string;
	field: 'implies' | 'impliesNot' | 'negationImplies' | 'negationImpliesNot';
};

/**
 * Extracts Implies("--a", "--b") / ImpliesNot("--a", "--b") registrations
 * from src/node_options.cc. Multiline-safe: arguments may be wrapped by
 * clang-format. Keys starting with --no- are Node registering implications
 * for the negated form; they attach to the base option's negationImplies /
 * negationImpliesNot.
 */
export const extractImplications = (source: string): Implication[] => {
	const pattern = /\bImplies(Not)?\s*\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/g;
	const implications: Implication[] = [];
	for (const [, not, fromKey, targetName] of source.matchAll(pattern)) {
		const negated = fromKey.startsWith('--no-');
		implications.push({
			fromName: negated ? `--${fromKey.slice(5)}` : fromKey,
			targetName,
			field: negated
				? (not ? 'negationImpliesNot' : 'negationImplies')
				: (not ? 'impliesNot' : 'implies'),
		});
	}
	return implications;
};

export const attachImplications = (
	version: string,
	options: Map<string, OptionSpec>,
	implications: Implication[],
) => {
	for (const { fromName, targetName, field } of implications) {
		const from = options.get(fromName);
		if (!from) {
			throw new Error(`Node ${version}: implication source ${fromName} is not in the option schema`);
		}
		if (!options.has(targetName)) {
			throw new Error(`Node ${version}: implication target ${targetName} is not in the option schema`);
		}
		// Preserve source registration order: Node fires implications
		// in multimap insertion order
		(from[field] ??= []).push(targetName);
	}
};

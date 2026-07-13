import type { OptionSpec } from './schema-types.ts';

/**
 * Reads src/node_options.cc for an exact version from jsDelivr, which fronts
 * the nodejs/node repo by tag over a CDN (implications aren't exposed at
 * runtime, so they must come from source). jsDelivr isn't rate-limited at this
 * volume, unlike raw.githubusercontent.com fetched concurrently per major.
 */
export const readNodeOptionsSource = async (version: string) => {
	const url = `https://cdn.jsdelivr.net/gh/nodejs/node@v${version}/src/node_options.cc`;
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch ${url}: ${response.status}`);
	}
	return response.text();
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

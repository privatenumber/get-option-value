import type { OptionSpec } from './schema-types.ts';

const sourceUrls = (version: string, file: string) => [
	// jsDelivr fronts the nodejs/node repo by tag over a CDN
	`https://cdn.jsdelivr.net/gh/nodejs/node@v${version}/src/${file}`,
	`https://raw.githubusercontent.com/nodejs/node/v${version}/src/${file}`,
];

/**
 * Reads a file under src/ at an exact version (implications and environment
 * variables aren't exposed at runtime, so they must come from source). Either
 * host intermittently rejects bursts of concurrent requests (jsDelivr with
 * 403, raw.githubusercontent.com with 429) or drops connections, so each host
 * is tried twice before the next.
 */
export const readNodeSource = async (version: string, file = 'node_options.cc') => {
	const failures: string[] = [];
	for (const url of sourceUrls(version, file)) {
		for (let attempt = 0; attempt < 2; attempt += 1) {
			try {
				const response = await fetch(url);
				if (response.ok) {
					return await response.text();
				}
				failures.push(`${url}: ${response.status}`);
			} catch (error) {
				// A network failure (DNS, reset) is as retryable as a rejection
				failures.push(`${url}: ${(error as Error).message}`);
			}
		}
	}
	throw new Error(`Failed to fetch ${file} for ${version}:\n${failures.join('\n')}`);
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

export type Sources = {
	nodeOptions: string;
	node: string;
};

/**
 * Maps option struct fields to option names through their AddOption
 * registrations: `&EnvironmentOptions::field` / `&PerProcessOptions::field`,
 * or since 26.9.0 for booleans `BOOL_FIELD(field)`. The macro is shared by
 * every option struct, so a field must map to exactly one option.
 */
const optionsByField = (source: string) => {
	const fields = new Map<string, Set<string>>();
	const registration = /AddOption\(\s*"(--[\w-]+)",[^;]*?(?:&(?:EnvironmentOptions|PerProcessOptions)::|BOOL_FIELD\()(\w+)/g;
	for (const [, name, field] of source.matchAll(registration)) {
		let names = fields.get(field);
		if (!names) {
			names = new Set();
			fields.set(field, names);
		}
		names.add(name);
	}
	return fields;
};

/**
 * Extracts the environment variables Node reads into options before (or, for
 * an empty value, after) parsing NODE_OPTIONS and argv:
 * - HandleEnvOptions in src/node_options.cc
 *   (https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L2528-L2546):
 *   `env_options->field = opt_getter("NODE_X") == "1";` sets a boolean, and
 *   `env_options->field = opt_getter("NODE_X");` a string.
 * - src/node.cc, which read NODE_USE_SYSTEM_CA into a per-process option in
 *   some releases (https://github.com/nodejs/node/blob/v22.23.4/src/node.cc#L927-L935),
 *   and reads NODE_ICU_DATA when --icu-data-dir is empty
 *   (https://github.com/nodejs/node/blob/v26.13.0/src/node.cc#L1084-L1086).
 *   An explicit --icu-data-dir can't be empty, so both act as a starting
 *   value that NODE_OPTIONS and argv override.
 */
export const attachEnvironment = (
	version: string,
	options: Map<string, OptionSpec>,
	{ nodeOptions, node }: Sources,
) => {
	const start = nodeOptions.search(/void HandleEnvOptions\(std::shared_ptr<EnvironmentOptions> env_options,\s*std::function/);
	if (start === -1) {
		throw new Error(`Node ${version}: HandleEnvOptions not found in node_options.cc`);
	}
	const body = nodeOptions.slice(start, nodeOptions.indexOf('\n}', start));

	const assignments: { field: string;
		variable: string;
		isFlag: boolean; }[] = [];
	for (const [, field, variable, isFlag] of body.matchAll(/env_options->(\w+)\s*=\s*opt_getter\("(\w+)"\)(\s*==\s*"1")?/g)) {
		assignments.push({
			field,
			variable,
			isFlag: Boolean(isFlag),
		});
	}
	for (const [, variable, field] of node.matchAll(/SafeGetenv\("(NODE_\w+)",\s*&(\w+)\)\s*&&\s*\2\s*==\s*"1"\)\s*\{\s*per_process::cli_options->(\w+)\s*=\s*true;/g)) {
		assignments.push({
			field,
			variable,
			isFlag: true,
		});
	}
	for (const [, field, variable] of node.matchAll(/if\s*\(per_process::cli_options->(\w+)\.empty\(\)\)\s*credentials::SafeGetenv\("(NODE_\w+)",\s*&per_process::cli_options->\1\)/g)) {
		assignments.push({
			field,
			variable,
			isFlag: false,
		});
	}

	const fields = optionsByField(nodeOptions);
	for (const { field, variable, isFlag } of assignments) {
		const names = [...fields.get(field) ?? []];
		const option = names.length === 1 ? options.get(names[0]) : undefined;
		if (!option) {
			throw new Error(`Node ${version}: ${variable} sets ${field}, which maps to ${names.length > 1 ? `several options (${names.join(', ')})` : 'no option'}`);
		}
		const [name] = names;
		const expected = isFlag ? 'boolean' : 'string';
		if (option.type !== expected || (option.type === 'string' && option.default !== '')) {
			throw new Error(`Node ${version}: ${variable} sets ${name} (${option.type}), expected a ${expected} defaulting to empty`);
		}
		option.environment = variable;
	}
};

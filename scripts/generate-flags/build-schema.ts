import getNode from 'get-node';
import type { OptionsSchema, OptionType, OptionSpec } from './schema-types.ts';
import { dumpOptions, type DumpedOption } from './dump-options/index.ts';
import { attachImplications, extractImplications, readNodeOptionsSource } from './implications.ts';

/**
 * enum OptionType, index → name. Identical across v18.20.8-v26.4.0
 * (https://github.com/nodejs/node/blob/v24.15.0/src/node_options.h#L395-L404),
 * and re-validated per version by the type fingerprint below.
 */
const optionTypeByIndex: OptionType[] = [
	'noOp',
	'v8Option',
	'boolean',
	'integer',
	'uinteger',
	'string',
	'hostPort',
	'stringList',
];

/**
 * Validates the int → OptionType mapping per version with options whose
 * types are known from source, covering all 8 enum members. A failure means
 * the enum order changed in src/node_options.h and optionTypeByIndex must be
 * re-derived.
 */
const validateFingerprint = (
	version: string,
	major: number,
	options: Map<string, DumpedOption>,
) => {
	const expectations: [string, OptionType][] = [
		['--conditions', 'stringList'],
		['--title', 'string'],
		['--addons', 'boolean'],
		['--inspect-port', 'hostPort'],
		// Became a readable integer option in 22.x; a pure V8 option before
		['--stack-trace-limit', major >= 22 ? 'integer' : 'v8Option'],
		['--max-http-header-size', 'uinteger'],
		// emit.ts special-cases this v8 option as a boolean flag
		['--abort-on-uncaught-exception', 'v8Option'],
		['--http-parser', 'noOp'],
	];
	for (const [name, expectedType] of expectations) {
		const entry = options.get(name);
		const actualType = entry && optionTypeByIndex[entry.type];
		if (actualType !== expectedType) {
			throw new Error(
				`Type fingerprint failed for Node ${version}: expected ${name} to be ${expectedType}, got ${actualType ?? '<missing>'}`,
			);
		}
	}
};

const buildOption = (name: string, dumped: DumpedOption): OptionSpec => {
	const type = optionTypeByIndex[dumped.type];
	if (type === undefined) {
		throw new Error(`Unknown option type ${dumped.type} for ${name}`);
	}
	const option: OptionSpec = { type };
	if (dumped.helpText) {
		option.helpText = dumped.helpText;
	}
	if (dumped.default !== undefined) {
		option.default = dumped.default;
	}
	return option;
};

/** Downloads a major's latest release, dumps its option schema, and validates it. */
export const buildSchema = async (major: number) => {
	const { path: binaryPath, version } = await getNode(String(major));
	console.log(`Node ${version}: dumping option schema`);

	// Dumping the binary (spawn) and fetching node_options.cc both depend only
	// on the resolved version, not each other, so overlap them
	const [dump, source] = await Promise.all([
		dumpOptions(binaryPath),
		readNodeOptionsSource(version),
	]);
	const dumpedOptions = new Map(dump.options);

	validateFingerprint(version, major, dumpedOptions);

	const options = new Map<string, OptionSpec>();
	for (const [name, dumped] of dumpedOptions) {
		options.set(name, buildOption(name, dumped));
	}

	/*
	 * The dump child necessarily runs with --expose-internals, so its
	 * parsed value reads true; the real default is false
	 * (https://github.com/nodejs/node/blob/v24.15.0/src/node_options.h#L150)
	 */
	options.get('--expose-internals')!.default = false;

	attachImplications(version, options, extractImplications(source));

	const sortedNames = [...options.keys()].sort();
	const sortedAliases = [...dump.aliases].sort(([a], [b]) => a.localeCompare(b));
	const schema: OptionsSchema = {
		options: Object.fromEntries(sortedNames.map(name => [name, options.get(name)!])),
		aliases: Object.fromEntries(sortedAliases),
	};
	return {
		version,
		schema,
		// Kept for the flag-table generator: line anchors into node_options.cc
		source,
	};
};

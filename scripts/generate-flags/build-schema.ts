import getNode from 'get-node';
import type { OptionsSchema, OptionType, OptionSpec } from './schema-types.ts';
import { dumpOptions, type DumpedOption } from './dump-options/index.ts';
import {
	attachEnvironment, attachImplications, extractImplications, readNodeSource, type Sources,
} from './implications.ts';

/**
 * enum OptionType, index → name. Identical across every release v18.0.0-v26.13.0
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
	options: Map<string, DumpedOption>,
) => {
	const expectations: [string, OptionType][] = [
		['--conditions', 'stringList'],
		['--title', 'string'],
		['--addons', 'boolean'],
		['--inspect-port', 'hostPort'],
		// An integer on every release since 18.0.0 (unlike --stack-trace-limit,
		// which became one partway through 22.x)
		['--secure-heap', 'integer'],
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

/**
 * Attaches what only the release's source (node_options.cc, node.cc) reveals: implications
 * and environment variables. Clears earlier values first, so it can re-apply
 * an improved parser to recorded releases (pnpm record-releases
 * --refresh-sources) without downloading their binaries again.
 */
export const applySource = (
	version: string,
	options: Map<string, OptionSpec>,
	sources: Sources,
) => {
	for (const option of options.values()) {
		delete option.implies;
		delete option.impliesNot;
		delete option.negationImplies;
		delete option.negationImpliesNot;
		delete option.environment;
	}
	attachImplications(version, options, extractImplications(sources.nodeOptions));
	attachEnvironment(version, options, sources);
};

/**
 * Downloads one exact release into `outputDirectory`, dumps its option
 * schema, and validates it. The caller owns the directory's lifetime: a
 * backfill touches every release, so binaries must not pile up in a cache.
 */
export const buildSchema = async (version: string, outputDirectory: string) => {
	const { path: binaryPath } = await getNode(version, {
		output: outputDirectory,
		progress: false,
	});

	// Dumping the binary (spawn) and fetching its sources all depend only
	// on the version, not each other, so overlap them
	const [dump, nodeOptions, node] = await Promise.all([
		dumpOptions(binaryPath),
		readNodeSource(version),
		readNodeSource(version, 'node.cc'),
	]);
	const dumpedOptions = new Map(dump.options);

	validateFingerprint(version, dumpedOptions);

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

	applySource(version, options, {
		nodeOptions,
		node,
	});

	const sortedNames = [...options.keys()].sort();
	const sortedAliases = [...dump.aliases].sort(([a], [b]) => a.localeCompare(b));
	const schema: OptionsSchema = {
		options: Object.fromEntries(sortedNames.map(name => [name, options.get(name)!])),
		aliases: Object.fromEntries(sortedAliases),
	};
	return schema;
};

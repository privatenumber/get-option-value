import fs from 'node:fs/promises';
import type {
	OptionsSchema, OptionSpec, Form,
} from './schema-types.ts';
import { resolveEffects, type Effect } from './resolve-effects.ts';
import { flagExportName } from './flag-name.ts';
import { compareVersions, majorOf, packedVersionLiteral } from './version.ts';

const VALUE = 0;
const SET_TRUE = 1;

/**
 * A non-dash, non-empty value used to distinguish space and equals forms.
 */
const PROBE_VALUE = '\u0001';

/** --abort-on-uncaught-exception is a v8 option Node reads back as a boolean. */
const abortOnUncaughtException = '--abort-on-uncaught-exception';

const isReadable = (name: string, option: OptionSpec) => (
	// Skip Node's internal bookkeeping options (e.g. "[has_eval_string]"),
	// which aren't real command-line flags
	!name.startsWith('[')
	&& (
		name === abortOnUncaughtException
		|| (option.type !== 'noOp' && option.type !== 'v8Option')
	)
);

const sameForm = (a: Form, b: Form) => (
	a[0] === b[0]
	&& a[1] === b[1]
	&& a[2] === b[2]
);

/**
 * The factory + typed default literal for each value shape. Booleans and
 * hostPorts carry a default; string/integer defaults are emitted only when
 * present (so the phantom type narrows to non-undefined).
 */
const factoryFor = (name: string, option: OptionSpec): { factory: string;
	head: string; } => {
	if (name === abortOnUncaughtException) {
		return {
			factory: 'booleanFlag',
			head: 'false, ',
		};
	}
	switch (option.type) {
		case 'boolean': {
			return {
				factory: 'booleanFlag',
				head: `${option.default === true}, `,
			};
		}
		case 'stringList': {
			return {
				factory: 'stringListFlag',
				head: '',
			};
		}
		case 'string': {
			return {
				factory: 'stringFlag',
				head: `${JSON.stringify(option.default)}, `,
			};
		}
		case 'integer': {
			return {
				factory: 'integerFlag',
				head: `${JSON.stringify(option.default)}, `,
			};
		}
		case 'uinteger': {
			return {
				factory: 'unsignedIntegerFlag',
				head: `${JSON.stringify(option.default)}, `,
			};
		}
		case 'hostPort': {
			return {
				factory: 'hostPortFlag',
				head: `${JSON.stringify(option.default)}, `,
			};
		}
		default: {
			throw new Error(`No factory for ${name} (${option.type})`);
		}
	}
};

/** One entry token's resolved effects across its four probed spellings. */
type EntryProbes = {
	bare: Map<string, Effect>;
	space: Map<string, Effect>;
	equals: Map<string, Effect>;
	negated?: Map<string, Effect>;
};

/**
 * Folds the bare and space spellings into one non-equals effect map. If both
 * set a flag but disagree, no single [match, mode] form can encode the split.
 */
const mergeNonEquals = (
	entry: string,
	bare: Map<string, Effect>,
	space: Map<string, Effect>,
	isEmittable: (flag: string) => boolean,
) => {
	const merged = new Map(bare);
	for (const [flag, effect] of space) {
		const prior = merged.get(flag);
		if (prior !== undefined && prior !== effect && isEmittable(flag)) {
			throw new Error(`Conflicting effects for ${flag}: "${entry}" resolves it to ${prior} bare but ${effect} with a value`);
		}
		merged.set(flag, effect);
	}
	return merged;
};

const formForEffect = (
	match: string,
	effect: Effect,
	equalsOnly = false,
): Form => {
	if (typeof effect === 'string') {
		return [match, equalsOnly ? 5 : 4, effect];
	}
	return [match, equalsOnly ? 3 : effect];
};

/**
 * Turns one entry token's probe results into `[flag, form]` pairs. Negated
 * spellings are stored literally (`["--no-addons", 2]`), so any effect is
 * directly representable; the only unrepresentable cases are hard-errored:
 * - an `=`-only spelling with a non-value effect (emitted as a value form),
 * - a spelling-dependent effect: the same flag resolved differently by the
 *   bare, space, and `=` spellings, which a single form would silently collapse.
 *
 * Only emittable flags are validated; effects on non-readable targets (bracketed
 * internals, pure V8/noOp options) are dropped downstream, so they can't cause a
 * false conflict.
 */
export const deriveEntryForms = (
	entry: string,
	probes: EntryProbes,
	isEmittable: (flag: string) => boolean,
): [flag: string, form: Form][] => {
	const {
		bare, space, equals, negated,
	} = probes;
	const forms: [string, Form][] = [];

	const nonEquals = mergeNonEquals(entry, bare, space, isEmittable);
	for (const [flag, effect] of nonEquals) {
		forms.push([flag, formForEffect(entry, effect)]);
	}

	for (const [flag, effect] of equals) {
		const prior = nonEquals.get(flag);
		if (prior !== undefined) {
			// The `=` spelling is already covered by the non-equals form; its
			// effect must agree, else that form silently drops the `=` behavior.
			if (prior !== effect && isEmittable(flag)) {
				throw new Error(`Conflicting effects for ${flag}: "${entry}" resolves it to ${prior} but "${entry}=" to ${effect}`);
			}
			continue;
		}
		// Numeric `=`-only effects are representable only as a value consumer;
		// a fixed alias value has its own `=`-only mode.
		if (isEmittable(flag) && typeof effect !== 'string' && effect !== VALUE) {
			throw new Error(`Unrepresentable form: "${entry}=" affects ${flag} with a non-value effect`);
		}
		forms.push([flag, formForEffect(entry, effect, true)]);
	}

	if (negated) {
		// Store the literal negated spelling so the scanner matches it directly.
		const negatedSpelling = `--no-${entry.slice(2)}`;
		for (const [flag, effect] of negated) {
			forms.push([flag, formForEffect(negatedSpelling, effect)]);
		}
	}

	return forms;
};

/**
 * Derives, for every readable option in one schema, the complete set
 * of command-line forms that affect it — by resolving probe tokens (every
 * option name and alias, in bare/space/=/negated spellings) and observing
 * which options each one affects and how.
 */
const deriveForms = (schema: OptionsSchema) => {
	const { options, aliases } = schema;

	const entryTokens = new Set<string>(Object.keys(options));
	for (const key of Object.keys(aliases)) {
		entryTokens.add(key.endsWith('=') ? key.slice(0, -1) : key.replace(/ <arg>$/, ''));
	}

	// A resolved target only becomes a flag if it's readable; effects on
	// non-readable targets (bracketed internals, pure V8/noOp options) are
	// dropped, so representability guards need not apply to them.
	const isEmittable = (flag: string) => (
		Object.hasOwn(options, flag) && isReadable(flag, options[flag])
	);

	const formsByFlag = new Map<string, Form[]>();
	const addForm = (flag: string, form: Form) => {
		if (!isEmittable(flag)) {
			return;
		}
		let forms = formsByFlag.get(flag);
		if (!forms) {
			forms = [];
			formsByFlag.set(flag, forms);
		}
		if (!forms.some(existing => sameForm(existing, form))) {
			forms.push(form);
		}
	};

	const probe = (args: string[]) => resolveEffects(args, schema);

	for (const entry of entryTokens) {
		const pairs = deriveEntryForms(
			entry,
			{
				bare: probe([entry]),
				space: probe([entry, PROBE_VALUE]),
				equals: probe([`${entry}=${PROBE_VALUE}`]),
				negated: entry.startsWith('--') ? probe([`--no-${entry.slice(2)}`]) : undefined,
			},
			isEmittable,
		);
		for (const [flag, form] of pairs) {
			addForm(flag, form);
		}
	}

	// v8 option read back as a boolean; the resolver otherwise ignores V8 options
	addForm(abortOnUncaughtException, [abortOnUncaughtException, SET_TRUE]);

	return formsByFlag;
};

type EmitInput = {

	/** Every recorded release, semver-ascending; parallel to `schemas`. */
	releases: string[];
	schemas: OptionsSchema[];

	/** Reads src/node_options.cc at a release, for source links. */
	readSource: (version: string) => Promise<string>;
};

const escapeRegExp = (value: string) => value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

/**
 * Line number of an option's `AddOption("--name"` registration in
 * node_options.cc (whitespace-tolerant for clang-format wraps), for a source
 * link in the generated table. Returns undefined if the pattern moved.
 */
const findOptionLine = (source: string, optionName: string) => {
	const match = new RegExp(String.raw`AddOption\(\s*"${escapeRegExp(optionName)}"`).exec(source);
	if (!match) {
		return undefined;
	}
	return source.slice(0, match.index).split('\n').length;
};

/**
 * A flag's shape on one release:
 * - a readable factory call,
 * - `'undefined'`: the option exists but is a pure V8 option here (reads
 *   undefined) — a real difference that must be branched,
 * - `'absent'`: the option doesn't exist here, so Node refuses to boot with
 *   it and no process can observe its value. We read the neighboring
 *   segment's default instead, so pure existence drift never forces a branch.
 */
type ReadableFlag = {
	factory: string;
	head: string;
	forms: Form[];
};
type ReleaseFlag = ReadableFlag | 'undefined' | 'absent';

/** Options tools read to understand their own invocation — must be a single
 * segment (no version branch), else a tool would see drift across releases. */
const readSet = new Set([
	'--conditions',
	'--addons',
	'--import',
	'--require',
	'--experimental-loader',
	'--inspect',
	'--inspect-brk',
	'--inspect-port',
]);

/**
 * Flags that read their newest value shape below a release instead of
 * branching into a union type: for read-set flags (which must not drift), and
 * for published exports whose type a newly recorded drift would widen (a
 * breaking change; see assertNoWidening). Each is inexact only on the listed
 * EOL releases, reading `["x"]` where Node has `"x"`; the oracle test skips
 * exactly these.
 */
const inexactBelow: Record<string, string> = {
	// Single string until loader chaining (https://github.com/nodejs/node/pull/42623)
	'--experimental-loader': '18.6.0',
	// Single strings in the 20.0.0-20.6.x experimental permission model
	'--allow-fs-read': '20.7.0',
	'--allow-fs-write': '20.7.0',
};

const sortForms = (forms: Form[]) => (
	forms.slice().sort((a, b) => {
		// Include the emitted string terminator so prefix ordering is stable.
		const matchOrder = `${a[0]}"`.localeCompare(`${b[0]}"`);
		const modeOrder = a[1] - b[1];
		if (matchOrder || modeOrder) {
			return matchOrder || modeOrder;
		}
		const aFixed = a[2] ?? '';
		const bFixed = b[2] ?? '';
		if (aFixed === bFixed) {
			return 0;
		}
		return aFixed < bFixed ? -1 : 1;
	})
);

const flagExpr = (flag: ReleaseFlag) => (
	typeof flag === 'object'
		? `${flag.factory}(${flag.head}${JSON.stringify(flag.forms)})`
		: 'undefinedFlag()'
);

/**
 * Whether the segment led by `hiFlag` (a higher release) also resolves
 * `flag` exactly:
 * - an absent release folds in (see ReleaseFlag),
 * - a `'undefined'` (V8 option) release only folds into another `'undefined'`;
 * - a readable release needs the same shape/default and a superset of forms
 *   (the extra spellings are rejected by that release, so can't false-match).
 */
const coveredBy = (flag: ReleaseFlag, hiFlag: ReleaseFlag) => {
	if (flag === 'absent') {
		return true;
	}
	if (flag === 'undefined' || typeof hiFlag !== 'object') {
		return flag === hiFlag;
	}
	if (flag.factory !== hiFlag.factory || flag.head !== hiFlag.head) {
		return false;
	}
	return flag.forms.every(form => hiFlag.forms.some(hiForm => sameForm(hiForm, form)));
};

/**
 * Collapses per-release flags into the fewest version segments (highest
 * release first). Each segment's leading flag covers every release down to
 * `from`. A trailing run of absent releases folds into the segment above it.
 */
const computeSegments = (releases: string[], releaseFlags: ReleaseFlag[]) => {
	const segments: { from: string;
		flag: ReleaseFlag; }[] = [];
	// Absent releases can't lead a segment: a removed option's newest
	// releases fold into the top segment, led by its last existing release.
	// Below that, `lo` stops only at an uncovered (so non-absent) release.
	let hi = releases.length - 1;
	while (hi > 0 && releaseFlags[hi] === 'absent') {
		hi -= 1;
	}
	while (hi >= 0) {
		const hiFlag = releaseFlags[hi];
		let lo = hi;
		while (lo - 1 >= 0 && coveredBy(releaseFlags[lo - 1], hiFlag)) {
			lo -= 1;
		}
		segments.push({
			from: releases[lo],
			flag: hiFlag,
		});
		hi = lo - 1;
	}
	return segments;
};

const docsPath = new URL('../../docs/flags.json', import.meta.url);

/**
 * An export's type is the union of its segments' factories, so a new factory
 * on an existing export widens its published type: a breaking change. Compared
 * against the committed docs/flags.json, so a regeneration (such as the
 * scheduled release sync) fails instead of shipping it. Resolve by adding an
 * inexactBelow entry, or accept it in a major release by deleting the entry's
 * `factories` from docs/flags.json before regenerating.
 */
const assertNoWidening = async (factoriesByExport: Map<string, string[]>) => {
	const previous = JSON.parse(await fs.readFile(docsPath, 'utf8')) as {
		flags: { export: string;
			factories?: string[]; }[];
	};
	const widened: string[] = [];
	for (const { export: exportName, factories } of previous.flags) {
		const next = factoriesByExport.get(exportName);
		if (factories && next?.some(factory => !factories.includes(factory))) {
			widened.push(`${exportName}: ${factories.join(' | ')} -> ${next.join(' | ')}`);
		}
	}
	if (widened.length > 0) {
		throw new Error(`Generation would widen published flag types:\n${widened.join('\n')}`);
	}
};

/**
 * Derives forms once per distinct schema: consecutive releases often share an
 * identical schema, so this bounds derivation by the number of change points
 * rather than the number of releases.
 */
const deriveFormsPerRelease = (schemas: OptionsSchema[]) => {
	const cache = new Map<string, Map<string, Form[]>>();
	return schemas.map((schema) => {
		const key = JSON.stringify(schema);
		let forms = cache.get(key);
		if (!forms) {
			forms = deriveForms(schema);
			cache.set(key, forms);
		}
		return forms;
	});
};

/**
 * Emits src/flags.ts: one tree-shakable Flag per option name that any
 * recorded release registers as a readable option, so an export never
 * disappears while a supported release still accepts its name. A name that
 * a later release turned into an alias reads through its target there (and
 * is re-exported as the same Flag when the two resolve identically). A flag
 * that resolves the same way on every release is a plain factory call; one
 * that drifts becomes a `forVersion`-branched chain exact on each release.
 */
export const emit = async ({ releases, schemas, readSource }: EmitInput) => {
	const formsPerRelease = deriveFormsPerRelease(schemas);
	const newestIndex = schemas.length - 1;

	// Readable options are exactly the keys deriveForms emitted forms for
	const names = [...new Set(formsPerRelease.flatMap(forms => [...forms.keys()]))]
		.sort((a, b) => a.localeCompare(b));

	const releaseFlagFor = (name: string, index: number): ReleaseFlag => {
		const floor = inexactBelow[name];
		if (floor && compareVersions(releases[index], floor) < 0) {
			return 'absent';
		}
		const { options, aliases } = schemas[index];
		const option = options[name];
		if (!option) {
			// A renamed option keeps its old name as a single-target alias
			const target = aliases[name];
			return target?.length === 1 && target[0] !== name && options[target[0]]
				? releaseFlagFor(target[0], index)
				: 'absent';
		}
		const forms = formsPerRelease[index].get(name);
		if (!forms) {
			// present but non-readable (pure V8 option) — reads undefined
			return 'undefined';
		}
		const { factory, head } = factoryFor(name, option);
		return {
			factory,
			head,
			forms: sortForms(forms),
		};
	};

	const usedFactories = new Set<string>();
	let usesVersion = false;
	const seenExports = new Map<string, string>();
	const exportByExpression = new Map<string, string>();
	const factoriesByExport = new Map<string, string[]>();
	const testReleases = new Set<string>();
	const lastMajor = new Map<number, string>();
	for (const release of releases) {
		lastMajor.set(majorOf(release), release);
	}
	for (const release of lastMajor.values()) {
		testReleases.add(release);
	}

	const definitions = names.map((name) => {
		const exportName = flagExportName(name);
		const clash = seenExports.get(exportName);
		if (clash) {
			throw new Error(`Export name collision: ${clash} and ${name} both map to ${exportName}`);
		}
		seenExports.set(exportName, name);

		const releaseFlags = releases.map((_release, index) => releaseFlagFor(name, index));
		const segments = computeSegments(releases, releaseFlags);
		const factories = new Set<string>();
		for (const { from, flag } of segments) {
			factories.add(typeof flag === 'object' ? flag.factory : 'undefinedFlag');
			// Every segment gets a real-binary oracle run at its first release
			testReleases.add(from);
		}

		for (const factory of factories) {
			usedFactories.add(factory);
		}
		factoriesByExport.set(exportName, [...factories].sort());

		if (readSet.has(name) && segments.length > 1) {
			throw new Error(`Read-set flag ${name} drifts across releases (${segments.length} segments: ${segments.map(segment => segment.from).join(', ')})`);
		}

		let expression = `/* @__PURE__ */ ${flagExpr(segments.at(-1)!.flag)}`;
		if (segments.length > 1) {
			usesVersion = true;
			// Nest from the lowest segment (the fallback) outward, highest
			// threshold first: forVersion(hi, a, forVersion(lo, b, c)). The pure
			// call form is what lets a bundler drop the whole thing when unused.
			for (let index = segments.length - 2; index >= 0; index -= 1) {
				const { from, flag } = segments[index];
				expression = `/* @__PURE__ */ forVersion(${packedVersionLiteral(from)}, /* @__PURE__ */ ${flagExpr(flag)}, ${expression})`;
			}
		}
		return {
			name,
			exportName,
			expression,
		};
	});

	// Options of the newest release own their expression; a former name that
	// resolves identically everywhere becomes a re-export of the same Flag
	const newestOptions = schemas[newestIndex].options;
	const sortedDefinitions = definitions.slice().sort((a, b) => (
		Number(!Object.hasOwn(newestOptions, a.name)) - Number(!Object.hasOwn(newestOptions, b.name))
	));
	const declarations = new Map<string, string>();
	const reexports = new Map<string, string>();
	for (const { exportName, expression } of sortedDefinitions) {
		const original = exportByExpression.get(expression);
		if (original) {
			reexports.set(exportName, `export const ${exportName} = ${original};`);
		} else {
			exportByExpression.set(expression, exportName);
			declarations.set(exportName, `export const ${exportName} = ${expression};`);
		}
	}
	// Re-exports reference their target, so they come after every declaration
	const exports = [
		...definitions.flatMap(({ exportName }) => declarations.get(exportName) ?? []),
		...definitions.flatMap(({ exportName }) => reexports.get(exportName) ?? []),
	];

	const imports = [...usedFactories].sort();
	const versionImport = usesVersion ? "import { forVersion } from './flag/for-version.ts';\n" : '';

	const output = `/**
 * Generated by scripts/generate-flags — do not edit.
 *
 * One Flag per readable Node CLI option across Node ${releases[0]}-${releases.at(-1)}
 * (${releases.length} releases). Each is tree-shakable: import only the flags you
 * read, and pass it to getOptionValue from "get-option-value".
 *
 * Most flags resolve identically on every release; the ones whose shape or
 * default changed branch on the exact release (forVersion) to stay exact.
 * Forms are [match, mode] — see src/types.ts — derived by resolving every
 * option, alias, and implication.
 */
/* eslint-disable */
${versionImport}import {
${imports.map(name => `\t${name},`).join('\n')}
} from './flag/factories.ts';

${exports.join('\n')}
`;

	await assertNoWidening(factoriesByExport);

	const outputPath = new URL('../../src/flags.ts', import.meta.url);
	await fs.writeFile(outputPath, output);
	console.log(`Wrote ${outputPath.pathname} (${exports.length} flags, ${usesVersion ? 'some version-conditional' : 'all stable'})`);

	// Flag metadata: the source of truth for the generated README table (via
	// mdeval) and the oracle test's option-name -> export map. Each flag is
	// documented from the newest release that registers it as an option.
	const lastOptionIndex = (name: string) => {
		for (let index = newestIndex; index >= 0; index -= 1) {
			if (Object.hasOwn(schemas[index].options, name)) {
				return index;
			}
		}
		throw new Error(`${name} is not an option in any release`);
	};
	const documentedIndexes = new Map(names.map(name => [name, lastOptionIndex(name)]));
	const sourceReleases = new Set([...documentedIndexes.values()].map(index => releases[index]));
	const sources = new Map(await Promise.all(
		[...sourceReleases].map(async release => [release, await readSource(release)] as const),
	));

	const missing: string[] = [];
	const flags = [...seenExports]
		.map(([exportName, name]) => {
			const release = releases[documentedIndexes.get(name)!];
			const line = findOptionLine(sources.get(release)!, name);
			if (line === undefined) {
				missing.push(name);
			}
			const option = schemas[documentedIndexes.get(name)!].options[name];
			// Node's help printer shows default-true booleans under their `--no-`
			// spelling (and phrases the description for it), so the table should
			// display that; `option` stays canonical for the oracle map.
			const display = option.type === 'boolean' && option.default === true
				? `--no-${name.slice(2)}`
				: undefined;
			// The source link falls back to the file (no #L anchor) if the
			// AddOption line can't be located, so a source reformat degrades the
			// link instead of breaking generation — the README consumes it as-is.
			return {
				export: exportName,
				option: name,
				...(display && { display }),
				factories: factoriesByExport.get(exportName)!,
				...(inexactBelow[name] && { inexactBelow: inexactBelow[name] }),
				description: option.helpText ?? '',
				url: `https://github.com/nodejs/node/blob/v${release}/src/node_options.cc${line ? `#L${line}` : ''}`,
			};
		})
		.sort((a, b) => a.option.localeCompare(b.option));

	if (missing.length > 0) {
		console.warn(`No AddOption line found in node_options.cc for: ${missing.join(', ')}`);
	}

	await fs.mkdir(new URL('../../docs/', import.meta.url), { recursive: true });
	await fs.writeFile(docsPath, `${JSON.stringify({
		version: releases[newestIndex],
		// Releases the oracle test runs on real binaries: the newest of each
		// major, plus the first release of every flag's version segment
		testReleases: [...testReleases].sort(compareVersions),
		flags,
	}, null, '\t')}\n`);
	console.log(`Wrote ${docsPath.pathname} (${flags.length} flags, ${testReleases.size} test releases)`);
};

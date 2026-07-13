import fs from 'node:fs/promises';
import type {
	OptionsSchema, OptionSpec, Form,
} from './schema-types.ts';
import { resolveEffects, type Effect } from './resolve-effects.ts';
import { flagExportName } from './flag-name.ts';

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
 * Derives, for every readable option in the newest schema, the complete set
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
	versions: string[];
	schemas: OptionsSchema[];
	sources: string[];
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
 * A flag's shape on one major:
 * - a readable factory call,
 * - `'undefined'`: the option exists but is a pure V8 option here (reads
 *   undefined) — a real difference that must be branched,
 * - `'absent'`: the option doesn't exist here. We accept reading the newest
 *   default on such majors (pure existence drift isn't branched), so it never
 *   forces a segment.
 */
type ReadableFlag = {
	factory: string;
	head: string;
	forms: Form[];
};
type MajorFlag = ReadableFlag | 'undefined' | 'absent';

/** Options tools read to understand their own invocation — must be a single
 * segment (no version branch), else a tool would see drift on some major. */
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

const flagExpr = (flag: MajorFlag) => (
	typeof flag === 'object'
		? `${flag.factory}(${flag.head}${JSON.stringify(flag.forms)})`
		: 'undefinedFlag()'
);

/**
 * Whether the segment led by `hiFlag` (a higher major) also resolves `mFlag`
 * exactly:
 * - an absent major folds in — we accept reading the newest default there
 *   (pure existence drift stays branch-free);
 * - a `'undefined'` (V8 option) major only folds into another `'undefined'`;
 * - a readable major needs the same shape/default and a superset of forms (the
 *   extra spellings are inert on the lower major, so can't false-match).
 */
const coveredBy = (mFlag: MajorFlag, hiFlag: MajorFlag) => {
	if (mFlag === 'absent') {
		return true;
	}
	if (mFlag === 'undefined' || typeof hiFlag !== 'object') {
		return mFlag === hiFlag;
	}
	if (mFlag.factory !== hiFlag.factory || mFlag.head !== hiFlag.head) {
		return false;
	}
	return mFlag.forms.every(form => hiFlag.forms.some(hiForm => sameForm(hiForm, form)));
};

/**
 * Collapses per-major flags into the fewest version segments (highest major
 * first). Each segment's higher-major flag covers every major down to `from`.
 */
const computeSegments = (majors: number[], majorFlags: MajorFlag[]) => {
	const segments: { from: number;
		flag: MajorFlag; }[] = [];
	let hi = majors.length - 1;
	while (hi >= 0) {
		const hiFlag = majorFlags[hi];
		let lo = hi;
		while (lo - 1 >= 0 && coveredBy(majorFlags[lo - 1], hiFlag)) {
			lo -= 1;
		}
		segments.push({
			from: majors[lo],
			flag: hiFlag,
		});
		hi = lo - 1;
	}
	return segments;
};

/**
 * Emits src/flags.ts: one tree-shakable Flag per readable option in the newest
 * major. A flag that resolves the same way on every supported major is a plain
 * factory call; one that drifts (type/default/removed spelling, or doesn't
 * exist yet) becomes a `nodeMajor`-branched chain that's exact on each major.
 */
export const emit = async ({ versions, schemas, sources }: EmitInput) => {
	const majors = versions.map(version => Number(version.split('.')[0]));
	const perMajorForms = schemas.map(deriveForms);
	const newestIndex = schemas.length - 1;

	const usedFactories = new Set<string>();
	let usesVersion = false;
	const seenExports = new Map<string, string>();

	const exports = [...perMajorForms[newestIndex].keys()]
		.sort((a, b) => a.localeCompare(b))
		.map((name) => {
			const exportName = flagExportName(name);
			const clash = seenExports.get(exportName);
			if (clash) {
				throw new Error(`Export name collision: ${clash} and ${name} both map to ${exportName}`);
			}
			seenExports.set(exportName, name);

			const majorFlags: MajorFlag[] = schemas.map((schema, index) => {
				const option = schema.options[name];
				if (!option) {
					return 'absent';
				}
				const forms = perMajorForms[index].get(name);
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
			});

			const segments = computeSegments(majors, majorFlags);
			for (const { flag } of segments) {
				usedFactories.add(typeof flag === 'object' ? flag.factory : 'undefinedFlag');
			}

			if (readSet.has(name) && segments.length > 1) {
				throw new Error(`Read-set flag ${name} drifts across majors (${segments.length} segments); a newest snapshot would be inexact`);
			}

			if (segments.length === 1) {
				return `export const ${exportName} = /* @__PURE__ */ ${flagExpr(segments[0].flag)};`;
			}

			usesVersion = true;
			// Nest from the lowest segment (the fallback) outward, highest
			// threshold first: forMajor(hi, a, forMajor(lo, b, c)). The pure
			// call form is what lets a bundler drop the whole thing when unused.
			let expr = `/* @__PURE__ */ ${flagExpr(segments.at(-1)!.flag)}`;
			for (let index = segments.length - 2; index >= 0; index -= 1) {
				const { from, flag } = segments[index];
				expr = `/* @__PURE__ */ forMajor(${from}, /* @__PURE__ */ ${flagExpr(flag)}, ${expr})`;
			}
			return `export const ${exportName} = ${expr};`;
		});

	const imports = [...usedFactories].sort();
	const versionImport = usesVersion ? "import { forMajor } from './flag/for-major.ts';\n" : '';

	const output = `/**
 * Generated by scripts/generate-flags — do not edit.
 *
 * One Flag per readable Node CLI option (majors ${majors[0]}-${majors.at(-1)}). Each is
 * tree-shakable: import only the flags you read, and pass it to getOptionValue
 * from "get-option-value".
 *
 * Most flags are a newest-major snapshot; the few that changed shape/default
 * across majors (or don't exist on older ones) branch on nodeMajor to stay
 * exact. Forms are [match, mode] — see src/types.ts — derived by resolving
 * every option, alias, and implication.
 */
/* eslint-disable */
${versionImport}import {
${imports.map(name => `\t${name},`).join('\n')}
} from './flag/factories.ts';

${exports.join('\n')}
`;

	const outputPath = new URL('../../src/flags.ts', import.meta.url);
	await fs.writeFile(outputPath, output);
	console.log(`Wrote ${outputPath.pathname} (${exports.length} flags, ${usesVersion ? 'some version-conditional' : 'all stable'})`);

	// Flag metadata: the source of truth for the generated README table (via
	// mdeval) and the oracle test's option-name -> export map.
	const version = versions[newestIndex];
	const newestSource = sources[newestIndex];
	const newestOptions = schemas[newestIndex].options;
	// The source link falls back to the file (no #L anchor) if the AddOption
	// line can't be located, so a source reformat degrades the link instead of
	// breaking generation — the README consumes this URL as-is.
	const sourceUrl = (line: number | undefined) => (
		`https://github.com/nodejs/node/blob/v${version}/src/node_options.cc${line ? `#L${line}` : ''}`
	);

	const missing: string[] = [];
	const flags = [...seenExports]
		.map(([exportName, name]) => {
			const line = findOptionLine(newestSource, name);
			if (line === undefined) {
				missing.push(name);
			}
			const option = newestOptions[name];
			// Node's help printer shows default-true booleans under their `--no-`
			// spelling (and phrases the description for it), so the table should
			// display that; `option` stays canonical for the oracle map.
			const display = option?.type === 'boolean' && option.default === true
				? `--no-${name.slice(2)}`
				: undefined;
			return {
				export: exportName,
				option: name,
				...(display && { display }),
				description: option?.helpText ?? '',
				url: sourceUrl(line),
			};
		})
		.sort((a, b) => a.option.localeCompare(b.option));

	if (missing.length > 0) {
		console.warn(`No AddOption line found in node_options.cc for: ${missing.join(', ')}`);
	}

	const docsPath = new URL('../../docs/flags.json', import.meta.url);
	await fs.mkdir(new URL('../../docs/', import.meta.url), { recursive: true });
	await fs.writeFile(docsPath, `${JSON.stringify({
		version,
		flags,
	}, null, '\t')}\n`);
	console.log(`Wrote ${docsPath.pathname} (${flags.length} flags)`);
};

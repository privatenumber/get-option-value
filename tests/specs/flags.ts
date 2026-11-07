import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test, expect } from 'manten';
import getNode from 'get-node';
import spawn from 'nano-spawn';
import flagsMeta from '../../docs/flags.json' with { type: 'json' };

// Derived from the generated flag metadata: option name -> flag export name.
const flagMap = JSON.stringify(
	Object.fromEntries(flagsMeta.flags.map(flag => [flag.option, flag.export])),
);

const inexactBelow = new Map(
	flagsMeta.flags.flatMap(flag => ('inexactBelow' in flag ? [[flag.option, flag.inexactBelow]] : [])),
);

const isOlder = (version: string, than: string | undefined) => {
	if (!than) {
		return false;
	}
	const a = version.split('.').map(Number);
	const b = than.split('.').map(Number);
	return ((a[0] - b[0]) || (a[1] - b[1]) || (a[2] - b[2])) < 0;
};

const fixturesDirectory = fileURLToPath(new URL('../fixtures', import.meta.url));
const harnessPath = path.join(fixturesDirectory, 'read-flags.mjs');

type Comparison = Record<string, {
	ours: unknown;
	oracle: unknown;
	exists: boolean;
}>;

/**
 * Spawns the child harness, which prints getOptionValue vs the internal
 * options oracle for every generated flag.
 */
const readFlags = async (
	nodePath: string,
	flags: string[],
	environment = '',
	requireComplete = false,
): Promise<Comparison> => {
	const { stdout } = await spawn(
		nodePath,
		[...flags, '--expose-internals', harnessPath],
		{
			cwd: fixturesDirectory,
			env: {
				NODE_OPTIONS: environment,
				FLAG_MAP: flagMap,
				REQUIRE_COMPLETE_FLAG_MAP: requireComplete ? '1' : '',
			},
		},
	);
	return JSON.parse(stdout) as Comparison;
};

/**
 * Asserts every flag resolves exactly to the binding. Options that don't
 * exist on the running release read a neighboring release's default where
 * the binding has no value — an unobservable gap (that release can't boot
 * with the option), so those are skipped. Everything else must match.
 */
const assertParity = (
	comparison: Comparison,
	version: string,
	expectedCount = flagsMeta.flags.length,
) => {
	// Exact: the harness must return a record for every generated flag, so a
	// dropped or renamed export surfaces here instead of being silently skipped.
	expect(Object.keys(comparison).length).toBe(expectedCount);
	const ours: Record<string, unknown> = {};
	const oracle: Record<string, unknown> = {};
	for (const [name, record] of Object.entries(comparison)) {
		if (
			(
				!record.exists
				&& record.oracle === '<undefined>'
				&& record.ours !== '<undefined>'
			)
			// A documented generator exception: reads its newest shape here
			|| isOlder(version, inexactBelow.get(name))
		) {
			continue;
		}
		ours[name] = record.ours;
		oracle[name] = record.oracle;
	}
	expect(ours).toStrictEqual(oracle);
};

test('parity does not skip an existing unreadable option', () => {
	expect(() => assertParity({
		'--stack-trace-limit': {
			ours: 10,
			oracle: '<undefined>',
			exists: true,
		},
	}, flagsMeta.version, 1)).toThrow();
});

// Non-blocking flags only (--inspect-brk / --inspect-wait pause for a debugger)
const setFlags = [
	'-C',
	'a',
	'--conditions=b',
	'--require',
	'./noop.cjs',
	'--inspect=127.0.0.1:0',
];
const importFlags = ['--import', './noop.mjs'];

// Node exits with "bad option" on --import before it existed (18.18.0)
const supportsImport = async (nodePath: string) => {
	const { stdout } = await spawn(nodePath, ['-p', 'process.allowedNodeEnvironmentFlags.has("--import")']);
	return stdout === 'true';
};

// Pinned by the generator: the newest release of each major plus the first
// release of every flag's version segment, so each emitted branch runs
// against a real binary and a new Node release can't change the test matrix.
for (const version of flagsMeta.testReleases) {
	describe(`Node ${version}: full oracle parity`, async () => {
		const { path: nodePath } = await getNode(version);

		test('every flag matches the binding (defaults)', async () => {
			assertParity(await readFlags(nodePath, [], '', true), version);
		});

		test('every flag matches under set flags + NODE_OPTIONS', async () => {
			const hasImport = await supportsImport(nodePath);
			const comparison = await readFlags(
				nodePath,
				hasImport ? [...setFlags, ...importFlags] : setFlags,
				'--conditions=env -C envc',
				true,
			);
			expect(comparison['--conditions'].ours).toStrictEqual(['env', 'envc', 'a', 'b']);
			expect(comparison['--require'].ours).toStrictEqual(['./noop.cjs']);
			expect(comparison['--import'].ours).toStrictEqual(hasImport ? ['./noop.mjs'] : []);
			expect(comparison['--inspect'].ours).toBe(true);
			assertParity(comparison, version);
		});
	});
}

describe('flag metadata', () => {
	type FlagMeta = {
		export: string;
		option: string;
		description: string;
		url: string;
		display?: string;
	};
	const byOption: Record<string, FlagMeta> = Object.fromEntries(
		(flagsMeta.flags as FlagMeta[]).map(flag => [flag.option, flag]),
	);

	// Node's help printer shows default-true booleans under their `--no-` form,
	// and phrases the description for that spelling ("disable loading native
	// addons"), so the table must document the negated spelling.
	test('default-true booleans are documented under their --no- spelling', () => {
		expect(byOption['--addons'].display).toBe('--no-addons');
		expect(byOption['--deprecation'].display).toBe('--no-deprecation');
	});

	test('default-false booleans and value options have no display override', () => {
		expect(byOption['--allow-ffi'].display).toBeUndefined();
		expect(byOption['--conditions'].display).toBeUndefined();
	});
});

describe('oracle harness', async () => {
	const { path: nodePath } = await getNode(flagsMeta.version);
	const expectHarnessFailure = async (
		map: Record<string, string>,
		expected: RegExp,
		requireComplete = false,
	) => {
		let error: { stderr?: string } | undefined;
		try {
			await spawn(nodePath, ['--expose-internals', harnessPath], {
				cwd: fixturesDirectory,
				env: {
					NODE_OPTIONS: '',
					FLAG_MAP: JSON.stringify(map),
					REQUIRE_COMPLETE_FLAG_MAP: requireComplete ? '1' : '',
				},
			});
		} catch (error_) {
			error = error_ as { stderr?: string };
		}
		expect(error).toBeDefined();
		expect(error?.stderr).toMatch(expected);
	};

	test('preserves a fixed value injected by an alias', async () => {
		const comparison = await readFlags(nodePath, [
			'--trace-events-enabled',
			'--trace-event-file-pattern=/dev/null',
		]);
		expect(comparison['--trace-event-categories'].ours).toBe('v8,node,node.async_hooks');
		expect(comparison['--trace-event-categories'].ours).toBe(
			comparison['--trace-event-categories'].oracle,
		);
	});

	// A mapping to a non-existent export must fail loudly, not be skipped —
	// otherwise a renamed/dropped export would pass the parity sweep unnoticed.
	test('fails loudly on a flag export that does not exist', async () => {
		await expectHarnessFailure(
			{ '--conditions': 'doesNotExistFlag' },
			/doesNotExistFlag/,
		);
	});

	test('fails when generated metadata omits a readable Node option', async () => {
		const incompleteMap = Object.fromEntries(
			flagsMeta.flags
				.filter(flag => flag.option !== '--conditions')
				.map(flag => [flag.option, flag.export]),
		);
		await expectHarnessFailure(incompleteMap, /--conditions/, true);
	});
});

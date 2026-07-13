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
 * Asserts every flag resolves exactly to the binding. On older majors, options
 * newer than the runtime read our newest-major default where the binding has
 * no value — a documented, unobservable gap (that major can't boot with the
 * option), so those are skipped. Everything else — stable flags and
 * version-conditional flags on the majors where the option exists — must match.
 */
const assertParity = (
	comparison: Comparison,
	allowNewer: boolean,
	expectedCount = flagsMeta.flags.length,
) => {
	// Exact: the harness must return a record for every generated flag, so a
	// dropped or renamed export surfaces here instead of being silently skipped.
	expect(Object.keys(comparison).length).toBe(expectedCount);
	const ours: Record<string, unknown> = {};
	const oracle: Record<string, unknown> = {};
	for (const [name, record] of Object.entries(comparison)) {
		if (
			allowNewer
			&& !record.exists
			&& record.oracle === '<undefined>'
			&& record.ours !== '<undefined>'
		) {
			continue;
		}
		ours[name] = record.ours;
		oracle[name] = record.oracle;
	}
	expect(ours).toStrictEqual(oracle);
};

test('older-major parity does not skip an existing unreadable option', () => {
	expect(() => assertParity({
		'--stack-trace-limit': {
			ours: 10,
			oracle: '<undefined>',
			exists: true,
		},
	}, true, 1)).toThrow();
});

// Non-blocking flags only (--inspect-brk / --inspect-wait pause for a debugger)
const setFlags = [
	'-C',
	'a',
	'--conditions=b',
	'--require',
	'./noop.cjs',
	'--import',
	'./noop.mjs',
	'--inspect=127.0.0.1:0',
];

const majors = ['18', '19', '20', '21', '22', '23', '24', '25', '26'];

for (const major of majors) {
	describe(`Node ${major}: full oracle parity`, async () => {
		const { path: nodePath } = await getNode(major);
		// The newest major snapshots every option, so nothing is "newer" there
		const allowNewer = major !== majors.at(-1);

		test('every flag matches the binding (defaults)', async () => {
			assertParity(await readFlags(nodePath, [], '', !allowNewer), allowNewer);
		});

		test('every flag matches under set flags + NODE_OPTIONS', async () => {
			const comparison = await readFlags(
				nodePath,
				setFlags,
				'--conditions=env -C envc',
				!allowNewer,
			);
			expect(comparison['--conditions'].ours).toStrictEqual(['env', 'envc', 'a', 'b']);
			expect(comparison['--require'].ours).toStrictEqual(['./noop.cjs']);
			expect(comparison['--import'].ours).toStrictEqual(['./noop.mjs']);
			expect(comparison['--inspect'].ours).toBe(true);
			assertParity(comparison, allowNewer);
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
	const { path: nodePath } = await getNode(majors.at(-1)!);
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

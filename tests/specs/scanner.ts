import { describe, test, expect } from 'manten';
import { getOptionValue } from '../../src/index.ts';
import {
	booleanFlag, stringFlag, stringListFlag, integerFlag, unsignedIntegerFlag, hostPortFlag,
} from '../../src/flag/factories.ts';
import { nullProto } from '../utils.ts';

const withProcessState = (
	nodeOptions: string | undefined,
	execArgv: string[],
	run: () => void,
) => {
	const originalEnv = process.env.NODE_OPTIONS;
	const originalArgv = process.execArgv;
	if (nodeOptions === undefined) {
		delete process.env.NODE_OPTIONS;
	} else {
		process.env.NODE_OPTIONS = nodeOptions;
	}
	process.execArgv = execArgv;
	try {
		run();
	} finally {
		if (originalEnv === undefined) {
			delete process.env.NODE_OPTIONS;
		} else {
			process.env.NODE_OPTIONS = originalEnv;
		}
		process.execArgv = originalArgv;
	}
};

const addons = booleanFlag(true, [['--addons', 1], ['--no-addons', 2]]);
const conditions = stringListFlag([['--conditions', 0], ['-C', 0]]);
const title = stringFlag(undefined, [['--title', 0]]);
const stackTraceLimit = integerFlag(undefined, [['--stack-trace-limit', 0]]);
const maxHeader = unsignedIntegerFlag(16_384, [['--max-http-header-size', 0]]);
const inspectPort = hostPortFlag(
	{
		host: '127.0.0.1',
		port: 9229,
	},
	[['--inspect-port', 0], ['--inspect', 3]],
);

describe('scanner', () => {
	describe('boolean', () => {
		test('default when unset', () => {
			withProcessState(undefined, [], () => {
				expect(getOptionValue(addons)).toBe(true);
			});
		});

		test('--no- negation, and last write wins across env then cli', () => {
			withProcessState('--no-addons', ['--addons'], () => {
				expect(getOptionValue(addons)).toBe(true);
			});
			withProcessState('--addons', ['--no-addons'], () => {
				expect(getOptionValue(addons)).toBe(false);
			});
		});

		test('underscore normalization', () => {
			withProcessState(undefined, ['--no_addons'], () => {
				expect(getOptionValue(addons)).toBe(false);
			});
		});
	});

	describe('stringList', () => {
		test('accumulates NODE_OPTIONS before execArgv, with alias and = form', () => {
			withProcessState('--conditions=env', ['-C', 'a', '--conditions=b'], () => {
				expect(getOptionValue(conditions)).toStrictEqual(['env', 'a', 'b']);
			});
		});

		test('empty by default; each read is a fresh array', () => {
			withProcessState(undefined, [], () => {
				const first = getOptionValue(conditions);
				first.push('mutated');
				expect(getOptionValue(conditions)).toStrictEqual([]);
			});
		});
	});

	describe('string (last wins)', () => {
		test('space and = forms; later wins', () => {
			withProcessState(undefined, ['--title', 'first', '--title=second'], () => {
				expect(getOptionValue(title)).toBe('second');
			});
		});
	});

	describe('integers', () => {
		test('integer parses; uinteger uses its default', () => {
			withProcessState(undefined, ['--stack-trace-limit=7'], () => {
				expect(getOptionValue(stackTraceLimit)).toBe(7);
			});
			withProcessState(undefined, [], () => {
				expect(getOptionValue(maxHeader)).toBe(16_384);
			});
		});
	});

	describe('hostPort', () => {
		test('default is a fresh null-prototype object', () => {
			withProcessState(undefined, [], () => {
				const value = getOptionValue(inspectPort);
				expect(value).toStrictEqual(nullProto({
					host: '127.0.0.1',
					port: 9229,
				}));
				expect(Object.getPrototypeOf(value)).toBe(null);
			});
		});

		test('port-only merge keeps the default host (HostPort::Update)', () => {
			withProcessState(undefined, ['--inspect-port=9876'], () => {
				expect(getOptionValue(inspectPort)).toStrictEqual(nullProto({
					host: '127.0.0.1',
					port: 9876,
				}));
			});
		});

		test('=-only alias form (--inspect=) feeds the port; bare --inspect does not match', () => {
			withProcessState(undefined, ['--inspect=localhost:9230'], () => {
				expect(getOptionValue(inspectPort)).toStrictEqual(nullProto({
					host: 'localhost',
					port: 9230,
				}));
			});
			withProcessState(undefined, ['--inspect'], () => {
				expect(getOptionValue(inspectPort)).toStrictEqual(nullProto({
					host: '127.0.0.1',
					port: 9229,
				}));
			});
		});
	});

	describe('value consumption', () => {
		test(String.raw`\- escapes a literal leading dash in a space-form value`, () => {
			withProcessState(undefined, ['--title', String.raw`\-x`], () => {
				expect(getOptionValue(title)).toBe('-x');
			});
		});

		test('non-matching tokens (and other flags\' values) are skipped', () => {
			withProcessState(undefined, ['--require', './x.js', '--conditions=dev'], () => {
				expect(getOptionValue(conditions)).toStrictEqual(['dev']);
			});
		});
	});
});

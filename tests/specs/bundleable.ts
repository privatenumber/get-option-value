import { fileURLToPath } from 'node:url';
import { describe, test, expect } from 'manten';
import { build } from 'esbuild';
import spawn from 'nano-spawn';

const distDirectory = fileURLToPath(new URL('../../dist', import.meta.url));

const basicConsumer = `
	import { conditionsFlag, addonsFlag } from './flags.mjs';
	import { getOptionValue } from './index.mjs';
	console.log(JSON.stringify({
		conditions: getOptionValue(conditionsFlag),
		addons: getOptionValue(addonsFlag),
	}));
`;

const bundleConsumer = async (contents: string, minify: boolean) => {
	const result = await build({
		stdin: {
			contents,
			resolveDir: distDirectory,
			loader: 'js',
		},
		bundle: true,
		format: 'esm',
		platform: 'node',
		write: false,
		minify,
	});
	return result.outputFiles[0].text;
};

describe('get-option-value/flags is tree-shakable', () => {
	test('bundling two flags drops the others and unused converters', async () => {
		const code = await bundleConsumer(basicConsumer, false);

		// The imported flags are present
		expect(code).toContain('--conditions');
		expect(code).toContain('--addons');

		// Unused converters shaken out (only boolean + stringList are needed)
		expect(code).not.toContain('splitHostPort');
		expect(code).not.toContain('parseCInteger64');

		// Other flags' data shaken out, including version-conditional ones and
		// the version detection they pull (stable flags never reference it)
		expect(code).not.toContain('inspect-port');
		expect(code).not.toContain('experimental-vm-modules');
		expect(code).not.toContain('env-file');
		expect(code).not.toContain('process.versions');
	});

	test('the minified bundle is tiny and runs standalone', async () => {
		const code = await bundleConsumer(basicConsumer, true);
		expect(code.length).toBeLessThan(1100);

		const { stdout } = await spawn(
			process.execPath,
			['--conditions=cli', '--input-type=module', '--eval', code],
			{
				env: {
					NODE_OPTIONS: '--conditions=env --no-addons',
				},
			},
		);
		expect(JSON.parse(stdout)).toStrictEqual({
			conditions: ['env', 'cli'],
			addons: false,
		});
	});

	test('the minified host-port bundle stays compact', async () => {
		const code = await bundleConsumer(`
			import { inspectPortFlag } from './flags.mjs';
			import { getOptionValue } from './index.mjs';
			console.log(JSON.stringify(getOptionValue(inspectPortFlag)));
		`, true);
		expect(code.length).toBeLessThan(1450);
	});
});

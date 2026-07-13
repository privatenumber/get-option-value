import {
	bench, do_not_optimize, run, summary,
} from 'mitata';
import { getOptionValue } from '../src/index.ts';
import { conditionsFlag, addonsFlag, inspectPortFlag } from '../src/flags.ts';

summary(() => {
	bench('getOptionValue (empty argv)', function* emptyArgv() {
		process.execArgv = [];
		delete process.env.NODE_OPTIONS;
		yield () => do_not_optimize(getOptionValue(conditionsFlag));
	});

	bench('getOptionValue --conditions (tsx-like argv)', function* conditions() {
		process.execArgv = ['--require', '/x/cjs.js', '--import', '/x/esm.mjs', '--conditions', 'development'];
		delete process.env.NODE_OPTIONS;
		yield () => do_not_optimize(getOptionValue(conditionsFlag));
	});

	bench('getOptionValue --addons', function* addons() {
		process.execArgv = ['--no-addons'];
		delete process.env.NODE_OPTIONS;
		yield () => do_not_optimize(getOptionValue(addonsFlag));
	});

	bench('getOptionValue --inspect-port', function* inspectPort() {
		process.execArgv = ['--inspect=127.0.0.1:0'];
		delete process.env.NODE_OPTIONS;
		yield () => do_not_optimize(getOptionValue(inspectPortFlag));
	});
});

await run();

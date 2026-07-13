/**
 * Child-process oracle harness: for the FLAG_MAP ({ optionName: exportName })
 * passed by the spec, prints this package's getOptionValue next to Node's
 * internal options binding. Resolves to the built dist (the 'development'
 * condition is not set in these children). Kept dependency-free so it runs on
 * every major, including ones without TypeScript stripping.
 */
import { createRequire } from 'node:module';
import { getOptionValue } from '#get-option-value';
import * as flags from '#get-option-value/flags';

const require = createRequire(import.meta.url);
const internalOptions = require('internal/options');
const options = typeof internalOptions.getCLIOptionsInfo === 'function'
	? internalOptions.getCLIOptionsInfo().options
	: internalOptions.options;

const wrapUndefined = value => (value === undefined ? '<undefined>' : value);

const flagMap = JSON.parse(process.env.FLAG_MAP ?? '{}');
if (process.env.REQUIRE_COMPLETE_FLAG_MAP === '1') {
	const missing = [];
	for (const [name, option] of options) {
		const readable = (
			!name.startsWith('[')
			&& !name.startsWith('--no-')
			&& (
				name === '--abort-on-uncaught-exception'
				// OptionType 0/1 are noOp/V8-only and not readable through the
				// binding (except the abort special case above).
				|| option.type > 1
			)
		);
		if (readable && !(name in flagMap)) {
			missing.push(name);
		}
	}
	if (missing.length > 0) {
		throw new Error(`Generated flag metadata is missing: ${missing.join(', ')}`);
	}
}

const comparison = {};
for (const [name, exportName] of Object.entries(flagMap)) {
	const flag = flags[exportName];
	if (!flag) {
		throw new Error(`Unknown flag export "${exportName}" mapped from ${name}`);
	}
	comparison[name] = {
		ours: wrapUndefined(getOptionValue(flag)),
		oracle: wrapUndefined(internalOptions.getOptionValue(name)),
		exists: options.has(name),
	};
}

console.log(JSON.stringify(comparison));

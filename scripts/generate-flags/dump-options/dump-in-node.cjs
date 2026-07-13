/**
 * Executed inside each target Node binary
 * (`node --expose-internals dump-in-node.cjs`) to print its internal CLI
 * option schema as JSON on stdout. Kept as a standalone .cjs so it runs
 * unchanged on every major (18-26), including versions with no type
 * stripping, and so it can be linted.
 *
 * Feature-detects the two dump shapes:
 * - Node 18/19: require('internal/options').options is a Map whose entries
 *   carry the current value inline; .aliases is the alias Map.
 * - Node 20+: getCLIOptionsInfo() returns { options, aliases } without
 *   values; defaults are read via getOptionValue in the same clean process.
 * getOptionValue works uniformly on both shapes, so it is used everywhere.
 */
// Only reachable because the process is spawned with --expose-internals
// eslint-disable-next-line import-x/no-unresolved, n/no-missing-require
const internalOptions = require('internal/options');

const info = (
	typeof internalOptions.getCLIOptionsInfo === 'function'
		? internalOptions.getCLIOptionsInfo()
		: {
			options: internalOptions.options,
			aliases: internalOptions.aliases,
		}
);

const options = [];
for (const [name, entry] of info.options) {
	// Synthetic negations are computed at runtime, never schema entries
	if (name.startsWith('--no-')) {
		continue;
	}

	const record = {
		type: entry.type,
		helpText: entry.helpText,
	};
	const defaultValue = internalOptions.getOptionValue(name);
	if (defaultValue !== undefined) {
		record.default = defaultValue;
	}

	options.push([name, record]);
}

const aliases = [...info.aliases].map(
	([key, expansion]) => [key, Array.isArray(expansion) ? expansion : [expansion]],
);

// stdout is the dump: the parent process reads and parses it
// eslint-disable-next-line no-console
console.log(JSON.stringify({
	options,
	aliases,
}));

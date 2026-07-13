import { fileURLToPath } from 'node:url';
import spawn from 'nano-spawn';
import type { OptionValue } from '../schema-types.ts';

// The script executed inside each target Node binary (see dump-in-node.cjs)
const dumpScriptPath = fileURLToPath(new URL('dump-in-node.cjs', import.meta.url));

export type DumpedOption = {
	type: number;
	helpText: string;
	default?: OptionValue;
};

export type Dump = {
	options: [string, DumpedOption][];
	aliases: [string, string[]][];
};

export const dumpOptions = async (binaryPath: string): Promise<Dump> => {
	const { stdout } = await spawn(
		binaryPath,
		['--expose-internals', dumpScriptPath],
		// Prevent the parent's NODE_OPTIONS from polluting the defaults
		{ env: { NODE_OPTIONS: '' } },
	);
	return JSON.parse(stdout) as Dump;
};

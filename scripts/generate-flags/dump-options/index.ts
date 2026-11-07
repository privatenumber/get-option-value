import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
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
	const { stdout } = await promisify(execFile)(
		binaryPath,
		['--expose-internals', dumpScriptPath],
		// An empty environment, not just an empty NODE_OPTIONS: Node derives
		// some defaults from other variables (NODE_USE_SYSTEM_CA,
		// NODE_PRESERVE_SYMLINKS, ...), and a recorded release is never dumped
		// again, so an inherited value would be committed for good.
		// (nano-spawn always merges process.env, so it can't express this.)
		{ env: {} },
	);
	return JSON.parse(stdout) as Dump;
};

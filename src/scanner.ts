import { tokenizeNodeOptionsEnv } from './tokenize-node-options-env.ts';
import type { Flag } from './types.ts';

/** Folds one token source (NODE_OPTIONS or execArgv) into the running value. */
const scanSource = <T>(flag: Flag<T>, tokens: string[], value: T): T => {
	for (let index = 0; index < tokens.length; index += 1) {
		const token = tokens[index];
		if (token.length <= 1 || token[0] !== '-') {
			continue;
		}

		const equalsIndex = token[1] === '-' ? token.indexOf('=') : -1;
		let name = equalsIndex === -1 ? token : token.slice(0, equalsIndex);
		// Node normalizes `_` to `-` in the name (from index 2); most tokens have
		// none, so only pay the split + replace allocation when one is present.
		if (name.includes('_', 2)) {
			name = name.slice(0, 2) + name.slice(2).replaceAll('_', '-');
		}

		for (const form of flag.forms) {
			const [match, mode] = form;
			// `match` is the literal spelling, incl. `--no-…` for negations, so
			// matching is a plain comparison; `mode` is a pure effect.
			if (
				name !== match
				|| ((mode === 3 || mode === 5) && equalsIndex === -1)
			) {
				continue;
			}

			const hasFixedValue = mode === 4 || mode === 5;
			const effect = mode >= 3 ? 0 : mode;
			let raw = hasFixedValue ? form[2] : '';
			if (effect === 0 && !hasFixedValue) {
				if (equalsIndex === -1) {
					index += 1;
					raw = tokens[index] ?? '';
					// `\-` escapes a literal leading dash in a space-form value
					if (raw[0] === '\\' && raw[1] === '-') {
						raw = raw.slice(1);
					}
				} else {
					raw = token.slice(equalsIndex + 1);
				}
			}

			value = flag.fold(raw, value, effect);
			break;
		}
	}

	return value;
};

/**
 * Userland mirror of Node's internal getOptionValue: resolves the current
 * process's value for a Node CLI option from its startup flags — real default
 * when unset, `process.env.NODE_OPTIONS` then `process.execArgv` applied in
 * Node's boot order (https://github.com/nodejs/node/blob/v24.15.0/src/node.cc#L952-L967).
 *
 * Pass a flag from "get-option-value/flags". Rather than re-parse the whole
 * command line, it scans for the forms that affect this one flag — correct
 * because the process already booted, so every `--flag`/`--flag=…` token is a
 * real occurrence (space-form values never start with `-`; `=` values are
 * glued to their token).
 */
export const getOptionValue = <T>(flag: Flag<T>): T => {
	let value = flag.init();
	const nodeOptions = process.env.NODE_OPTIONS;
	if (nodeOptions) {
		value = scanSource(flag, tokenizeNodeOptionsEnv(nodeOptions), value);
	}
	value = scanSource(flag, process.execArgv, value);
	return value;
};

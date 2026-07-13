/**
 * Tokenizes a NODE_OPTIONS environment variable value into an argv array
 * (splitting on spaces, honoring `"` quoting and `\` escapes).
 *
 * Port of Node.js's ParseNodeOptionsEnvVar:
 * https://github.com/nodejs/node/blob/v24.15.0/src/node_options.cc#L2086-L2126
 *
 * Divergence: Node collects errors ("invalid escape" when a string ends with
 * a lone backslash, "unterminated string") and aborts startup. This port
 * returns the tokens parsed so far instead, since it's meant for
 * introspecting an environment the current process already booted with.
 */
export const tokenizeNodeOptionsEnv = (nodeOptions: string): string[] => {
	const environmentArgv: string[] = [];

	let isInString = false;
	let willStartNewArgument = true;

	for (let index = 0; index < nodeOptions.length; index += 1) {
		let character = nodeOptions[index];

		// Backslashes escape the following character (only inside strings)
		if (character === '\\' && isInString) {
			if (index + 1 === nodeOptions.length) {
				// Node: "invalid value for NODE_OPTIONS (invalid escape)"
				return environmentArgv;
			}

			index += 1;
			character = nodeOptions[index];
		} else if (character === ' ' && !isInString) {
			willStartNewArgument = true;
			continue;
		} else if (character === '"') {
			isInString = !isInString;
			continue;
		}

		if (willStartNewArgument) {
			environmentArgv.push(character);
			willStartNewArgument = false;
		} else {
			environmentArgv[environmentArgv.length - 1] += character;
		}
	}

	return environmentArgv;
};

import type { HostPort } from '../types.ts';

/**
 * DebugOptions::kDefaultInspectorPort
 * https://github.com/nodejs/node/blob/v24.15.0/src/node_options.h#L87
 */
const defaultInspectorPort = 9229;

const UINT16_MAX = 65_535;

/**
 * Strips one pair of square brackets (IPv6 literals).
 * https://github.com/nodejs/node/blob/v24.15.0/src/node_options.cc#L1429-L1434
 */
const removeBrackets = (host: string) => (
	// A single-character string can't match both, so no length guard needed
	host.startsWith('[') && host.endsWith(']')
		? host.slice(1, -1)
		: host
);

const leadingDigitsPattern = /^\d+/;

/**
 * std::from_chars on uint16_t, plus Node's range validation:
 * https://github.com/nodejs/node/blob/v24.15.0/src/node_options.cc#L1436-L1447
 *
 * Parses leading decimal digits; out-of-range leaves the result at 0.
 * Privileged ports (1-1023) are still returned by the running process.
 */
const parseAndValidatePort = (port: string) => {
	const digits = leadingDigitsPattern.exec(port)?.[0];
	const result = digits === undefined ? 0 : Number(digits);
	return result <= UINT16_MAX ? result : 0;
};

/**
 * SplitHostPort merged with HostPort::Update, applied in place: the port is
 * always overwritten, the host only when the new value carries one (an empty
 * host means "unset", mirroring HostPort's empty host_name_). Splitting into
 * locals rather than a returned `{ host, port }` avoids a temporary allocation.
 * https://github.com/nodejs/node/blob/v24.15.0/src/node_options.cc#L1449-L1470
 * https://github.com/nodejs/node/blob/v24.15.0/src/node_options.h#L37-L40
 */
export const updateHostPort = (
	existing: HostPort,
	value: string,
): HostPort => {
	let host: string;
	let port: number;

	// removeBrackets only has an effect when no port is specified, so if it
	// shortened the value, only an IPv6 address was given
	const withoutBrackets = removeBrackets(value);
	if (withoutBrackets.length < value.length) {
		host = withoutBrackets;
		port = defaultInspectorPort;
	} else {
		const colonIndex = value.lastIndexOf(':');
		if (colonIndex === -1) {
			// A port number or a host name; anything not all decimal digits is
			// a host name
			if (/\D/.test(value)) {
				host = value;
				port = defaultInspectorPort;
			} else {
				host = '';
				port = parseAndValidatePort(value);
			}
		} else {
			host = removeBrackets(value.slice(0, colonIndex));
			port = parseAndValidatePort(value.slice(colonIndex + 1));
		}
	}

	if (host !== '') {
		existing.host = host;
	}
	existing.port = port;
	return existing;
};

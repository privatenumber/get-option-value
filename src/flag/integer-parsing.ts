// Written as literals (not `2n ** 63n`) so bundlers can drop them from a
// consumer that never reads an integer flag; a computed initializer isn't
// provably side-effect-free, so it would survive tree-shaking.
const INT64_MIN = -9_223_372_036_854_775_808n; // -(2n ** 63n)
const INT64_MAX = 9_223_372_036_854_775_807n; // 2n ** 63n - 1n
const UINT64_MAX = 18_446_744_073_709_551_615n; // 2n ** 64n - 1n
const UINT64_MODULO = 18_446_744_073_709_551_616n; // 2n ** 64n

// Matches C's isspace() set skipped by strtoll/strtoull,
// then an optional sign and the leading digits
const cIntegerPattern = /^[ \t\n\v\f\r]*([+-]?)(\d*)/;

const scanCInteger = (value: string) => {
	const [, sign, digits] = cIntegerPattern.exec(value)!;
	return {
		isNegative: sign === '-',
		magnitude: digits === '' ? undefined : BigInt(digits),
	};
};

/**
 * std::atoll semantics (used for 'integer' options):
 * skip whitespace, optional sign, parse leading decimal digits,
 * 0 on garbage, clamp to int64 on overflow. The int64 result is
 * converted to a JS number the same way Node's option binding does.
 *
 * https://github.com/nodejs/node/blob/v24.15.0/src/node_options-inl.h#L489
 */
export const parseCInteger64 = (value: string) => {
	const { isNegative, magnitude } = scanCInteger(value);
	if (magnitude === undefined) {
		return 0;
	}

	let result = isNegative ? -magnitude : magnitude;
	if (result > INT64_MAX) {
		result = INT64_MAX;
	} else if (result < INT64_MIN) {
		result = INT64_MIN;
	}

	return Number(result);
};

/**
 * std::strtoull(value, nullptr, 10) semantics (used for 'uinteger' options):
 * skip whitespace, optional sign (a minus sign wraps modulo 2^64!),
 * parse leading decimal digits, 0 on garbage, ULLONG_MAX on overflow.
 *
 * https://github.com/nodejs/node/blob/v24.15.0/src/node_options-inl.h#L492-L494
 */
export const parseCUnsignedInteger64 = (value: string) => {
	const { isNegative, magnitude } = scanCInteger(value);
	if (magnitude === undefined) {
		return 0;
	}

	if (magnitude > UINT64_MAX) {
		return Number(UINT64_MAX);
	}

	return Number(
		isNegative
			? (UINT64_MODULO - magnitude) % UINT64_MODULO
			: magnitude,
	);
};

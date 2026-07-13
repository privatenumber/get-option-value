/**
 * A single command-line spelling that affects a flag's value:
 * `[match, mode]`.
 *
 * - `match`: the literal normalized token that triggers this form, e.g.
 *   `--inspect-brk`, `-C`, or the negated spelling `--no-addons`.
 * - `mode`: `0` consumes a value, `1` sets `true`, `2` sets `false`, `3`
 *   consumes a value only in the `--name=value` spelling, and `4`/`5` use a
 *   fixed alias value (any spelling / `=`-only respectively).
 */
export type Form = (
	| readonly [match: string, mode: 0 | 1 | 2 | 3, fixedValue?: never]
	| readonly [match: string, mode: 4 | 5, fixedValue: string]
);

/**
 * A generated descriptor for one Node CLI option: every command-line form
 * that affects it, plus how to fold those into the option's value. Passed to
 * getOptionValue; `T` is the option-value type it resolves to.
 *
 * `T` is carried only by `init`/`fold`'s return (both covariant) so a defaulted
 * `Flag<string>` is usable where a `Flag<string | undefined>` is expected;
 * `fold`'s `current` is `unknown` (the factory knows the real shape).
 *
 * Import flags from "get-option-value/flags" — they are generated from real
 * Node binaries and not meant to be hand-constructed.
 */
export type Flag<T> = {
	readonly forms: readonly Form[];

	/** A fresh initial value (the option's default) before any form is applied. */
	readonly init: () => T;

	/**
	 * Folds one matched form into the running value. Parameters are ordered by
	 * how often factories need them (`raw` first, `effect` last), so most folds
	 * ignore no leading args and value converters can be passed by reference.
	 */
	readonly fold: (raw: string, current: unknown, effect: number) => T;
};

/**
 * A resolved host:port value, as Node's options binding reports it for
 * hostPort options — a null-prototype object with both fields always present
 * (https://github.com/nodejs/node/blob/v24.15.0/src/node_options.cc#L1674-L1688).
 */
export type HostPort = {
	host: string;
	port: number;
};

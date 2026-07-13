/**
 * Build-time types for the option schema dumped from real Node binaries and
 * the resolver that simulates Node's option effects. None of this ships; it
 * exists only to generate src/flags.ts and oracle-verify it.
 */
import type { HostPort } from '../../src/types.ts';

export type { Form, HostPort } from '../../src/types.ts';

/**
 * Option types supported by Node's options parser.
 * https://github.com/nodejs/node/blob/v24.15.0/src/node_options-inl.h#L480-L514
 */
export type OptionType =
	| 'boolean'
	| 'integer'
	| 'uinteger'
	| 'string'
	| 'stringList'
	| 'hostPort'
	| 'noOp'
	| 'v8Option';

export type OptionValue = boolean | number | string | string[] | Partial<HostPort>;

/**
 * One option's definition from a real Node binary: parsing schema (type,
 * implications) plus the default getOptionValue reports.
 */
export type OptionSpec = {
	type: OptionType;

	/** Node's one-line help description, used for the generated flag table. */
	helpText?: string;

	/** Option names set to `true` when this option is matched. */
	implies?: string[];

	/** Option names set to `false` when this option is matched. */
	impliesNot?: string[];

	/** Like `implies`, but fired when matched in negated form (`--no-<name>`). */
	negationImplies?: string[];

	/** Like `impliesNot`, but fired when matched in negated form. */
	negationImpliesNot?: string[];

	/** Default value reported by getOptionValue when unset. */
	default?: OptionValue;
};

/** A full option schema for one Node major. */
export type OptionsSchema = {
	options: Record<string, OptionSpec>;
	aliases: Record<string, string[]>;
};

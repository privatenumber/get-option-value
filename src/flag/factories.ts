import type { Flag, Form, HostPort } from '../types.ts';
import { updateHostPort } from './host-port.ts';
import { parseCInteger64, parseCUnsignedInteger64 } from './integer-parsing.ts';

/**
 * Per-value-shape flag factories. Each generated flag is built from exactly
 * one factory, so a bundler drops the factories (and their converters, like
 * the host:port and C-integer parsing) that an app's imported flags never use.
 *
 * `effect` on a matched form: 1 sets true, 2 sets false, 0 consumes a value.
 * Fold implementations are shared module-level functions; init functions
 * capture per-flag defaults where needed.
 */

const returnUndefined = (): undefined => undefined;
const emptyList = (): string[] => [];
const setByEffect = (_raw: string, _current: unknown, effect: number): boolean => effect === 1;
const returnRaw = (raw: string): string => raw;
const appendRaw = (raw: string, current: unknown): string[] => {
	const list = current as string[];
	list.push(raw);
	return list;
};
const foldHostPort = (raw: string, current: unknown): HostPort => (
	updateHostPort(current as HostPort, raw)
);

export const booleanFlag = (
	default_: boolean,
	forms: readonly Form[],
): Flag<boolean> => ({
	forms,
	init: () => default_,
	fold: setByEffect,
});

export const stringListFlag = (
	forms: readonly Form[],
): Flag<string[]> => ({
	forms,
	init: emptyList,
	fold: appendRaw,
});

export const stringFlag = <Default extends string | undefined>(
	default_: Default,
	forms: readonly Form[],
): Flag<string | Default> => ({
	forms,
	init: () => default_,
	fold: returnRaw,
});

export const integerFlag = <Default extends number | undefined>(
	default_: Default,
	forms: readonly Form[],
): Flag<number | Default> => ({
	forms,
	init: () => default_,
	fold: parseCInteger64,
});

export const unsignedIntegerFlag = <Default extends number | undefined>(
	default_: Default,
	forms: readonly Form[],
): Flag<number | Default> => ({
	forms,
	init: () => default_,
	fold: parseCUnsignedInteger64,
});

/**
 * A flag with no readable value on the running major — the option doesn't
 * exist yet, or is a pure V8 option here. Used for a version-conditional
 * flag's branch on a major where it reads `undefined` (matching the binding).
 */
export const undefinedFlag = (): Flag<undefined> => ({
	forms: [],
	init: returnUndefined,
	fold: returnUndefined,
});

export const hostPortFlag = (
	default_: HostPort,
	forms: readonly Form[],
): Flag<HostPort> => ({
	forms,
	// Null-prototype clone, matching the binding and avoiding a shared default
	init: () => Object.assign(Object.create(null) as HostPort, default_),
	fold: foldHostPort,
});

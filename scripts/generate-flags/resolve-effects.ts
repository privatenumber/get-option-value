import type { OptionSpec, OptionsSchema } from './schema-types.ts';

/**
 * A resolved option effect: consume a value (0), set true (1), set false (2),
 * or use a fixed value injected by an alias.
 */
export type Effect = 0 | 1 | 2 | string;

const VALUE: Effect = 0;
const SET_TRUE: Effect = 1;
const SET_FALSE: Effect = 2;
const abortOnUncaughtException = '--abort-on-uncaught-exception';

type QueuedArgument = {
	value: string;
	synthetic: boolean;
};

type State = OptionsSchema & {
	queue: QueuedArgument[];
	effects: Map<string, Effect>;
};

const effectFor = (state: State, target: string, value: boolean): Effect => (
	target === abortOnUncaughtException || state.options[target]?.type === 'boolean'
		? (value ? SET_TRUE : SET_FALSE)
		: VALUE
);

/** Expands aliases in place by prepending their synthetic arguments. */
const expandAliases = (initialName: string, hasEquals: boolean, state: State) => {
	let name = initialName;
	while (true) {
		const next = state.queue[0]?.value;
		const expansion = (
			state.aliases[name]
			?? (hasEquals ? state.aliases[`${name}=`] : undefined)
			?? (next !== undefined && next !== '' && next[0] !== '-'
				? state.aliases[`${name} <arg>`]
				: undefined)
		);
		if (!expansion) {
			return name;
		}
		// A fixed-value alias (e.g. --trace-events-enabled ->
		// --trace-event-categories v8,node,node.async_hooks) does not accept an
		// attached `=` value; Node stops option parsing at that spelling.
		if (hasEquals && expansion.slice(1).some(value => !value.startsWith('-'))) {
			return undefined;
		}

		const previousName = name;
		[name] = expansion;
		state.queue.unshift(...expansion.slice(1).map(value => ({
			value,
			synthetic: true,
		})));
		// Self-referencing aliases only append synthetic arguments.
		if (name === previousName) {
			return name;
		}
	}
};

const applyImplications = (
	state: State,
	option: OptionSpec,
	negated: boolean,
) => {
	const implies = negated ? option.negationImplies : option.implies;
	for (const target of implies ?? []) {
		// V8 implications aren't exposed through getOptionValue.
		if (state.options[target]?.type !== 'v8Option') {
			state.effects.set(target, effectFor(state, target, true));
		}
	}

	const impliesNot = negated ? option.negationImpliesNot : option.impliesNot;
	for (const target of impliesNot ?? []) {
		state.effects.set(target, effectFor(state, target, false));
	}
};

const resolveArgument = (argument: string, state: State) => {
	const equalsIndex = argument[1] === '-' ? argument.indexOf('=') : -1;
	let name = equalsIndex === -1 ? argument : argument.slice(0, equalsIndex);
	name = name.slice(0, 2) + name.slice(2).replaceAll('_', '-');

	let negated = false;
	if (name.startsWith('--no-')) {
		name = `--${name.slice(5)}`;
		negated = true;
	}

	const expandedName = expandAliases(name, equalsIndex !== -1, state);
	if (expandedName === undefined) {
		return false;
	}
	name = expandedName;
	const option = state.options[name];
	if (!option) {
		return true;
	}

	applyImplications(state, option, negated);
	if (negated && option.type !== 'boolean' && option.type !== 'v8Option') {
		return false;
	}

	if (option.type === 'boolean') {
		state.effects.set(name, negated ? SET_FALSE : SET_TRUE);
		return true;
	}
	if (option.type === 'noOp' || option.type === 'v8Option') {
		return true;
	}

	if (equalsIndex === argument.length - 1) {
		return false;
	}
	if (equalsIndex === -1) {
		const value = state.queue.shift();
		if (value === undefined || value.value[0] === '-') {
			return false;
		}
		state.effects.set(name, value.synthetic ? value.value : VALUE);
		return true;
	}

	state.effects.set(name, VALUE);
	return true;
};

/**
 * Resolves the alias, negation, implication, and value-consumption effects
 * needed to generate flag forms. Value parsing and parser output are omitted.
 */
export const resolveEffects = (args: string[], schema: OptionsSchema) => {
	const state: State = {
		...schema,
		queue: args.map(value => ({
			value,
			synthetic: false,
		})),
		effects: new Map(),
	};

	while (state.queue.length > 0) {
		const argument = state.queue.shift()!.value;
		if (
			argument.length <= 1
			|| argument[0] !== '-'
			|| argument === '--'
			|| !resolveArgument(argument, state)
		) {
			break;
		}
	}

	return state.effects;
};

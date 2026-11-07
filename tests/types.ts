import { getOptionValue } from '../src/index.ts';
import {
	envFileFlag,
	maxHttpHeaderSizeFlag,
	stackTraceLimitFlag,
	titleFlag,
} from '../src/flags.ts';

// Concrete defaults narrow the return type: these values can never be
// undefined, even when the option was not passed.
const maxHttpHeaderSize: number = getOptionValue(maxHttpHeaderSizeFlag);
const title: string = getOptionValue(titleFlag);

// A version branch that intentionally resolves to undefined remains reflected
// in the public type.
const stackTraceLimit: number | undefined = getOptionValue(stackTraceLimitFlag);

// A flag whose value shape changed across releases is still accepted, and
// its result is the union of the shapes.
const envFile: string | string[] = getOptionValue(envFileFlag);

export {
	envFile,
	maxHttpHeaderSize,
	stackTraceLimit,
	title,
};

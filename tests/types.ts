import { getOptionValue } from '../src/index.ts';
import {
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

export {
	maxHttpHeaderSize,
	stackTraceLimit,
	title,
};

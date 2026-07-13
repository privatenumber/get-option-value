import { F as Flag } from './types-UwaaK4iO.mjs';
export { H as HostPort } from './types-UwaaK4iO.mjs';

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
declare const getOptionValue: <T>(flag: Flag<T>) => T;

export { Flag, getOptionValue };

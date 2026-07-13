/**
 * Wraps an expected value in a null-prototype object, matching how the options
 * binding (and this package) return hostPort values (see src/flag/host-port.ts).
 * manten's toStrictEqual is prototype-sensitive, so this locks the shape.
 */
export const nullProto = <T extends object>(
	value: T,
): T => Object.assign(Object.create(null), value);

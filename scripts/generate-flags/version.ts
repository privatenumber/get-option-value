const parseVersion = (version: string) => version.split('.').map(Number) as [number, number, number];

/** Numeric semver order. String order is wrong (`"24.9.0" > "24.19.0"`). */
export const compareVersions = (a: string, b: string) => {
	const [aMajor, aMinor, aPatch] = parseVersion(a);
	const [bMajor, bMinor, bPatch] = parseVersion(b);
	return (aMajor - bMajor) || (aMinor - bMinor) || (aPatch - bPatch);
};

/**
 * The integer threshold `forVersion` compares against, written with numeric
 * separators so it reads as the version: 24.21.0 -> `24_021_000`. Must match
 * the packing in src/flag/for-version.ts.
 */
export const packedVersionLiteral = (version: string) => {
	const [major, minor, patch] = parseVersion(version);
	if (minor > 999 || patch > 999) {
		throw new Error(`Version ${version} does not fit the packed threshold encoding`);
	}
	return `${major}_${String(minor).padStart(3, '0')}_${String(patch).padStart(3, '0')}`;
};

export const majorOf = (version: string) => parseVersion(version)[0];

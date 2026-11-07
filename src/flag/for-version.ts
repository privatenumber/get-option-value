let version: number | undefined;

/**
 * Picks a version-conditional flag: `atOrAbove` when running Node >=
 * `minimumVersion`, else `below`. Versions are packed as
 * `major * 1e6 + minor * 1e3 + patch` (the generator writes `24_021_000` for
 * 24.21.0), so one integer comparison orders them; the running version is
 * parsed once (memoized) on first use. Thresholds are exact releases because
 * Node changes options in minor and even patch releases, not only majors.
 *
 * Wrapping the choice in a call — rather than a bare `nodeVersion >= n ? … : …`
 * ternary — is what lets a bundler drop it: rollup/esbuild reliably eliminate
 * an unused `@__PURE__` call (and this module with it), but keep a top-level
 * version constant a bare ternary would need. So stable flags never pull in
 * `process`.
 */
export const forVersion = <A, B>(
	minimumVersion: number,
	atOrAbove: A,
	below: B,
): A | B => {
	if (version === undefined) {
		// parseInt tolerates prerelease suffixes such as "27.0.0-pre"
		const [major, minor, patch] = process.versions.node.split('.').map(part => Number.parseInt(part, 10));
		version = (major * 1e6) + (minor * 1e3) + patch;
	}
	return version >= minimumVersion ? atOrAbove : below;
};

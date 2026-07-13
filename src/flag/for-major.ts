let major: number | undefined;

/**
 * Picks a version-conditional flag: `atOrAbove` when running Node >=
 * `minimumMajor`, else `below`. The major is read once (memoized) on first use.
 *
 * Wrapping the choice in a call — rather than a bare `nodeMajor >= n ? … : …`
 * ternary — is what lets a bundler drop it: rollup/esbuild reliably eliminate
 * an unused `@__PURE__` call (and this module with it), but keep a top-level
 * version constant a bare ternary would need. So stable flags never pull in
 * `process`.
 */
export const forMajor = <A, B>(
	minimumMajor: number,
	atOrAbove: A,
	below: B,
): A | B => {
	major ??= Number.parseInt(process.versions.node, 10);
	return major >= minimumMajor ? atOrAbove : below;
};

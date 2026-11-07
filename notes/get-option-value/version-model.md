# Version model: per-release history, exact-release branches, stable exports

Decision (2026-11-07): the generator records every Node release, branches each flag on the exact release where it changed, and keeps an export for every option name any recorded release registers. This replaced sampling the latest release of each major and branching by major.

## Why the old model failed

Before this change, `scripts/generate-flags` and `tests/specs/flags.ts` both called `getNode(major)`, which resolves the newest release of a major at the time it runs. Two failures followed:

- **CI went red without a code change.** Data generated on 2026-07-13 from 26.5.0 failed on 2026-10-29, when CI resolved 26.13.0 (18 new options) and a 24.x release in which `--experimental-addon-modules` defaults to `true` (Test runs 40956321035 and 42375608074).
- **Values were wrong inside a major.** Node changes options in minor releases (see [cli-option-history.md](../nodejs/cli-option-history.md)). 1.0.0 read the 22.23.4 defaults on every 22.x release, so for example `--experimental-strip-types` read `true` on 22.6.0-22.17.x, where Node reads `false`. It also returned `string[]` for `--env-file` on 24.0.0-24.11.x, where Node returns a string.
- **Regeneration dropped a published export.** Exports came only from the newest major's option names. When 26.12.0 renamed `--experimental-config-file` to `--config-file`, regeneration removed `experimentalConfigFileFlag`, which the published 1.0.0 `dist/flags.mjs` exports.

## The model

### Data: an append-only per-release history

`pnpm record-releases` dumps each release once and stores the schemas as change points in `scripts/generate-flags/history/node-options.json` (`scripts/generate-flags/history/index.ts`). Released binaries are immutable, so a recorded release never needs a second dump. The dump runs with an empty environment, because Node derives some defaults from variables such as `NODE_USE_SYSTEM_CA`; an inherited value would otherwise be committed for good.

Data that comes from source (implications and environment variables) is kept separate from the dump: `pnpm record-releases --refresh-sources` re-applies the source parsers to every recorded release without binaries (444 source fetches, about 40 s on 2026-11-07). `pnpm generate` reads the history and fetches only the `node_options.cc` files that the flag table links to, before writing any file.

Measured costs (macOS arm64, 2026-11-07): one download is about 2.3 s and 110-190 MB extracted; one dump is 0.17 s and 28.8 KB of JSON. The full backfill of 222 releases took a few minutes with 6 concurrent jobs. Each binary goes to a temporary `get-node` `output` directory and is deleted after the dump, so disk use stays at about 6 binaries. The history is 66 KB, and generation takes about 0.5 s.

### Runtime: branch on the exact release

`src/flag/for-version.ts` compares one packed integer (`major * 1e6 + minor * 1e3 + patch`) against a generated threshold such as `24_021_000`. Numeric comparison is required: as strings, `"24.9.0" > "24.19.0"`. Thresholds come from the data, so the model does not assume that Node changes options only in minors.

### Exports: every name a recorded release registers

The export set is the union of readable option names over all recorded releases (`emit` in `scripts/generate-flags/emit.ts`). Consequences:

- An export exists while any supported release accepts its name. It can only disappear when a Node major leaves the `engines` range, which is a major release of this package.
- A rename links both names on every release. Node declares a rename by keeping the former name as a single-target alias. After the rename, the former name reads through the new one; before it, the new name reads through the former one, when both have the same type. The type check keeps out unrelated aliases, such as the boolean `--experimental-default-config-file`, which later became an alias of `--config-file`. Names that resolve identically are re-exported as the same object (`experimentalConfigFileFlag = configFileFlag`, `experimentalStripTypesFlag = stripTypesFlag`).
- On a release where an option doesn't exist, the flag reads the neighboring segment's value, where Node's binding returns `undefined`. Node refuses to start with that option, but other spellings of the segment can still be accepted. So a missing release folds into the segment only if no accepted spelling differs in whether it takes a value; otherwise that release reads `undefined`. A release where the option exists folds only if the segment adds no spelling that release accepts at all (`coveredBy` and `markConflictingAbsences` in `emit.ts`). Without these checks, `experimentalConfigFileFlag` on 24.14.1 treated the boolean `--experimental-default-config-file` as a string option and captured the next argument as its value.

### Published types are part of the contract

`forVersion` returns one `Flag` with a union value (`Flag<string | string[]>`). A union of flags (`Flag<string[]> | Flag<string>`), which 1.0.0 published for `envFileFlag`, can't be passed to `getOptionValue` at all (TS2345), because `T` can't be inferred from it. `tests/types.ts` covers this.

An export's value type is the union of its segments' value types. Adding a member (a new shape, or `undefined` from a string flag without a default) widens the published type, which is a breaking change. `docs/flags.json` records each export's `types`, and generation fails if a regeneration widens one (`assertNoWidening`).

The backfill exposed three drifts that would widen published 1.0.0 types: `--experimental-loader` (a string below 18.6.0) and `--allow-fs-read` / `--allow-fs-write` (strings below 20.7.0). They are listed in `inexactBelow` in `emit.ts`: below those releases, the flags read their newest list shape. The value differs in shape and in repetition: Node keeps the last string (`--allow-fs-read=/a --allow-fs-read=/b` is `"/b"`), while the list keeps every occurrence (`["/a", "/b"]`). Decision rationale: these are EOL releases, and a union type would break every TypeScript consumer of those exports; a list factory that keeps only the last value would ship runtime code for EOL releases only. The oracle test skips exactly these cases, using `inexactBelow` from `docs/flags.json`. `inexactBelow` only applies to drift in releases below the published shape; a type change in a new release can only ship in a major release.

`--experimental-loader` is also in the read-set, which must never drift; the existing read-set guard caught it first.

### Verification

- The oracle test (`tests/specs/flags.ts`) runs real binaries on `testReleases` from `docs/flags.json`: the fewest releases that run every flag's version segment at a release where its option exists, plus the newest release of each major. Choosing them is interval stabbing, solved greedily (`pickTestReleases`). A segment's first release is not enough: segments often start where the option doesn't exist, where the test skips it (`--vfs-mount` exists only in 26.10.0). There were 19 releases on 2026-11-07, against 83 for "first existing release of every segment"; downloads and disk in CI scale with this number. A third test pass sets every option environment variable, with an argv override. The matrix changes only when the data changes.
- The scheduled [Sync Node.js releases](../../.github/workflows/sync-node-releases.yml) workflow records new releases and opens a PR with `secrets.GH_TOKEN`. A PR created with `GITHUB_TOKEN` gets only approval-required workflow runs ([GitHub docs](https://docs.github.com/en/actions/concepts/security/github_token#when-github_token-triggers-workflow-runs), accessed 2026-11-07).

### Environment variables are inputs; config files are not

Decision: flags read the environment variables Node reads into options (see [cli-option-history.md](../nodejs/cli-option-history.md#observed-options-that-start-from-environment-variables)). There are seven, each with fixed semantics, and they are readable from `process.env` like `NODE_OPTIONS`, which the scanner already reads at call time. The mapping is recorded per release from source, and the oracle test verifies it with the variables set. Separate factories (`environmentBooleanFlag`, `environmentStringFlag`) keep `process` out of bundles for the other flags.

Rejected for now: reading Node config files. That needs runtime filesystem reads, the working directory at startup, the `--config-file` and default-file resolution rules, and the merge order of a format that keeps growing. Those are new runtime responsibilities for a scanner that reads only process state. The README lists the gap.

## Alternatives considered

| Alternative | Verdict |
| --- | --- |
| Keep latest-of-major sampling, regenerate on failure | Rejected: wrong inside a major (the strip-types and env-file examples above), and CI breaks on every Node release. |
| Bisect between the first and last minor of each major | Rejected: assumes each value changes once. Node reverts experimental changes, for example the 25.2.1 webstorage revert, and a revert between two equal endpoints is invisible. |
| Sample only the latest patch of each minor | Rejected: misses patch-level schema changes such as 25.2.1, and the stability index allows experimental changes in any release. Recording every release costs only download time once. |
| Use Node's `cli.json` docs as the data source | Rejected as the source; useful as a cross-check. 21 of 196 documented options lack `meta.added`, `changes` are prose, and internal options are missing. |
| Branch on major.minor | Rejected: patch releases also change the schema (25.2.1). |
| Lockfile of published export names | Rejected: depends on publish history instead of Node data, and misses names that Node users read in their release's docs, such as `--experimental-strip-types`. |
| Make every drifting flag read its newest shape | Rejected: would also narrow 1.0.0's already-published `envFileFlag` union and make it wrong on 20.6.0-24.11.x. |

Precedents: [core-js-compat](https://github.com/zloirock/core-js/blob/980a5212d92ae4f24f7aa1e972e1f7dbcaf97445/packages/core-js-compat/src/data.mjs#L1-L43) uses patch-level Node thresholds; [MDN browser-compat-data](https://github.com/mdn/browser-compat-data/blob/82daeebf5a7073d55223a8cdb8aa54fb9416e27d/schemas/compat-data-schema.md) models support as version ranges with `alternative_name` for renames; [node-compat-table](https://github.com/compat-table/node-compat-table/blob/499beb6f1daa36f10c26b85a7f3ec3b3448ded23/.github/workflows/test.yml) tests real binaries at patch level on a daily schedule.

## When to revisit

- Node publishes a supported API for option metadata ([nodejs/node#52709](https://github.com/nodejs/node/issues/52709) asked to expose the parser).
- Downloading each new release becomes too slow or costly for the scheduled job.
- The `inexactBelow` exceptions can be removed in a major release of this package, or when their releases leave the `engines` range.
- A platform difference between macOS and Linux dumps shows up in CI. The recorder would then need to run only on Linux.
- Node exposes config-file options to the process, or users need config-file support badly enough to accept runtime filesystem reads.

## Known limitations

- A prerelease, or a release newer than the history, reads the data of the newest recorded release at or below its version number.
- Options set in Node config files are not seen.

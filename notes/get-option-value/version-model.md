# Version model: per-release history, exact-release branches, stable exports

Decision (2026-11-07): the generator records every Node release, branches each flag on the exact release where it changed, and keeps an export for every option name any recorded release registers. This replaced sampling the latest release of each major and branching by major.

## Why the old model failed

Before this change, `scripts/generate-flags` and `tests/specs/flags.ts` both called `getNode(major)`, which resolves the newest release of a major at the time it runs. Two failures followed:

- **CI went red without a code change.** Data generated on 2026-07-13 from 26.5.0 failed on 2026-10-29, when CI resolved 26.13.0 (18 new options) and a 24.x release in which `--experimental-addon-modules` defaults to `true` (Test runs 40956321035 and 42375608074).
- **Values were wrong inside a major.** Node changes options in minor releases (see [cli-option-history.md](../nodejs/cli-option-history.md)). 1.0.0 read the 22.23.4 defaults on every 22.x release, so for example `--experimental-strip-types` read `true` on 22.6.0-22.17.x, where Node reads `false`. It also returned `string[]` for `--env-file` on 24.0.0-24.11.x, where Node returns a string.
- **Regeneration dropped a published export.** Exports came only from the newest major's option names. When 26.12.0 renamed `--experimental-config-file` to `--config-file`, regeneration removed `experimentalConfigFileFlag`, which the published 1.0.0 `dist/flags.mjs` exports.

## The model

### Data: an append-only per-release history

`pnpm record-releases` dumps each release once and stores the schemas as change points in `scripts/generate-flags/history/node-options.json` (`scripts/generate-flags/history/index.ts`). Released binaries are immutable, so a recorded release never needs a second dump. `pnpm generate` reads only this file.

Measured costs (macOS arm64, 2026-11-07): one download is about 2.3 s and 110-190 MB extracted; one dump is 0.17 s and 28.8 KB of JSON. The full backfill of 222 releases took a few minutes with 6 concurrent jobs. Each binary goes to a temporary `get-node` `output` directory and is deleted after the dump, so disk use stays at about 6 binaries. The history is 66 KB, and generation takes about 0.5 s.

### Runtime: branch on the exact release

`src/flag/for-version.ts` compares one packed integer (`major * 1e6 + minor * 1e3 + patch`) against a generated threshold such as `24_021_000`. Numeric comparison is required: as strings, `"24.9.0" > "24.19.0"`. Thresholds come from the data, so the model does not assume that Node changes options only in minors.

### Exports: every name a recorded release registers

The export set is the union of readable option names over all recorded releases (`emit` in `scripts/generate-flags/emit.ts`). Consequences:

- An export exists while any supported release accepts its name. It can only disappear when a Node major leaves the `engines` range, which is a major release of this package.
- A renamed option's former name reads through its target on releases where it is an alias. When the two names resolve identically on every release, the former name is re-exported as the same object (`experimentalConfigFileFlag = configFileFlag`).
- On a release where an option doesn't exist, the flag reads the neighboring segment's default. Node refuses to start with an unknown option, so no process can observe that value.

### Published types are part of the contract

An export's TypeScript type is the union of its segments' factories. Adding a factory to an existing export widens its type, which is a breaking change. `docs/flags.json` records each export's `factories`, and generation fails if a regeneration widens one (`assertNoWidening`).

The backfill exposed three drifts that would widen published 1.0.0 types: `--experimental-loader` (a string below 18.6.0) and `--allow-fs-read` / `--allow-fs-write` (strings below 20.7.0). They are listed in `inexactBelow` in `emit.ts`: below those releases, the flags read their newest list shape (`["x"]` where Node has `"x"`). Decision rationale: these are EOL releases, the content is the same, and a union type would break every TypeScript consumer of those exports. The oracle test skips exactly these cases, using `inexactBelow` from `docs/flags.json`.

`--experimental-loader` is also in the read-set, which must never drift; the existing read-set guard caught it first.

### Verification

- The oracle test (`tests/specs/flags.ts`) runs real binaries on `testReleases` from `docs/flags.json`: the first release of every flag's version segment, so each emitted branch is checked once, plus the newest release of each major. There were 39 releases on 2026-11-07. The matrix changes only when the data changes.
- The scheduled [Sync Node.js releases](../../.github/workflows/sync-node-releases.yml) workflow records new releases and opens a PR with `secrets.GH_TOKEN`. A PR created with `GITHUB_TOKEN` gets only approval-required workflow runs ([GitHub docs](https://docs.github.com/en/actions/concepts/security/github_token#when-github_token-triggers-workflow-runs), accessed 2026-11-07).

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

## Known limitations

- A new name read on a release before the rename does not fall back to the old name. For example, `stripTypesFlag` on 22.17.0 (where `--strip-types` doesn't exist) reads `true`, the default of its lowest segment, not the `--experimental-strip-types` value (`false`). Use `experimentalStripTypesFlag` on those releases. 1.0.0 had the same behavior: its `stripTypesFlag` fallback was also `booleanFlag(true, ...)`.
- Prereleases and releases newer than the history read the newest recorded behavior.

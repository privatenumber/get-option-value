# How Node.js changes CLI options across releases

Node changes CLI options inside a major, in minor releases and occasionally in patch releases. A per-major view of options is therefore wrong for most releases of a major. Last verified 2026-11-07 against releases 18.0.0 through 26.13.0.

## Policy

- Experimental features are exempt from semver. The [stability index](https://github.com/nodejs/node/blob/v24.22.1/doc/api/documentation.md#stability-index) says experimental features may change incompatibly or be removed "in any future release".
- A patch release has added a CLI option before: [Node 0.12.10](https://nodejs.org/en/blog/release/v0.12.10) added `--security-revert` in a security release. No patch release in 18.0.0 through 26.13.0 added or removed an option name (see the source scan below).
- `internal/options`, which the recorder reads with `--expose-internals`, is internal. The [collaborator guide](https://github.com/nodejs/node/blob/v24.22.1/doc/contributing/collaborator-guide.md#internal-vs-public-api) treats `lib/internal/**` as non-public API. The recorder's type fingerprint (`scripts/generate-flags/build-schema.ts`) detects changes to the option-type enum.

## Observed: option names by release level (source scan)

Method: for every release from v18.0.0 to v26.13.0 (222 releases, 143 minors), fetch `https://raw.githubusercontent.com/nodejs/node/v<version>/src/node_options.cc` and `.h`, extract names with the regular expression `/Add(?:Option|Alias)\(\s*"(-[\w-]+)"/g`, and diff consecutive releases of the same major.

| Result | Count |
| --- | --- |
| Patch releases that changed the option-name set | 0 |
| Patch releases that changed `node_options.cc` or `.h` at all | 8 |
| Within-major minor releases that changed `node_options.cc` or `.h` | 105 of 134 |

The patch-level changes that affect the option schema:

- **25.2.1** made `--experimental-webstorage` the canonical option again, with `--webstorage` as its alias. On 25.0.0-25.2.0, `--webstorage` was canonical. The canonical name changed in a patch release.
- **22.22.1 and 24.13.1** changed the type-stripping default from `true` to the build flag `HAVE_AMARO` (`bool strip_types = HAVE_AMARO;`). The default now depends on the build configuration.
- **25.8.1** moved `use_system_ca` from a per-process to a per-environment option, with its default read from the `NODE_USE_SYSTEM_CA` environment variable.

The other patch-level changes edit help text, error messages, or heap-size computation only.

## Observed: options removed inside a major

Experimental options are removed in minor releases. Examples from the scan: 18.1.0 removed `--harmony-top-level-await`; 22.2.0 removed `--experimental-policy` and `--policy-integrity`; 22.6.0 removed `--experimental-network-imports`; 23.4.0 removed `--experimental-default-type`; 26.11.0 removed `--vfs-mount`.

## Observed: defaults, types, and names that changed inside a major

Source: the recorded per-release dumps in [`scripts/generate-flags/history/node-options.json`](../../scripts/generate-flags/history/node-options.json). Each option timeline entry is `[first release, spec]` on the semver-sorted release axis. Reproduce any row with, for example:

```sh
node -e 'const h = require("./scripts/generate-flags/history/node-options.json"); console.log(JSON.stringify(h.options["--env-file"].map(([r, v]) => [r, v && v.type])))'
```

| Option | Change |
| --- | --- |
| `--experimental-loader` | `string` until 18.5.0, `stringList` from 18.6.0 (loader chaining, [nodejs/node#42623](https://github.com/nodejs/node/pull/42623)) |
| `--allow-fs-read`, `--allow-fs-write` | `string` on 20.0.0-20.6.x, `stringList` from 20.7.0 |
| `--env-file` | `string` from 20.6.0, `stringList` from 24.12.0, `string` again on 25.0.0-25.1.x, `stringList` from 25.2.0 |
| `--stack-trace-limit` | pure V8 option until 22.9.x, readable `integer` from 22.10.0 |
| `--experimental-strip-types` | default `false` on 22.6.0-22.17.x, `true` from 22.18.0; `false` on 23.0.0-23.5.x, `true` from 23.6.0 |
| `--experimental-addon-modules` | default `false` from 22.20.0 and 23.6.0; `true` from 24.19.0; `false` on 25.x; `true` from 26.5.0 |
| `--experimental-config-file` | canonical option until 26.11.x; from 26.12.0 an alias of the new `--config-file` |

Cross-check: Node's generated docs record some of these changes. [`cli.json` for v24.22.1](https://nodejs.org/download/release/v24.22.1/docs/api/cli.json) lists `--experimental-addon-modules` as "enabled by default" in v24.19.0 ([nodejs/node#64221](https://github.com/nodejs/node/pull/64221)), and `--no-strip-types` as enabled by default in v23.6.0 and v22.18.0. The docs are incomplete as a data source: 175 of 196 documented options in that file have `meta.added`, and the `changes` entries are prose.

## Observed: releases that are not stable

`https://nodejs.org/dist/index.json` listed `v27.0.0-alpha.0.0.0` (dated 2026-10-29) as its first entry on 2026-11-07. The recorder excludes versions that are not plain `x.y.z`.

## Evidence gaps

- **Platform:** the 222 dumps were recorded on macOS arm64. Defaults can depend on the build (`HAVE_AMARO`), so a platform difference is possible. The Linux CI oracle test compares real Linux binaries on the pinned `testReleases` against this data. A local Docker cross-check was not run.
- **Config and env files:** Node config files (`--config-file`) and `--env-file` can supply options. Whether those options appear in `process.execArgv` or `NODE_OPTIONS` was not checked.

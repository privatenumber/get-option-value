# Contributing

## Setup

Uses [pnpm](https://pnpm.io). The Node version for development is pinned in [`.nvmrc`](./.nvmrc).

```bash
pnpm install
```

## Commands

| Command | Description |
| - | - |
| `pnpm build` | Bundle `src/` to `dist/` with [pkgroll](https://github.com/privatenumber/pkgroll). |
| `pnpm test` | Build, then run the test suite against real Node binaries. |
| `pnpm type-check` | Type-check with `tsc`. |
| `pnpm lint` | Lint with [lintroll](https://github.com/privatenumber/lintroll). |
| `pnpm record-releases` | Record unrecorded Node releases into the option history (downloads one binary per new release). |
| `pnpm generate` | Regenerate `src/flags.ts`, `docs/flags.json`, and the README flag table from the history. |

## Architecture

Two layers, both pinned to real Node behavior:

1. **Generated flags** (`scripts/generate-flags`). `pnpm record-releases` downloads every Node release since `engines.node` (every minor and patch, from the [release index](https://nodejs.org/dist/index.json), prereleases excluded) via [get-node](https://github.com/ehmicky/get-node) into a temporary directory. It spawns each with `--expose-internals` to dump its internal option schema (names, types, aliases, defaults, help text), adds implications extracted from that release's `src/node_options.cc`, and deletes the binary. The schemas are committed as change points in `scripts/generate-flags/history/node-options.json`. Released binaries are immutable, so a recorded release is never dumped again.

   `pnpm generate` reads only the history. It derives each flag's forms per release by *resolving probe arguments* through Node's alias, negation, implication, and argument-consumption rules, so a flag knows every spelling that affects it without hand-inverting Node's tables. Flags are emitted to `src/flags.ts`: a plain factory call when the option resolves the same on every release, or a `forVersion`-branched chain (via `flag/for-version.ts`) that switches on the exact release where it changed. Node changes options in minor and patch releases, so a per-major branch would be wrong inside a major.

   The export set is every option name that any recorded release registers as a readable option, so an export exists while a supported release accepts its name. A name that a later release turned into an alias (a rename) reads through its target there, and is re-exported as the same `Flag` when both resolve identically. See [notes/get-option-value/version-model.md](./notes/get-option-value/version-model.md) for the rationale and rejected alternatives.

   This data is generated rather than read from the running process because Node exposes no public API for it: `process.allowedNodeEnvironmentFlags` is names-only, and the internal binding needs `--expose-internals`, reachable only by re-spawning Node.

2. **A slim scanner** (`src/scanner.ts`). At runtime, `getOptionValue` scans `NODE_OPTIONS` (tokenized like Node) and `process.execArgv` for the forms that affect one flag, folding them into its value. It doesn't re-parse the whole command line — because the process already booted, every `--flag`/`--flag=…` token is a real occurrence (space-form values never start with `-`; `=` values are glued), so a targeted scan is exact. This keeps the runtime tiny and lets unused flags and converters drop out of a bundle.

### Form encoding

Each flag stores its command-line spellings as `[match, mode]` tuples (see `src/types.ts`):

- `match` is the literal normalized token — including the `--no-…` spelling for negations, so the scanner matches by plain string comparison.
- `mode` is an effect: `0` consume a value, `1` set `true`, `2` set `false`,
  `3` consume a value only in the `--name=value` spelling, and `4`/`5` use
  a fixed alias value (any spelling / `=`-only respectively).

## Fidelity

Behaviors preserved, anchored to [`v24.15.0`](https://github.com/nodejs/node/blob/v24.15.0/src/node_options-inl.h):

- Alias expansion to a fixpoint with multi-token synthetics ([L382-L412](https://github.com/nodejs/node/blob/v24.15.0/src/node_options-inl.h#L382-L412))
- Implications incl. negated forms ([L423-L439](https://github.com/nodejs/node/blob/v24.15.0/src/node_options-inl.h#L423-L439))
- `--no-` negation and boolean last-wins ([L375-L380](https://github.com/nodejs/node/blob/v24.15.0/src/node_options-inl.h#L375-L380))
- Underscore normalization ([L369-L373](https://github.com/nodejs/node/blob/v24.15.0/src/node_options-inl.h#L369-L373))
- Value consumption with `\-` escapes ([L454-L478](https://github.com/nodejs/node/blob/v24.15.0/src/node_options-inl.h#L454-L478))
- `integer`/`uinteger` C semantics ([L489-L494](https://github.com/nodejs/node/blob/v24.15.0/src/node_options-inl.h#L489-L494))
- `hostPort` splitting/merge into a null-prototype object ([node_options.cc L1429-L1470](https://github.com/nodejs/node/blob/v24.15.0/src/node_options.cc#L1429-L1470), [L1674-L1688](https://github.com/nodejs/node/blob/v24.15.0/src/node_options.cc#L1674-L1688))
- The `NODE_OPTIONS` tokenizer ([node_options.cc L2086-L2126](https://github.com/nodejs/node/blob/v24.15.0/src/node_options.cc#L2086-L2126))
- `NODE_OPTIONS`-before-argv ordering ([node.cc L952-L967](https://github.com/nodejs/node/blob/v24.15.0/src/node.cc#L952-L967))
- `--abort-on-uncaught-exception` read back as a boolean ([node.cc L771-L777](https://github.com/nodejs/node/blob/v24.15.0/src/node.cc#L771-L777))

## Testing

Every flag is asserted against real Node, not hand-written expectations:

- **Full parity on pinned releases** (`tests/specs/flags.ts`): a child process compares `getOptionValue` against the internal options binding for *every* generated flag (~230), under defaults and representative flags. The releases are pinned by the generator in `docs/flags.json` (`testReleases`): the first release of every flag's version segment, so each emitted branch runs on a real binary, plus the newest release of each major. A new Node release can't change the matrix.
- **Scanner units** (`tests/specs/scanner.ts`): the fold behavior per value shape (accumulation, last-wins, `host:port` merge, `\-` escapes, `=`-only forms).
- **Derivation guards** (`tests/specs/derive-forms.ts`): the generate-time representability checks that reject forms the `[match, mode]` encoding can't express.
- **Tree-shaking** (`tests/specs/bundleable.ts`): bundling a two-flag consumer is asserted to drop the other flags and unused converters, then run standalone, with byte budgets.

## Regenerating flags

Run `pnpm generate` after any generator change, and commit the resulting `src/flags.ts`, `docs/flags.json`, and `README.md` together. The output is deterministic, so a re-run should be byte-identical. It needs no Node binaries.

New Node releases, including new majors, are recorded by the scheduled [Sync Node.js releases](./.github/workflows/sync-node-releases.yml) workflow. It runs `pnpm record-releases` and `pnpm generate`, then opens a PR. The PR title is `feat:` when exports were added, `fix:` when existing flags changed, and `chore:` when only the history changed. To record releases locally, run `pnpm record-releases` and then `pnpm generate`.

### Codegen invariants

Generation hard-errors (rather than emitting a subtly-wrong flag) on:

- **Type-enum drift** — the `OptionType` fingerprint no longer matches known options (checked on every recorded release).
- **Spelling-dependent effects** — the same flag resolves differently across its bare/space/`=` spellings, which one `[match, mode]` form can't represent.
- **`=`-only non-value effects** — an `=`-only spelling that isn't a plain value consumer.
- **Read-set drift** — an option that tools read to understand their own invocation (`--conditions`, `--import`, the `--inspect` family, …) drifts across releases. These flags must keep one shape on every release, so a drift needs an explicit decision, such as an `inexactBelow` entry in `emit.ts`.
- **Published type widening** — a regeneration adds a value shape to an existing export (for example `Flag<string[]>` becoming `Flag<string[]> | Flag<string>`), compared against the `factories` recorded in the committed `docs/flags.json`. That is a breaking change. Resolve it with an `inexactBelow` entry in `emit.ts`, which makes the flag read its newest shape below a release, or accept it in a major release.
- **Export-name collisions** — two option names map to the same camelCased export.

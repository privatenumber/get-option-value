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
| `pnpm generate` | Regenerate `src/flags.ts`, `docs/flags.json`, and the README flag table. |

## Architecture

Two layers, both pinned to real Node behavior:

1. **Generated flags** (`scripts/generate-flags`). For every supported major (18-26), the latest release is downloaded via [get-node](https://github.com/ehmicky/get-node) and spawned with `--expose-internals` to dump its internal option schema (names, types, aliases, defaults, help text), plus implications extracted from that version's `src/node_options.cc` (fetched from jsDelivr). It then derives each flag's forms by *resolving probe arguments* through Node's alias, negation, implication, and argument-consumption rules — so a flag knows every spelling that affects it, without hand-inverting Node's tables. Flags are emitted to `src/flags.ts`: a plain factory call when the option resolves the same on every major, or a `nodeMajor`-branched call (via `flag/for-major.ts`) when it drifts.

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

- **Full parity across 18-26** (`tests/specs/flags.ts`): a child process compares `getOptionValue` against the internal options binding for *every* generated flag (~190), under defaults and representative flags, on every supported major.
- **Scanner units** (`tests/specs/scanner.ts`): the fold behavior per value shape (accumulation, last-wins, `host:port` merge, `\-` escapes, `=`-only forms).
- **Derivation guards** (`tests/specs/derive-forms.ts`): the generate-time representability checks that reject forms the `[match, mode]` encoding can't express.
- **Tree-shaking** (`tests/specs/bundleable.ts`): bundling a two-flag consumer is asserted to drop the other flags and unused converters, then run standalone, with byte budgets.

## Regenerating flags

Run `pnpm generate` after any generator change, and commit the resulting `src/flags.ts`, `docs/flags.json`, and `README.md` together. The output is deterministic — a re-run should be byte-identical.

When a **new Node major** ships:

1. Add it to the `majors` array in `scripts/generate-flags/index.ts`.
2. Add it to the `majors` array in `tests/specs/flags.ts`.
3. Run `pnpm generate` and `pnpm test`.

### Codegen invariants

Generation hard-errors (rather than emitting a subtly-wrong flag) on:

- **Type-enum drift** — the `OptionType` fingerprint no longer matches known options.
- **Spelling-dependent effects** — the same flag resolves differently across its bare/space/`=` spellings, which one `[match, mode]` form can't represent.
- **`=`-only non-value effects** — an `=`-only spelling that isn't a plain value consumer.
- **Read-set drift** — an option that tools read to understand their own invocation (`--conditions`, `--import`, the `--inspect` family, …) drifts across majors, where a newest-major snapshot would be inexact.
- **Export-name collisions** — two option names map to the same camelCased export.

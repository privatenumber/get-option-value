---
name: get-option-value
description: Usage patterns and API reference for get-option-value, a type-safe, tree-shakable reader of Node.js CLI option values. Use when reading the current process's Node CLI flags, NODE_OPTIONS, or execArgv values with exact Node semantics, or when importing getOptionValue and its flags.
---

# get-option-value

Reads Node CLI option values in userland — the same values as `require('internal/options').getOptionValue()` (normally gated behind `--expose-internals`). Each option is a separate `Flag` import, so an app bundles only the flags it reads.

## Terminology

- **flag** — a command-line spelling descriptor imported from `get-option-value/flags` (e.g. `conditionsFlag`). Encodes every form affecting the option: canonical name, aliases (`-C`), `=`-forms, negation, implications.
- **option value** — what Node resolved the option to, returned by `getOptionValue`.

You pass a flag; you get back the option value.

## API

```ts
import { getOptionValue } from 'get-option-value'
import { conditionsFlag, addonsFlag, inspectPortFlag, maxHttpHeaderSizeFlag } from 'get-option-value/flags'

getOptionValue(conditionsFlag)       // string[] — accumulated NODE_OPTIONS then execArgv
getOptionValue(addonsFlag)           // boolean — true by default, false on --no-addons
getOptionValue(maxHttpHeaderSizeFlag) // number — real default (16384) when unset
getOptionValue(inspectPortFlag)      // { host, port } — null-prototype, e.g. { host: '127.0.0.1', port: 9229 }
```

- Flag export name = camelCased option name + `Flag`: `--inspect-brk` → `inspectBrkFlag`, `--import` → `importFlag` (the suffix keeps reserved words valid).
- Each flag is typed: `getOptionValue(conditionsFlag)` is `string[]`, `getOptionValue(titleFlag)` is `string | undefined`.
- For a `--no-<name>` check, negate the boolean: `!getOptionValue(addonsFlag)`.
- Exported types: `Flag`, `HostPort`.

## Semantics

- Value = real default + `process.env.NODE_OPTIONS` (env) then `process.execArgv` (cli), in Node's startup order.
- **Exact on every Node release since 18.0.0** (every minor and patch), including options whose type, default, or spelling changed within a major (e.g. `--env-file` became a list in 24.12.0 and 25.2.0, `--stack-trace-limit` became readable in 22.10.0) — each resolves correctly for the running release. Gaps: an option that doesn't exist on the running release reads a neighboring release's default instead of `undefined` (unobservable — that release can't boot with the option); `--experimental-loader` below 18.6.0 and `--allow-fs-read`/`--allow-fs-write` below 20.7.0 read `["x"]` where Node has `"x"`.
- Renamed options keep their export: `experimentalConfigFileFlag` is the same flag as `configFileFlag`.
- **Full fidelity**: alias expansion (`--inspect=host:port` → `--inspect-port` + `--inspect`), implications (`--inspect-brk` implies `--inspect`), underscore normalization (`--no_addons`), boolean last-wins, C numeric semantics, hostPort merge into a null-prototype object.
- **Tree-shakable**: importing `conditionsFlag` + `addonsFlag` bundles ~1 KB minified; the host:port / integer converters and other flags drop out. Ship unminified so consumers' bundlers can DCE (the package sets `sideEffects: false`).

## Gotchas

- **Values include defaults you never set**: `getOptionValue(addonsFlag)` is `true` in a plain process. To detect "was this passed", compare against a baseline, not truthiness.
- **hostPort is fully populated + null-prototype**: `{ host, port }` both present; `Object.getPrototypeOf` is `null` (like the binding). `.hasOwnProperty` throws — use `Object.hasOwn`.
- **`--abort-on-uncaught-exception`** is a V8 option that reads back as a boolean.
- Reading happens by scanning `NODE_OPTIONS`/`execArgv` on each call (no memoization); cache it yourself if reading hot.

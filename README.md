<!--mdeval
import { table, link, code, details } from 'md-pen';
import meta from './docs/flags.json' with { type: 'json' };

const flagsTable = details(
	`All ${meta.flags.length} flags`,
	table(meta.flags.map(flag => ({
		Flag: link(flag.url, code(flag.export)),
		Description: flag.description
			? `${code(flag.display ?? flag.option)} — ${flag.description}`
			: code(flag.display ?? flag.option),
	}))),
);
-->

# get-option-value [![Latest version](https://badgen.net/npm/v/get-option-value)](https://npm.im/get-option-value) [![npm downloads](https://badgen.net/npm/dm/get-option-value)](https://npm.im/get-option-value)

Type-safe, tree-shakable reader of Node.js CLI option values. Zero dependencies, zero config.

Node parses its CLI flags and `NODE_OPTIONS` in C++ before any JavaScript runs, and exposes the results internally via `require('internal/options').getOptionValue()` — reachable only with `--expose-internals`. This package gives you the same values in userland, one import per option so you only bundle what you read:

```ts
import { getOptionValue } from 'get-option-value'
import { conditionsFlag, addonsFlag, inspectPortFlag } from 'get-option-value/flags'

getOptionValue(conditionsFlag) // string[] — real default [] when unset
getOptionValue(addonsFlag) // boolean — true by default, false on --no-addons
getOptionValue(inspectPortFlag) // { host: string, port: number }
```

Each flag carries its own value type, so results are fully typed: `getOptionValue(conditionsFlag)` is `string[]`, `getOptionValue(addonsFlag)` is `boolean`.

## Install

```bash
npm install get-option-value
```

## Usage

You import a **flag** — a command-line *spelling* descriptor from `get-option-value/flags` — and pass it to `getOptionValue`, which returns the **option value** Node resolved for the current process.

```ts
import { getOptionValue } from 'get-option-value'
import { conditionsFlag, titleFlag, inspectPortFlag } from 'get-option-value/flags'

// string[] — accumulates NODE_OPTIONS then execArgv, e.g.
// NODE_OPTIONS='--conditions=a' node -C b app.js → ['a', 'b']
getOptionValue(conditionsFlag)

// string | undefined — last value wins (a number flag returns its real
// default when unset, e.g. maxHttpHeaderSizeFlag → 16384)
getOptionValue(titleFlag)

// { host: string, port: number } — a null-prototype object like the binding;
// set by --inspect-port, --inspect=host:port, and the --inspect-brk family
getOptionValue(inspectPortFlag)
```

The value is computed from the option's real default plus `process.env.NODE_OPTIONS` and `process.execArgv`, applied in [the order Node applies them at startup](https://github.com/nodejs/node/blob/v24.15.0/src/node.cc#L952-L967). A few options also start from an environment variable that Node reads before parsing, and the flag reads it too: `NODE_PENDING_DEPRECATION`, `NODE_PRESERVE_SYMLINKS`, `NODE_PRESERVE_SYMLINKS_MAIN`, `NODE_REDIRECT_WARNINGS`, `NODE_USE_ENV_PROXY`, `NODE_USE_SYSTEM_CA`, and `NODE_ICU_DATA`, on the releases that read them ([source](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L2528-L2546)).

- **Naming** — a flag is the camelCased option name plus a `Flag` suffix: `--inspect-brk` → `inspectBrkFlag`, `--import` → `importFlag`.
- **Negation** — booleans are read directly; for a `--no-<name>` check, negate the value: `!getOptionValue(addonsFlag)`.
- **Types** — `Flag` and `HostPort` are exported for annotations.

## Flags

One flag is exported per readable Node CLI option. Each links to its definition in Node's source.

<!--mdeval block(flagsTable)-->
<details>
<summary>All 232 flags</summary>

| Flag | Description |
| - | - |
| [`abortOnUncaughtExceptionFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1535) | `--abort-on-uncaught-exception` — aborting instead of exiting causes a core file to be generated for analysis |
| [`addonsFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L995) | `--no-addons` — disable loading native addons |
| [`allowAddonsFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L882) | `--allow-addons` — allow use of addons when any permissions are set |
| [`allowChildProcessFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L888) | `--allow-child-process` — allow use of child process when any permissions are set |
| [`allowFfiFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L895) | `--allow-ffi` — allow use of FFI when any permissions are set |
| [`allowFsReadFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L866) | `--allow-fs-read` — allow permissions to read the filesystem |
| [`allowFsVfsFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L876) | `--allow-fs-vfs` — allow mounting a virtual file system when any permissions are set |
| [`allowFsWriteFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L871) | `--allow-fs-write` — allow permissions to write in the filesystem |
| [`allowInspectorFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L902) | `--allow-inspector` — allow use of inspector when any permissions are set |
| [`allowNetFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L908) | `--allow-net` — allow use of network when any permissions are set |
| [`allowOpensslStoreFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L931) | `--allow-openssl-store` — allow use of OpenSSL STORE loaders when any permissions are set |
| [`allowWasiFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L914) | `--allow-wasi` — allow wasi when any permissions are set |
| [`allowWorkerFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L920) | `--allow-worker` — allow worker threads when any permissions are set |
| [`asyncContextFrameFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L946) | `--no-async-context-frame` — Improve AsyncLocalStorage performance with AsyncContextFrame |
| [`benchFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1129) | `--bench` — launch benchmark runner on startup |
| [`benchIsolationFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1136) | `--bench-isolation` — configures the type of benchmark isolation used in the benchmark runner |
| [`benchNamePatternFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1143) | `--bench-name-pattern` — run benchmarks whose name matches this regular expression |
| [`benchReporterFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1149) | `--bench-reporter` — report benchmark output using the given reporter |
| [`benchReporterDestinationFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1155) | `--bench-reporter-destination` — report the given benchmark reporter to the given destination |
| [`benchSamplesFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1162) | `--bench-samples` — specify the number of measured benchmark samples |
| [`benchWarmupFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1171) | `--bench-warmup` — specify the number of unreported benchmark warmup samples |
| [`buildSeaFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1820) | `--build-sea` — Build a Node.js single executable application |
| [`buildSnapshotFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1598) | `--build-snapshot` — Generate a snapshot blob when the process exits. |
| [`buildSnapshotConfigFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1602) | `--build-snapshot-config` — Generate a snapshot blob when the process exits using aJSON configuration in the specified path. |
| [`checkFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1433) | `--check` — syntax check script without executing |
| [`completionBashFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1661) | `--completion-bash` — print source-able bash completion script |
| [`conditionsFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L678) | `--conditions` — additional user conditions for conditional exports and imports |
| [`configFileFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1118) | `--config-file` — set config file path |
| [`cpuProfFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1045) | `--cpu-prof` — Start the V8 CPU profiler on start up, and write the CPU profile to disk before exit. If --cpu-prof-dir is not specified, write the profile to the current working directory. |
| [`cpuProfDirFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1061) | `--cpu-prof-dir` — Directory where the V8 profiles generated by --cpu-prof will be placed. Does not affect --prof. |
| [`cpuProfIntervalFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1056) | `--cpu-prof-interval` — specified sampling interval in microseconds for the V8 CPU profile generated with --cpu-prof. (default: 1000) |
| [`cpuProfNameFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1051) | `--cpu-prof-name` — specified file name of the V8 CPU profile generated with --cpu-prof |
| [`debugFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L646) | `--debug` |
| [`debugArraybufferAllocationsFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1637) | `--debug-arraybuffer-allocations` |
| [`debugBrkFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L648) | `--debug-brk` |
| [`deprecationFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L979) | `--no-deprecation` — silence deprecation warnings |
| [`diagnosticDirFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L707) | `--diagnostic-dir` — set dir for all output files (default: current working directory) |
| [`disableProtoFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1641) | `--disable-proto` — disable Object.prototype.__proto__ |
| [`disableSigusr1Flag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L712) | `--disable-sigusr1` — Disable inspector thread to be listening for SIGUSR1 signal |
| [`disableWarningFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1010) | `--disable-warning` — silence specific process warnings |
| [`disableWasmTrapHandlerFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1812) | `--disable-wasm-trap-handler` — Disable trap-handler-based WebAssembly bound checks. V8 will insert inline bound checks when compiling WebAssembly which may slow down performance. |
| [`dnsResultOrderFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L717) | `--dns-result-order` — set default value of verbatim in dns.lookup. Options are 'ipv4first' (IPv4 addresses are placed before IPv6 addresses) 'ipv6first' (IPv6 addresses are placed before IPv4 addresses) 'verbatim' (addresses are in the order the DNS resolver returned) |
| [`enableFipsFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1738) | `--enable-fips` — enable FIPS crypto at startup |
| [`enableFipsIndicatorEventsFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1742) | `--enable-fips-indicator-events` — publish FIPS indicator results to the crypto.fips.indicator diagnostics channel |
| [`enableNetworkFamilyAutoselectionFlag`](https://github.com/nodejs/node/blob/v19.9.0/src/node_options.cc#L361) | `--enable-network-family-autoselection` — Enable network address family autodetection algorithm |
| [`enableSourceMapsFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L737) | `--enable-source-maps` — Source Map V3 support for stack traces |
| [`entryUrlFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L741) | `--entry-url` — Treat the entrypoint as a URL |
| [`envFileFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1110) | `--env-file` — set environment variables from supplied file |
| [`envFileIfExistsFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1114) | `--env-file-if-exists` — set environment variables from supplied file |
| [`evalFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1444) | `--eval` — evaluate script |
| [`experimentalAddonModulesFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L745) | `--no-experimental-addon-modules` — experimental import support for addons |
| [`experimentalAsyncContextFrameFlag`](https://github.com/nodejs/node/blob/v23.11.1/src/node_options.cc#L529) | `--experimental-async-context-frame` — Improve AsyncLocalStorage performance with AsyncContextFrame |
| [`experimentalBenchFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L749) | `--experimental-bench` — experimental node:bench module and benchmark runner |
| [`experimentalConfigFileFlag`](https://github.com/nodejs/node/blob/v26.11.1/src/node_options.cc#L1118) | `--experimental-config-file` — set config file path |
| [`experimentalDefaultConfigFileFlag`](https://github.com/nodejs/node/blob/v26.0.0/src/node_options.cc#L890) | `--experimental-default-config-file` — set config file from default config file |
| [`experimentalDefaultTypeFlag`](https://github.com/nodejs/node/blob/v23.3.0/src/node_options.cc#L763) | `--experimental-default-type` — set module system to use by default |
| [`experimentalDetectModuleFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L683) | `--no-experimental-detect-module` — when ambiguous modules fail to evaluate because they contain ES module syntax, try again to evaluate them as ES modules |
| [`experimentalEventsourceFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L754) | `--experimental-eventsource` — experimental EventSource API |
| [`experimentalFetchFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L759) | `--experimental-fetch` |
| [`experimentalFfiFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L761) | `--no-experimental-ffi` — experimental node:ffi module |
| [`experimentalGlobalCustomeventFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L777) | `--experimental-global-customevent` |
| [`experimentalGlobalNavigatorFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L832) | `--no-experimental-global-navigator` — expose experimental Navigator API on the global scope |
| [`experimentalGlobalWebcryptoFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L837) | `--experimental-global-webcrypto` |
| [`experimentalImportMetaResolveFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L851) | `--experimental-import-meta-resolve` — experimental ES Module import.meta.resolve() parentURL support |
| [`experimentalImportTextFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L846) | `--experimental-import-text` — experimental support for importing source as text with import attributes |
| [`experimentalInspectorNetworkResourceFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1075) | `--experimental-inspector-network-resource` — experimental load network resources via the inspector |
| [`experimentalLoaderFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L839) | `--experimental-loader` — use the specified module as a custom loader |
| [`experimentalNetworkImportsFlag`](https://github.com/nodejs/node/blob/v22.5.1/src/node_options.cc#L450) | `--experimental-network-imports` — experimental https: support for the ES Module loader |
| [`experimentalNetworkInspectionFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1066) | `--experimental-network-inspection` — experimental network inspection support |
| [`experimentalPackageMapFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1124) | `--experimental-package-map` — use the specified file for package map resolution |
| [`experimentalPermissionFlag`](https://github.com/nodejs/node/blob/v23.4.0/src/node_options.cc#L454) | `--experimental-permission` — enable the permission system |
| [`experimentalPolicyFlag`](https://github.com/nodejs/node/blob/v22.1.0/src/node_options.cc#L448) | `--experimental-policy` — use the specified file as a security policy |
| [`experimentalPrintRequiredTlaFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L689) | `--experimental-print-required-tla` — Print pending top-level await. If --require-module is true, evaluate asynchronous graphs loaded by `require()` but do not run the microtasks, in order to find and print top-level await in the graph |
| [`experimentalQuicFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L813) | `--experimental-quic` |
| [`experimentalReplAwaitFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L926) | `--no-experimental-repl-await` — experimental await keyword support in REPL |
| [`experimentalRequireModuleFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L701) | `--no-experimental-require-module` — Legacy alias for --require-module |
| [`experimentalSeaConfigFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1804) | `--experimental-sea-config` — Generate a blob that can be embedded into the single executable application |
| [`experimentalShadowRealmFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1590) | `--experimental-shadow-realm` |
| [`experimentalSpecifierResolutionFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L975) | `--experimental-specifier-resolution` |
| [`experimentalSqliteFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L778) | `--no-experimental-sqlite` — experimental node:sqlite module |
| [`experimentalStorageInspectionFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1069) | `--experimental-storage-inspection` — experimental storage inspection support |
| [`experimentalStreamIterFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L783) | `--experimental-stream-iter` — experimental iterable streams API (node:stream/iter) |
| [`experimentalStripTypesFlag`](https://github.com/nodejs/node/blob/v25.1.0/src/node_options.cc#L1074) | `--no-experimental-strip-types` — Experimental type-stripping for TypeScript files. |
| [`experimentalTestCoverageFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1207) | `--experimental-test-coverage` — enable code coverage in the test runner |
| [`experimentalTestIsolationFlag`](https://github.com/nodejs/node/blob/v23.5.0/src/node_options.cc#L687) | `--experimental-test-isolation` — configures the type of test isolation used in the test runner |
| [`experimentalTestModuleMocksFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1235) | `--experimental-test-module-mocks` — enable module mocking in the test runner |
| [`experimentalTestSnapshotsFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1241) | `--experimental-test-snapshots` |
| [`experimentalTestTagFilterFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1277) | `--experimental-test-tag-filter` — run tests matching the given tag filter expression |
| [`experimentalTopLevelAwaitFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1588) | `--experimental-top-level-await` |
| [`experimentalTransformTypesFlag`](https://github.com/nodejs/node/blob/v25.9.0/src/node_options.cc#L1157) | `--experimental-transform-types` — enable transformation of TypeScript-onlysyntax into JavaScript code |
| [`experimentalVfsFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L796) | `--experimental-vfs` — experimental node:vfs module |
| [`experimentalVmModulesFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L937) | `--experimental-vm-modules` — experimental ES Module support in vm module |
| [`experimentalWasiUnstablePreview1Flag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L943) | `--experimental-wasi-unstable-preview1` |
| [`experimentalWasmModulesFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L845) | `--experimental-wasm-modules` |
| [`experimentalWebWorkerFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L767) | `--experimental-web-worker` — experimental Web Worker API |
| [`experimentalWebsocketFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L772) | `--no-experimental-websocket` — experimental WebSocket API |
| [`experimentalWebstorageFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L822) | `--no-experimental-webstorage` — experimental Web Storage API |
| [`experimentalWorkerInspectionFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1072) | `--experimental-worker-inspection` — experimental worker inspection support |
| [`exposeInternalsFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L951) | `--expose-internals` |
| [`extraInfoOnFatalExceptionFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1391) | `--no-extra-info-on-fatal-exception` — hide extra information on fatal exception that causes exit |
| [`forceAsyncHooksChecksFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L984) | `--no-force-async-hooks-checks` — disable checks for async_hooks |
| [`forceContextAwareFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1014) | `--force-context-aware` — disable loading non-context-aware addons |
| [`forceFipsFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1747) | `--force-fips` — force FIPS crypto (optional mode: provider or strict) |
| [`forceNodeApiUncaughtExceptionsPolicyFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L989) | `--force-node-api-uncaught-exceptions-policy` — enforces 'uncaughtException' event on Node API asynchronous callbacks |
| [`frozenIntrinsicsFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L952) | `--frozen-intrinsics` — experimental frozen intrinsics support |
| [`globalSearchPathsFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1000) | `--no-global-search-paths` — disable global module search paths |
| [`heapProfFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1078) | `--heap-prof` — Start the V8 heap profiler on start up, and write the heap profile to disk before exit. If --heap-prof-dir is not specified, write the profile to the current working directory. |
| [`heapProfDirFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1090) | `--heap-prof-dir` — Directory where the V8 heap profiles generated by --heap-prof will be placed. |
| [`heapProfIntervalFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1095) | `--heap-prof-interval` — specified sampling interval in bytes for the V8 heap profile generated with --heap-prof. (default: 512 * 1024) |
| [`heapProfNameFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1085) | `--heap-prof-name` — specified file name of the V8 heap profile generated with --heap-prof |
| [`heapsnapshotNearHeapLimitFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L960) | `--heapsnapshot-near-heap-limit` — Generate heap snapshots whenever V8 is approaching the heap limit. No more than the specified number of heap snapshots will be generated. |
| [`heapsnapshotSignalFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L956) | `--heapsnapshot-signal` — Generate heap snapshot on specified signal |
| [`helpFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1664) | `--help` — print node command line options |
| [`icuDataDirFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1696) | `--icu-data-dir` — set ICU data load path to dir (overrides NODE_ICU_DATA) (note: linked-in ICU data is present) |
| [`importFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1457) | `--import` — ES module to preload (option can be repeated) |
| [`inputTypeFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L971) | `--input-type` — set module type for string input |
| [`insecureHttpParserFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L967) | `--insecure-http-parser` — use an insecure HTTP parser that accepts invalid HTTP headers |
| [`inspectFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L640) | `--inspect` — activate inspector on host:port (default: 127.0.0.1:9229) |
| [`inspectBrkFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L651) | `--inspect-brk` — activate inspector on host:port and break at start of user script |
| [`inspectBrkNodeFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L658) | `--inspect-brk-node` |
| [`inspectPortFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L634) | `--inspect-port` — set host:port for inspector |
| [`inspectPublishUidFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L670) | `--inspect-publish-uid` — comma separated list of destinations for inspector uid(default: stderr,http) |
| [`inspectWaitFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L662) | `--inspect-wait` — activate inspector on host:port and wait for debugger to be attached |
| [`interactiveFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1467) | `--interactive` — always enter the REPL even if stdin does not appear to be a terminal |
| [`localstorageFileFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L828) | `--localstorage-file` — file used to persist localStorage data |
| [`maxHttpHeaderSizeFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1101) | `--max-http-header-size` — set the maximum size of HTTP headers (default: 16384 (16KB)) |
| [`maxOldSpaceSizePercentageFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1546) | `--max-old-space-size-percentage` — set V8's max old space size as a percentage of available memory (e.g., '50%'). Takes precedence over --max-old-space-size. |
| [`networkFamilyAutoselectionFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L725) | `--no-network-family-autoselection` — Disable network address family autodetection algorithm |
| [`networkFamilyAutoselectionAttemptTimeoutFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L730) | `--network-family-autoselection-attempt-timeout` — Sets the default value for the network family autoselection attempt timeout. |
| [`nodeSnapshotFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1645) | `--no-node-snapshot` |
| [`opensslConfigFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1707) | `--openssl-config` — load OpenSSL configuration from the specified file (overrides OPENSSL_CONF) |
| [`opensslLegacyProviderFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1768) | `--openssl-legacy-provider` — enable OpenSSL 3.0 legacy provider |
| [`opensslSharedConfigFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1772) | `--openssl-shared-config` — enable OpenSSL shared configuration |
| [`pendingDeprecationFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1018) | `--pending-deprecation` — emit pending deprecation warnings |
| [`permissionFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L855) | `--permission` — enable the permission system |
| [`permissionAuditFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L861) | `--permission-audit` — enable audit only for the permission system |
| [`policyIntegrityFlag`](https://github.com/nodejs/node/blob/v22.1.0/src/node_options.cc#L456) | `--policy-integrity` — ensure the security policy contents match the specified integrity |
| [`preserveSymlinksFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1028) | `--preserve-symlinks` — preserve symbolic links when resolving |
| [`preserveSymlinksMainFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1032) | `--preserve-symlinks-main` — preserve symbolic links when resolving the main module |
| [`printFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1446) | `--print` — evaluate script and print result |
| [`processTimeoutFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1790) | `--process-timeout` — print why the process is still running and exit with code 124 if it has not exited after the given duration (e.g. 30s) |
| [`profProcessFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1039) | `--prof-process` — process V8 profiler output generated using --prof |
| [`redirectWarningsFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1105) | `--redirect-warnings` — write warnings to file instead of stderr |
| [`reportCompactFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1672) | `--report-compact` — output compact single-line JSON |
| [`reportDirFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1676) | `--report-dir` — define custom report pathname. (default: current working directory) |
| [`reportExcludeEnvFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1509) | `--report-exclude-env` — Exclude environment variables when generating report (default: false) |
| [`reportExcludeNetworkFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1514) | `--report-exclude-network` — exclude network interface diagnostics. (default: false) |
| [`reportFilenameFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1682) | `--report-filename` — define custom report file name. (default: YYYYMMDD.HHMMSS.PID.SEQUENCE#.txt) |
| [`reportOnFatalerrorFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1687) | `--report-on-fatalerror` — generate diagnostic report on fatal (internal) errors |
| [`reportOnProcessTimeoutFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1691) | `--report-on-process-timeout` — generate diagnostic report when --process-timeout expires |
| [`reportOnSignalFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1573) | `--report-on-signal` — generate diagnostic report upon receiving signals |
| [`reportSignalFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1577) | `--report-signal` — causes diagnostic report to be produced on provided signal, unsupported in Windows. (default: SIGUSR2) |
| [`reportUncaughtExceptionFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1569) | `--report-uncaught-exception` — generate diagnostic report on uncaught exceptions |
| [`requireFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1452) | `--require` — CommonJS module to preload (option can be repeated) |
| [`requireModuleFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L696) | `--no-require-module` — Allow loading synchronous ES Modules in require(). |
| [`runFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1809) | `--run` — Run a script specified in package.json |
| [`secureHeapFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1757) | `--secure-heap` — total size of the OpenSSL secure heap |
| [`secureHeapMinFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1761) | `--secure-heap-min` — minimum allocation size from the OpenSSL secure heap |
| [`securityRevertFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1659) | `--security-revert` |
| [`snapshotBlobFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1649) | `--snapshot-blob` — Path to the snapshot blob that's either the result of snapshotbuilding, or the blob that is used to restore the application state |
| [`stackTraceLimitFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1557) | `--stack-trace-limit` |
| [`stripTypesFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1461) | `--no-strip-types` — Type-stripping for TypeScript files. |
| [`testFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1179) | `--test` — launch test runner on startup |
| [`testConcurrencyFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1185) | `--test-concurrency` — specify test runner concurrency |
| [`testCoverageBranchesFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1213) | `--test-coverage-branches` — the branch coverage minimum threshold |
| [`testCoverageExcludeFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1294) | `--test-coverage-exclude` — exclude files from coverage report that match this glob pattern |
| [`testCoverageFunctionsFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1218) | `--test-coverage-functions` — the function coverage minimum threshold |
| [`testCoverageIncludeFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1282) | `--test-coverage-include` — include files in coverage report that match this glob pattern |
| [`testCoverageIncludeAllFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1287) | `--test-coverage-include-all` — include source files that were never loaded in the coverage report |
| [`testCoverageLinesFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1223) | `--test-coverage-lines` — the line coverage minimum threshold |
| [`testForceExitFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1190) | `--test-force-exit` — force test runner to exit upon completion |
| [`testGlobalSetupFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1299) | `--test-global-setup` — specifies the path to the global setup file |
| [`testIsolationFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1228) | `--test-isolation` — configures the type of test isolation used in the test runner |
| [`testNamePatternFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1246) | `--test-name-pattern` — run tests whose name matches this regular expression |
| [`testOnlyFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1261) | `--test-only` — run tests with 'only' option set |
| [`testRandomSeedFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1311) | `--test-random-seed` — seed used to randomize test execution order |
| [`testRandomizeFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1304) | `--test-randomize` — run tests in a random order |
| [`testReporterFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1251) | `--test-reporter` — report test output using the given reporter |
| [`testReporterDestinationFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1256) | `--test-reporter-destination` — report given reporter to the given destination |
| [`testRerunFailuresFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1317) | `--test-rerun-failures` — specifies the path to the rerun state file |
| [`testShardFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1267) | `--test-shard` — run test at specific shard |
| [`testSkipPatternFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1272) | `--test-skip-pattern` — run tests whose name do not match this regular expression |
| [`testTimeoutFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1196) | `--test-timeout` — specify test runner timeout |
| [`testUdpNoTrySendFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1322) | `--test-udp-no-try-send` |
| [`testUpdateSnapshotsFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1201) | `--test-update-snapshots` — regenerate test snapshots |
| [`throwDeprecationFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1326) | `--throw-deprecation` — throw an exception on deprecations |
| [`titleFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1614) | `--title` — the process title to use on startup |
| [`tlsCipherListFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1712) | `--tls-cipher-list` — use an alternative default TLS cipher list |
| [`tlsKeylogFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1475) | `--tls-keylog` — log TLS decryption keys to named file for traffic analysis |
| [`tlsMaxV12Flag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1496) | `--tls-max-v1.2` — set default TLS maximum to TLSv1.2 (default: TLSv1.3) |
| [`tlsMaxV13Flag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1504) | `--tls-max-v1.3` — set default TLS maximum to TLSv1.3 (default: TLSv1.3) |
| [`tlsMinV10Flag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1480) | `--tls-min-v1.0` — set default TLS minimum to TLSv1.0 (default: TLSv1.2) |
| [`tlsMinV11Flag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1484) | `--tls-min-v1.1` — set default TLS minimum to TLSv1.1 (default: TLSv1.2) |
| [`tlsMinV12Flag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1488) | `--tls-min-v1.2` — set default TLS minimum to TLSv1.2 (default: TLSv1.2) |
| [`tlsMinV13Flag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1492) | `--tls-min-v1.3` — set default TLS minimum to TLSv1.3 (default: TLSv1.2) |
| [`traceAtomicsWaitFlag`](https://github.com/nodejs/node/blob/v22.23.4/src/node_options.cc#L830) | `--trace-atomics-wait` — (deprecated) trace Atomics.wait() operations |
| [`traceDeprecationFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1330) | `--trace-deprecation` — show stack traces on deprecations |
| [`traceEnvFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1360) | `--trace-env` — Print accesses to the environment variables |
| [`traceEnvJsStackFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1366) | `--trace-env-js-stack` — Print accesses to the environment variables and the JavaScript stack trace |
| [`traceEnvNativeStackFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1371) | `--trace-env-native-stack` — Print accesses to the environment variables and the native stack trace |
| [`traceEventCategoriesFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1618) | `--trace-event-categories` — comma separated list of trace event categories to record |
| [`traceEventFilePatternFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1622) | `--trace-event-file-pattern` — Template string specifying the filepath for the trace-events data, it supports ${rotation} and ${pid}. |
| [`traceExitFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1334) | `--trace-exit` — show stack trace when an environment exits |
| [`tracePromisesFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1355) | `--trace-promises` — show stack traces on promise initialization and resolution |
| [`traceRequireModuleFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1384) | `--trace-require-module` — Print access to require(esm). Options are 'all' (print all usage) and 'no-node-modules' (excluding usage from the node_modules folder) |
| [`traceSigintFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1785) | `--trace-sigint` — enable printing JavaScript stacktrace on SIGINT |
| [`traceSyncIoFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1338) | `--trace-sync-io` — show stack trace when use of sync IO is detected after the first tick |
| [`traceTlsFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1343) | `--trace-tls` — prints TLS packet trace information to stderr |
| [`traceUncaughtFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1347) | `--trace-uncaught` — show stack traces for the `throw` behind uncaught exceptions |
| [`traceWarningsFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1351) | `--trace-warnings` — show stack traces on process warnings |
| [`trackHeapObjectsFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1529) | `--track-heap-objects` — track heap object allocations for heap snapshots |
| [`unhandledRejectionsFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1396) | `--unhandled-rejections` — define unhandled rejections behavior. Options are 'strict' (always raise an error), 'throw' (raise an error unless 'unhandledRejection' hook is set), 'warn' (log a warning), 'none' (silence warnings), 'warn-with-error-code' (log a warning and set exit code 1 unless 'unhandledRejection' hook is set). (default: throw) |
| [`updateAssertSnapshotFlag`](https://github.com/nodejs/node/blob/v19.4.0/src/node_options.cc#L660) | `--update-assert-snapshot` — update assert snapshot files |
| [`useBundledCaFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1724) | `--use-bundled-ca` — use bundled CA store (default) |
| [`useEnvProxyFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1022) | `--use-env-proxy` — parse proxy settings from HTTP_PROXY/HTTPS_PROXY/NO_PROXYenvironment variables and apply the setting in global HTTP/HTTPS clients |
| [`useLargepagesFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1778) | `--use-largepages` — This option is no longer supported and a no-op. It still accepts these values for compatibility: 'off' (default), 'on' (report a warning to stderr), or 'silent' (same as 'off'). |
| [`useOpensslCaFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1716) | `--use-openssl-ca` — use OpenSSL's default CA store |
| [`useSystemCaFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1378) | `--use-system-ca` — use system's CA store |
| [`v8OptionsFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1669) | `--v8-options` — print V8 command line options |
| [`v8PoolSizeFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1629) | `--v8-pool-size` — set V8's thread pool size |
| [`verifyBaseObjectsFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1405) | `--verify-base-objects` |
| [`versionFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1667) | `--version` — print Node.js version |
| [`vfsLoadFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L805) | `--vfs-load` — mount a directory or archive as a virtual file system and run the entry point and module resolution against it instead of the real file system (may be given once; requires --experimental-vfs) |
| [`vfsMountFlag`](https://github.com/nodejs/node/blob/v26.10.0/src/node_options.cc#L702) | `--vfs-mount` — mount a directory or archive as a virtual file system (option can be repeated; requires --experimental-vfs) |
| [`warningsFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1005) | `--no-warnings` — silence all process warnings |
| [`watchFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1409) | `--watch` — run in watch mode |
| [`watchKillSignalFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1420) | `--watch-kill-signal` — kill signal to send to the process on watch mode restarts(default: SIGTERM) |
| [`watchPathFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1415) | `--watch-path` — path to watch |
| [`watchPreserveOutputFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1426) | `--watch-preserve-output` — preserve outputs on watch mode restart |
| [`webstorageFlag`](https://github.com/nodejs/node/blob/v25.2.0/src/node_options.cc#L570) | `--no-webstorage` — Web Storage API |
| [`workerSnapshotFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1523) | `--no-worker-snapshot` — start worker threads from the bootstrapped context in the built-in startup snapshot |
| [`zeroFillBuffersFlag`](https://github.com/nodejs/node/blob/v26.13.0/src/node_options.cc#L1633) | `--zero-fill-buffers` — automatically zero-fill all newly allocated Buffer instances |

</details>
<!--/mdeval-->

## FAQ

### How does it work?

Two layers, both pinned to real Node behavior. A recorder downloads every Node release since 18.0.0 (every minor and patch, not one per major), dumps its internal option schema with `--expose-internals`, and commits it as a per-release history. A build step bakes a per-option descriptor into `src/flags.ts` — every spelling that affects the option (aliases, `=`-forms, negation, implications), derived by resolving probe arguments through Node's parsing rules (aliases, negation, implications) rather than hand-inverting its tables. At runtime, a slim scanner reads `NODE_OPTIONS` and `process.execArgv` (and the option's environment variable, if it has one) for just the flag you asked about. See [CONTRIBUTING.md](https://github.com/privatenumber/get-option-value/blob/develop/CONTRIBUTING.md) for the full architecture.

### How accurate is it?

Exact on every Node release from 18.0.0 through the newest recorded release, verified against the real internal binding for *every* flag on pinned releases: the fewest releases that run every version branch where its option exists, plus the newest release of each major. Node changes options in minor and patch releases, not only in majors: `--env-file` became a list in 24.12.0 and 25.2.0, and type stripping was enabled by default in 22.18.0. So each flag that changed branches on the exact release where it changed. A scheduled job records new Node releases and opens a PR.

Known gaps:
- An option that doesn't exist on the running release (newer, or removed) returns a neighboring release's default, where Node's binding returns `undefined`. Don't use the value to detect whether the running Node supports an option. A renamed option is the exception: its old and new exports read the same option on every release.
- Three flags keep their published `string[]` type on old EOL releases where Node stored a single string: `--experimental-loader` below 18.6.0, and `--allow-fs-read` / `--allow-fs-write` below 20.7.0. There they return every occurrence (`--allow-fs-read=/a --allow-fs-read=/b` gives `["/a", "/b"]`), where Node keeps only the last (`"/b"`).
- Options set in a Node config file ([`--config-file`](https://nodejs.org/download/release/v26.13.0/docs/api/cli.html)) aren't seen: Node applies them without adding them to `process.execArgv` or `NODE_OPTIONS`.
- A prerelease, or a release newer than the recorded history, reads the data of the newest recorded release at or below its version number (`27.0.0-alpha.0.0.0` reads as 27.0.0).
- The data comes from official Node builds. Runtimes that report a Node version, such as Deno, Bun, or Electron, can parse options differently.

A renamed option keeps its export, and both names read the same option on every release: `experimentalConfigFileFlag` is the same flag as `configFileFlag`, because Node 26.12.0 kept `--experimental-config-file` as an alias of `--config-file`.

### Why not just parse `process.execArgv` myself?

The details are subtle and easy to get wrong: alias expansion (`--inspect=` sets `--inspect-port` *and* `--inspect`), implications (`--inspect-brk` implies `--inspect`), underscore normalization (`--no_addons` ≡ `--no-addons`), negation with last-wins, value escapes (`\-`), space-form values (`--require ./file.js`), `host:port` splitting, and C numeric semantics (`atoll`, `strtoull`). This package encodes all of it, per option, verified against Node.

### Why generate the data instead of reading it at runtime?

Node exposes no public API for it: `process.allowedNodeEnvironmentFlags` is names-only (no types, arity, aliases, or defaults), and the internal binding needs `--expose-internals`, reachable only by re-spawning Node. Generating ahead of time keeps the runtime tiny and dependency-free.

### How big is my bundle?

Each flag is a separate export, so an app bundles only the flags it reads — the value converters (host:port, C-integer) and the other ~230 flags tree-shake away. A stable flag never pulls version detection into a bundle, so `import { conditionsFlag }` stays `process`-free and tree-shakes to ~1 KB.

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

The value is computed from the option's real default plus `process.env.NODE_OPTIONS` and `process.execArgv`, applied in [the order Node applies them at startup](https://github.com/nodejs/node/blob/v24.15.0/src/node.cc#L952-L967).

- **Naming** — a flag is the camelCased option name plus a `Flag` suffix: `--inspect-brk` → `inspectBrkFlag`, `--import` → `importFlag`.
- **Negation** — booleans are read directly; for a `--no-<name>` check, negate the value: `!getOptionValue(addonsFlag)`.
- **Types** — `Flag` and `HostPort` are exported for annotations.

## Flags

One flag is exported per readable Node CLI option. Each links to its definition in Node's source.

<!--mdeval block(flagsTable)-->
<details>
<summary>All 190 flags</summary>

| Flag | Description |
| - | - |
| [`abortOnUncaughtExceptionFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1265) | `--abort-on-uncaught-exception` — aborting instead of exiting causes a core file to be generated for analysis |
| [`addonsFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L787) | `--no-addons` — disable loading native addons |
| [`allowAddonsFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L680) | `--allow-addons` — allow use of addons when any permissions are set |
| [`allowChildProcessFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L686) | `--allow-child-process` — allow use of child process when any permissions are set |
| [`allowFfiFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L693) | `--allow-ffi` — allow use of FFI when any permissions are set |
| [`allowFsReadFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L670) | `--allow-fs-read` — allow permissions to read the filesystem |
| [`allowFsWriteFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L675) | `--allow-fs-write` — allow permissions to write in the filesystem |
| [`allowInspectorFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L700) | `--allow-inspector` — allow use of inspector when any permissions are set |
| [`allowNetFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L706) | `--allow-net` — allow use of network when any permissions are set |
| [`allowWasiFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L712) | `--allow-wasi` — allow wasi when any permissions are set |
| [`allowWorkerFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L718) | `--allow-worker` — allow worker threads when any permissions are set |
| [`asyncContextFrameFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L738) | `--no-async-context-frame` — Improve AsyncLocalStorage performance with AsyncContextFrame |
| [`buildSeaFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1537) | `--build-sea` — Build a Node.js single executable application |
| [`buildSnapshotFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1328) | `--build-snapshot` — Generate a snapshot blob when the process exits. |
| [`buildSnapshotConfigFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1332) | `--build-snapshot-config` — Generate a snapshot blob when the process exits using aJSON configuration in the specified path. |
| [`checkFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1168) | `--check` — syntax check script without executing |
| [`completionBashFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1391) | `--completion-bash` — print source-able bash completion script |
| [`conditionsFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L513) | `--conditions` — additional user conditions for conditional exports and imports |
| [`cpuProfFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L837) | `--cpu-prof` — Start the V8 CPU profiler on start up, and write the CPU profile to disk before exit. If --cpu-prof-dir is not specified, write the profile to the current working directory. |
| [`cpuProfDirFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L853) | `--cpu-prof-dir` — Directory where the V8 profiles generated by --cpu-prof will be placed. Does not affect --prof. |
| [`cpuProfIntervalFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L848) | `--cpu-prof-interval` — specified sampling interval in microseconds for the V8 CPU profile generated with --cpu-prof. (default: 1000) |
| [`cpuProfNameFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L843) | `--cpu-prof-name` — specified file name of the V8 CPU profile generated with --cpu-prof |
| [`debugFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L481) | `--debug` |
| [`debugArraybufferAllocationsFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1367) | `--debug-arraybuffer-allocations` |
| [`debugBrkFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L483) | `--debug-brk` |
| [`deprecationFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L771) | `--no-deprecation` — silence deprecation warnings |
| [`diagnosticDirFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L542) | `--diagnostic-dir` — set dir for all output files (default: current working directory) |
| [`disableProtoFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1371) | `--disable-proto` — disable Object.prototype.__proto__ |
| [`disableSigusr1Flag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L547) | `--disable-sigusr1` — Disable inspector thread to be listening for SIGUSR1 signal |
| [`disableWarningFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L802) | `--disable-warning` — silence specific process warnings |
| [`disableWasmTrapHandlerFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1529) | `--disable-wasm-trap-handler` — Disable trap-handler-based WebAssembly bound checks. V8 will insert inline bound checks when compiling WebAssembly which may slow down performance. |
| [`dnsResultOrderFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L552) | `--dns-result-order` — set default value of verbatim in dns.lookup. Options are 'ipv4first' (IPv4 addresses are placed before IPv6 addresses) 'ipv6first' (IPv6 addresses are placed before IPv4 addresses) 'verbatim' (addresses are in the order the DNS resolver returned) |
| [`enableFipsFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1469) | `--enable-fips` — enable FIPS crypto at startup |
| [`enableSourceMapsFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L572) | `--enable-source-maps` — Source Map V3 support for stack traces |
| [`entryUrlFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L576) | `--entry-url` — Treat the entrypoint as a URL |
| [`envFileFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L903) | `--env-file` — set environment variables from supplied file |
| [`envFileIfExistsFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L907) | `--env-file-if-exists` — set environment variables from supplied file |
| [`evalFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1179) | `--eval` — evaluate script |
| [`experimentalAddonModulesFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L580) | `--no-experimental-addon-modules` — experimental import support for addons |
| [`experimentalConfigFileFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L911) | `--experimental-config-file` — set config file path |
| [`experimentalDetectModuleFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L518) | `--no-experimental-detect-module` — when ambiguous modules fail to evaluate because they contain ES module syntax, try again to evaluate them as ES modules |
| [`experimentalEventsourceFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L585) | `--experimental-eventsource` — experimental EventSource API |
| [`experimentalFfiFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L592) | `--experimental-ffi` — experimental node:ffi module |
| [`experimentalGlobalNavigatorFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L636) | `--no-experimental-global-navigator` — expose experimental Navigator API on the global scope |
| [`experimentalImportMetaResolveFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L655) | `--experimental-import-meta-resolve` — experimental ES Module import.meta.resolve() parentURL support |
| [`experimentalImportTextFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L650) | `--experimental-import-text` — experimental support for importing source as text with import attributes |
| [`experimentalInspectorNetworkResourceFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L867) | `--experimental-inspector-network-resource` — experimental load network resources via the inspector |
| [`experimentalLoaderFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L643) | `--experimental-loader` — use the specified module as a custom loader |
| [`experimentalNetworkInspectionFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L858) | `--experimental-network-inspection` — experimental network inspection support |
| [`experimentalPackageMapFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L916) | `--experimental-package-map` — use the specified file for package map resolution |
| [`experimentalPrintRequiredTlaFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L524) | `--experimental-print-required-tla` — Print pending top-level await. If --require-module is true, evaluate asynchronous graphs loaded by `require()` but do not run the microtasks, in order to find and print top-level await in the graph |
| [`experimentalReplAwaitFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L724) | `--no-experimental-repl-await` — experimental await keyword support in REPL |
| [`experimentalRequireModuleFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L536) | `--no-experimental-require-module` — Legacy alias for --require-module |
| [`experimentalSeaConfigFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1521) | `--experimental-sea-config` — Generate a blob that can be embedded into the single executable application |
| [`experimentalShadowRealmFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1320) | `--experimental-shadow-realm` |
| [`experimentalSqliteFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L604) | `--no-experimental-sqlite` — experimental node:sqlite module |
| [`experimentalStorageInspectionFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L861) | `--experimental-storage-inspection` — experimental storage inspection support |
| [`experimentalStreamIterFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L609) | `--experimental-stream-iter` — experimental iterable streams API (node:stream/iter) |
| [`experimentalTestCoverageFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L948) | `--experimental-test-coverage` — enable code coverage in the test runner |
| [`experimentalTestModuleMocksFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L976) | `--experimental-test-module-mocks` — enable module mocking in the test runner |
| [`experimentalTestTagFilterFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1018) | `--experimental-test-tag-filter` — run tests matching the given tag filter expression |
| [`experimentalVfsFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L613) | `--experimental-vfs` — experimental node:vfs module |
| [`experimentalVmModulesFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L729) | `--experimental-vm-modules` — experimental ES Module support in vm module |
| [`experimentalWebsocketFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L598) | `--no-experimental-websocket` — experimental WebSocket API |
| [`experimentalWebstorageFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L626) | `--no-experimental-webstorage` — experimental Web Storage API |
| [`experimentalWorkerInspectionFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L864) | `--experimental-worker-inspection` — experimental worker inspection support |
| [`exposeInternalsFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L743) | `--expose-internals` |
| [`extraInfoOnFatalExceptionFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1126) | `--no-extra-info-on-fatal-exception` — hide extra information on fatal exception that causes exit |
| [`forceAsyncHooksChecksFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L776) | `--no-force-async-hooks-checks` — disable checks for async_hooks |
| [`forceContextAwareFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L806) | `--force-context-aware` — disable loading non-context-aware addons |
| [`forceFipsFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1473) | `--force-fips` — force FIPS crypto (cannot be disabled) |
| [`forceNodeApiUncaughtExceptionsPolicyFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L781) | `--force-node-api-uncaught-exceptions-policy` — enforces 'uncaughtException' event on Node API asynchronous callbacks |
| [`frozenIntrinsicsFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L744) | `--frozen-intrinsics` — experimental frozen intrinsics support |
| [`globalSearchPathsFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L792) | `--no-global-search-paths` — disable global module search paths |
| [`heapProfFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L870) | `--heap-prof` — Start the V8 heap profiler on start up, and write the heap profile to disk before exit. If --heap-prof-dir is not specified, write the profile to the current working directory. |
| [`heapProfDirFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L882) | `--heap-prof-dir` — Directory where the V8 heap profiles generated by --heap-prof will be placed. |
| [`heapProfIntervalFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L887) | `--heap-prof-interval` — specified sampling interval in bytes for the V8 heap profile generated with --heap-prof. (default: 512 * 1024) |
| [`heapProfNameFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L877) | `--heap-prof-name` — specified file name of the V8 heap profile generated with --heap-prof |
| [`heapsnapshotNearHeapLimitFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L752) | `--heapsnapshot-near-heap-limit` — Generate heap snapshots whenever V8 is approaching the heap limit. No more than the specified number of heap snapshots will be generated. |
| [`heapsnapshotSignalFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L748) | `--heapsnapshot-signal` — Generate heap snapshot on specified signal |
| [`helpFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1394) | `--help` — print node command line options |
| [`icuDataDirFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1425) | `--icu-data-dir` — set ICU data load path to dir (overrides NODE_ICU_DATA) (note: linked-in ICU data is present) |
| [`importFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1193) | `--import` — ES module to preload (option can be repeated) |
| [`inputTypeFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L763) | `--input-type` — set module type for string input |
| [`insecureHttpParserFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L759) | `--insecure-http-parser` — use an insecure HTTP parser that accepts invalid HTTP headers |
| [`inspectFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L475) | `--inspect` — activate inspector on host:port (default: 127.0.0.1:9229) |
| [`inspectBrkFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L486) | `--inspect-brk` — activate inspector on host:port and break at start of user script |
| [`inspectBrkNodeFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L493) | `--inspect-brk-node` |
| [`inspectPortFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L469) | `--inspect-port` — set host:port for inspector |
| [`inspectPublishUidFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L505) | `--inspect-publish-uid` — comma separated list of destinations for inspector uid(default: stderr,http) |
| [`inspectWaitFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L497) | `--inspect-wait` — activate inspector on host:port and wait for debugger to be attached |
| [`interactiveFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1203) | `--interactive` — always enter the REPL even if stdin does not appear to be a terminal |
| [`localstorageFileFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L632) | `--localstorage-file` — file used to persist localStorage data |
| [`maxHttpHeaderSizeFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L893) | `--max-http-header-size` — set the maximum size of HTTP headers (default: 16384 (16KB)) |
| [`maxOldSpaceSizePercentageFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1276) | `--max-old-space-size-percentage` — set V8's max old space size as a percentage of available memory (e.g., '50%'). Takes precedence over --max-old-space-size. |
| [`networkFamilyAutoselectionFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L560) | `--no-network-family-autoselection` — Disable network address family autodetection algorithm |
| [`networkFamilyAutoselectionAttemptTimeoutFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L565) | `--network-family-autoselection-attempt-timeout` — Sets the default value for the network family autoselection attempt timeout. |
| [`nodeSnapshotFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1375) | `--no-node-snapshot` |
| [`opensslConfigFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1436) | `--openssl-config` — load OpenSSL configuration from the specified file (overrides OPENSSL_CONF) |
| [`opensslLegacyProviderFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1489) | `--openssl-legacy-provider` — enable OpenSSL 3.0 legacy provider |
| [`opensslSharedConfigFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1493) | `--openssl-shared-config` — enable OpenSSL shared configuration |
| [`pendingDeprecationFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L810) | `--pending-deprecation` — emit pending deprecation warnings |
| [`permissionFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L659) | `--permission` — enable the permission system |
| [`permissionAuditFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L665) | `--permission-audit` — enable audit only for the permission system |
| [`preserveSymlinksFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L820) | `--preserve-symlinks` — preserve symbolic links when resolving |
| [`preserveSymlinksMainFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L824) | `--preserve-symlinks-main` — preserve symbolic links when resolving the main module |
| [`printFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1181) | `--print` — evaluate script and print result |
| [`profProcessFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L831) | `--prof-process` — process V8 profiler output generated using --prof |
| [`redirectWarningsFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L897) | `--redirect-warnings` — write warnings to file instead of stderr |
| [`reportCompactFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1404) | `--report-compact` — output compact single-line JSON |
| [`reportDirFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1408) | `--report-dir` — define custom report pathname. (default: current working directory) |
| [`reportExcludeEnvFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1245) | `--report-exclude-env` — Exclude environment variables when generating report (default: false) |
| [`reportExcludeNetworkFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1250) | `--report-exclude-network` — exclude network interface diagnostics. (default: false) |
| [`reportFilenameFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1414) | `--report-filename` — define custom report file name. (default: YYYYMMDD.HHMMSS.PID.SEQUENCE#.txt) |
| [`reportOnFatalerrorFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1419) | `--report-on-fatalerror` — generate diagnostic report on fatal (internal) errors |
| [`reportOnSignalFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1303) | `--report-on-signal` — generate diagnostic report upon receiving signals |
| [`reportSignalFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1307) | `--report-signal` — causes diagnostic report to be produced on provided signal, unsupported in Windows. (default: SIGUSR2) |
| [`reportUncaughtExceptionFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1299) | `--report-uncaught-exception` — generate diagnostic report on uncaught exceptions |
| [`requireFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1188) | `--require` — CommonJS module to preload (option can be repeated) |
| [`requireModuleFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L531) | `--no-require-module` — Allow loading synchronous ES Modules in require(). |
| [`runFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1526) | `--run` — Run a script specified in package.json |
| [`secureHeapFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1478) | `--secure-heap` — total size of the OpenSSL secure heap |
| [`secureHeapMinFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1482) | `--secure-heap-min` — minimum allocation size from the OpenSSL secure heap |
| [`securityRevertFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1389) | `--security-revert` |
| [`snapshotBlobFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1379) | `--snapshot-blob` — Path to the snapshot blob that's either the result of snapshotbuilding, or the blob that is used to restore the application state |
| [`stackTraceLimitFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1287) | `--stack-trace-limit` |
| [`stripTypesFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1197) | `--no-strip-types` — Type-stripping for TypeScript files. |
| [`testFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L920) | `--test` — launch test runner on startup |
| [`testConcurrencyFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L926) | `--test-concurrency` — specify test runner concurrency |
| [`testCoverageBranchesFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L954) | `--test-coverage-branches` — the branch coverage minimum threshold |
| [`testCoverageExcludeFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1028) | `--test-coverage-exclude` — exclude files from coverage report that match this glob pattern |
| [`testCoverageFunctionsFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L959) | `--test-coverage-functions` — the function coverage minimum threshold |
| [`testCoverageIncludeFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1023) | `--test-coverage-include` — include files in coverage report that match this glob pattern |
| [`testCoverageLinesFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L964) | `--test-coverage-lines` — the line coverage minimum threshold |
| [`testForceExitFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L931) | `--test-force-exit` — force test runner to exit upon completion |
| [`testGlobalSetupFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1033) | `--test-global-setup` — specifies the path to the global setup file |
| [`testIsolationFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L969) | `--test-isolation` — configures the type of test isolation used in the test runner |
| [`testNamePatternFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L987) | `--test-name-pattern` — run tests whose name matches this regular expression |
| [`testOnlyFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1002) | `--test-only` — run tests with 'only' option set |
| [`testRandomSeedFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1046) | `--test-random-seed` — seed used to randomize test execution order |
| [`testRandomizeFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1038) | `--test-randomize` — run tests in a random order |
| [`testReporterFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L992) | `--test-reporter` — report test output using the given reporter |
| [`testReporterDestinationFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L997) | `--test-reporter-destination` — report given reporter to the given destination |
| [`testRerunFailuresFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1052) | `--test-rerun-failures` — specifies the path to the rerun state file |
| [`testShardFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1008) | `--test-shard` — run test at specific shard |
| [`testSkipPatternFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1013) | `--test-skip-pattern` — run tests whose name do not match this regular expression |
| [`testTimeoutFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L937) | `--test-timeout` — specify test runner timeout |
| [`testUdpNoTrySendFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1057) | `--test-udp-no-try-send` |
| [`testUpdateSnapshotsFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L942) | `--test-update-snapshots` — regenerate test snapshots |
| [`throwDeprecationFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1061) | `--throw-deprecation` — throw an exception on deprecations |
| [`titleFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1344) | `--title` — the process title to use on startup |
| [`tlsCipherListFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1441) | `--tls-cipher-list` — use an alternative default TLS cipher list |
| [`tlsKeylogFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1211) | `--tls-keylog` — log TLS decryption keys to named file for traffic analysis |
| [`tlsMaxV12Flag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1232) | `--tls-max-v1.2` — set default TLS maximum to TLSv1.2 (default: TLSv1.3) |
| [`tlsMaxV13Flag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1240) | `--tls-max-v1.3` — set default TLS maximum to TLSv1.3 (default: TLSv1.3) |
| [`tlsMinV10Flag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1216) | `--tls-min-v1.0` — set default TLS minimum to TLSv1.0 (default: TLSv1.2) |
| [`tlsMinV11Flag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1220) | `--tls-min-v1.1` — set default TLS minimum to TLSv1.1 (default: TLSv1.2) |
| [`tlsMinV12Flag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1224) | `--tls-min-v1.2` — set default TLS minimum to TLSv1.2 (default: TLSv1.2) |
| [`tlsMinV13Flag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1228) | `--tls-min-v1.3` — set default TLS minimum to TLSv1.3 (default: TLSv1.2) |
| [`traceDeprecationFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1065) | `--trace-deprecation` — show stack traces on deprecations |
| [`traceEnvFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1095) | `--trace-env` — Print accesses to the environment variables |
| [`traceEnvJsStackFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1101) | `--trace-env-js-stack` — Print accesses to the environment variables and the JavaScript stack trace |
| [`traceEnvNativeStackFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1106) | `--trace-env-native-stack` — Print accesses to the environment variables and the native stack trace |
| [`traceEventCategoriesFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1348) | `--trace-event-categories` — comma separated list of trace event categories to record |
| [`traceEventFilePatternFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1352) | `--trace-event-file-pattern` — Template string specifying the filepath for the trace-events data, it supports ${rotation} and ${pid}. |
| [`traceExitFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1069) | `--trace-exit` — show stack trace when an environment exits |
| [`tracePromisesFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1090) | `--trace-promises` — show stack traces on promise initialization and resolution |
| [`traceRequireModuleFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1119) | `--trace-require-module` — Print access to require(esm). Options are 'all' (print all usage) and 'no-node-modules' (excluding usage from the node_modules folder) |
| [`traceSigintFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1507) | `--trace-sigint` — enable printing JavaScript stacktrace on SIGINT |
| [`traceSyncIoFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1073) | `--trace-sync-io` — show stack trace when use of sync IO is detected after the first tick |
| [`traceTlsFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1078) | `--trace-tls` — prints TLS packet trace information to stderr |
| [`traceUncaughtFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1082) | `--trace-uncaught` — show stack traces for the `throw` behind uncaught exceptions |
| [`traceWarningsFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1086) | `--trace-warnings` — show stack traces on process warnings |
| [`trackHeapObjectsFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1259) | `--track-heap-objects` — track heap object allocations for heap snapshots |
| [`unhandledRejectionsFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1131) | `--unhandled-rejections` — define unhandled rejections behavior. Options are 'strict' (always raise an error), 'throw' (raise an error unless 'unhandledRejection' hook is set), 'warn' (log a warning), 'none' (silence warnings), 'warn-with-error-code' (log a warning and set exit code 1 unless 'unhandledRejection' hook is set). (default: throw) |
| [`useBundledCaFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1453) | `--use-bundled-ca` — use bundled CA store (default) |
| [`useEnvProxyFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L814) | `--use-env-proxy` — parse proxy settings from HTTP_PROXY/HTTPS_PROXY/NO_PROXYenvironment variables and apply the setting in global HTTP/HTTPS clients |
| [`useLargepagesFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1499) | `--use-largepages` — Map the Node.js static code to large pages. Options are 'off' (the default value, meaning do not map), 'on' (map and ignore failure, reporting it to stderr), or 'silent' (map and silently ignore failure) |
| [`useOpensslCaFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1445) | `--use-openssl-ca` — use OpenSSL's default CA store |
| [`useSystemCaFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1113) | `--use-system-ca` — use system's CA store |
| [`v8OptionsFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1401) | `--v8-options` — print V8 command line options |
| [`v8PoolSizeFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1359) | `--v8-pool-size` — set V8's thread pool size |
| [`verifyBaseObjectsFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1140) | `--verify-base-objects` |
| [`versionFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1398) | `--version` — print Node.js version |
| [`warningsFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L797) | `--no-warnings` — silence all process warnings |
| [`watchFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1144) | `--watch` — run in watch mode |
| [`watchKillSignalFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1155) | `--watch-kill-signal` — kill signal to send to the process on watch mode restarts(default: SIGTERM) |
| [`watchPathFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1150) | `--watch-path` — path to watch |
| [`watchPreserveOutputFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1161) | `--watch-preserve-output` — preserve outputs on watch mode restart |
| [`zeroFillBuffersFlag`](https://github.com/nodejs/node/blob/v26.5.0/src/node_options.cc#L1363) | `--zero-fill-buffers` — automatically zero-fill all newly allocated Buffer instances |

</details>
<!--/mdeval-->

## FAQ

### How does it work?

Two layers, both pinned to real Node behavior. A build step downloads every supported major (18-26), dumps its internal option schema with `--expose-internals`, and bakes a per-option descriptor into `src/flags.ts` — every spelling that affects the option (aliases, `=`-forms, negation, implications), derived by resolving probe arguments through Node's parsing rules (aliases, negation, implications) rather than hand-inverting its tables. At runtime, a slim scanner reads `NODE_OPTIONS` and `process.execArgv` for just the flag you asked about. See [CONTRIBUTING.md](https://github.com/privatenumber/get-option-value/blob/develop/CONTRIBUTING.md) for the full architecture.

### How accurate is it?

Exact on every supported major (18-26), verified against the real internal binding for *every* flag. Most flags are a newest-major snapshot — correct everywhere because their type/default/spelling never changed; the ~13 that *did* change (e.g. `--env-file` became a list in Node 24, `--stack-trace-limit` became readable in Node 22) carry a tiny `nodeMajor` branch. The only gap: an option newer than the running Node reads its newest default instead of `undefined` — unobservable, since that Node can't boot with the option.

### Why not just parse `process.execArgv` myself?

The details are subtle and easy to get wrong: alias expansion (`--inspect=` sets `--inspect-port` *and* `--inspect`), implications (`--inspect-brk` implies `--inspect`), underscore normalization (`--no_addons` ≡ `--no-addons`), negation with last-wins, value escapes (`\-`), space-form values (`--require ./file.js`), `host:port` splitting, and C numeric semantics (`atoll`, `strtoull`). This package encodes all of it, per option, verified against Node.

### Why generate the data instead of reading it at runtime?

Node exposes no public API for it: `process.allowedNodeEnvironmentFlags` is names-only (no types, arity, aliases, or defaults), and the internal binding needs `--expose-internals`, reachable only by re-spawning Node. Generating ahead of time keeps the runtime tiny and dependency-free.

### How big is my bundle?

Each flag is a separate export, so an app bundles only the flags it reads — the value converters (host:port, C-integer) and the other ~190 flags tree-shake away. A stable flag never pulls version detection into a bundle, so `import { conditionsFlag }` stays `process`-free and tree-shakes to ~1 KB.

let major;
const forMajor = (minimumMajor, atOrAbove, below) => {
  major ??= Number.parseInt(process.versions.node, 10);
  return major >= minimumMajor ? atOrAbove : below;
};

const defaultInspectorPort = 9229;
const UINT16_MAX = 65535;
const removeBrackets = (host) => (
  // A single-character string can't match both, so no length guard needed
  host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host
);
const leadingDigitsPattern = /^\d+/;
const parseAndValidatePort = (port) => {
  const digits = leadingDigitsPattern.exec(port)?.[0];
  const result = digits === void 0 ? 0 : Number(digits);
  return result <= UINT16_MAX ? result : 0;
};
const updateHostPort = (existing, value) => {
  let host;
  let port;
  const withoutBrackets = removeBrackets(value);
  if (withoutBrackets.length < value.length) {
    host = withoutBrackets;
    port = defaultInspectorPort;
  } else {
    const colonIndex = value.lastIndexOf(":");
    if (colonIndex === -1) {
      if (/\D/.test(value)) {
        host = value;
        port = defaultInspectorPort;
      } else {
        host = "";
        port = parseAndValidatePort(value);
      }
    } else {
      host = removeBrackets(value.slice(0, colonIndex));
      port = parseAndValidatePort(value.slice(colonIndex + 1));
    }
  }
  if (host !== "") {
    existing.host = host;
  }
  existing.port = port;
  return existing;
};

const INT64_MIN = -9223372036854775808n;
const INT64_MAX = 9223372036854775807n;
const UINT64_MAX = 18446744073709551615n;
const UINT64_MODULO = 18446744073709551616n;
const cIntegerPattern = /^[ \t\n\v\f\r]*([+-]?)(\d*)/;
const scanCInteger = (value) => {
  const [, sign, digits] = cIntegerPattern.exec(value);
  return {
    isNegative: sign === "-",
    magnitude: digits === "" ? void 0 : BigInt(digits)
  };
};
const parseCInteger64 = (value) => {
  const { isNegative, magnitude } = scanCInteger(value);
  if (magnitude === void 0) {
    return 0;
  }
  let result = isNegative ? -magnitude : magnitude;
  if (result > INT64_MAX) {
    result = INT64_MAX;
  } else if (result < INT64_MIN) {
    result = INT64_MIN;
  }
  return Number(result);
};
const parseCUnsignedInteger64 = (value) => {
  const { isNegative, magnitude } = scanCInteger(value);
  if (magnitude === void 0) {
    return 0;
  }
  if (magnitude > UINT64_MAX) {
    return Number(UINT64_MAX);
  }
  return Number(
    isNegative ? (UINT64_MODULO - magnitude) % UINT64_MODULO : magnitude
  );
};

const returnUndefined = () => void 0;
const emptyList = () => [];
const setByEffect = (_raw, _current, effect) => effect === 1;
const returnRaw = (raw) => raw;
const appendRaw = (raw, current) => {
  const list = current;
  list.push(raw);
  return list;
};
const foldHostPort = (raw, current) => updateHostPort(current, raw);
const booleanFlag = (default_, forms) => ({
  forms,
  init: () => default_,
  fold: setByEffect
});
const stringListFlag = (forms) => ({
  forms,
  init: emptyList,
  fold: appendRaw
});
const stringFlag = (default_, forms) => ({
  forms,
  init: () => default_,
  fold: returnRaw
});
const integerFlag = (default_, forms) => ({
  forms,
  init: () => default_,
  fold: parseCInteger64
});
const unsignedIntegerFlag = (default_, forms) => ({
  forms,
  init: () => default_,
  fold: parseCUnsignedInteger64
});
const undefinedFlag = () => ({
  forms: [],
  init: returnUndefined,
  fold: returnUndefined
});
const hostPortFlag = (default_, forms) => ({
  forms,
  // Null-prototype clone, matching the binding and avoiding a shared default
  init: () => Object.assign(/* @__PURE__ */ Object.create(null), default_),
  fold: foldHostPort
});

const abortOnUncaughtExceptionFlag = /* @__PURE__ */ booleanFlag(false, [["--abort-on-uncaught-exception", 1]]);
const addonsFlag = /* @__PURE__ */ booleanFlag(true, [["--addons", 1], ["--no-addons", 2]]);
const allowAddonsFlag = /* @__PURE__ */ booleanFlag(false, [["--allow-addons", 1], ["--no-allow-addons", 2]]);
const allowChildProcessFlag = /* @__PURE__ */ booleanFlag(false, [["--allow-child-process", 1], ["--no-allow-child-process", 2]]);
const allowFfiFlag = /* @__PURE__ */ booleanFlag(false, [["--allow-ffi", 1], ["--no-allow-ffi", 2]]);
const allowFsReadFlag = /* @__PURE__ */ stringListFlag([["--allow-fs-read", 0]]);
const allowFsWriteFlag = /* @__PURE__ */ stringListFlag([["--allow-fs-write", 0]]);
const allowInspectorFlag = /* @__PURE__ */ booleanFlag(false, [["--allow-inspector", 1], ["--no-allow-inspector", 2]]);
const allowNetFlag = /* @__PURE__ */ booleanFlag(false, [["--allow-net", 1], ["--no-allow-net", 2]]);
const allowWasiFlag = /* @__PURE__ */ booleanFlag(false, [["--allow-wasi", 1], ["--no-allow-wasi", 2]]);
const allowWorkerFlag = /* @__PURE__ */ booleanFlag(false, [["--allow-worker", 1], ["--no-allow-worker", 2]]);
const asyncContextFrameFlag = /* @__PURE__ */ booleanFlag(true, [["--async-context-frame", 1], ["--no-async-context-frame", 2]]);
const buildSeaFlag = /* @__PURE__ */ stringFlag("", [["--build-sea", 0]]);
const buildSnapshotFlag = /* @__PURE__ */ booleanFlag(false, [["--build-snapshot-config", 1], ["--build-snapshot", 1], ["--no-build-snapshot", 2]]);
const buildSnapshotConfigFlag = /* @__PURE__ */ stringFlag("", [["--build-snapshot-config", 0]]);
const checkFlag = /* @__PURE__ */ booleanFlag(false, [["--check", 1], ["--no-check", 2], ["-c", 1]]);
const completionBashFlag = /* @__PURE__ */ booleanFlag(false, [["--completion-bash", 1], ["--no-completion-bash", 2]]);
const conditionsFlag = /* @__PURE__ */ stringListFlag([["--conditions", 0], ["-C", 0]]);
const cpuProfFlag = /* @__PURE__ */ booleanFlag(false, [["--cpu-prof", 1], ["--no-cpu-prof", 2]]);
const cpuProfDirFlag = /* @__PURE__ */ stringFlag("", [["--cpu-prof-dir", 0]]);
const cpuProfIntervalFlag = /* @__PURE__ */ unsignedIntegerFlag(1e3, [["--cpu-prof-interval", 0]]);
const cpuProfNameFlag = /* @__PURE__ */ stringFlag("", [["--cpu-prof-name", 0]]);
const debugFlag = /* @__PURE__ */ booleanFlag(false, [["--debug", 1], ["--no-debug", 2]]);
const debugArraybufferAllocationsFlag = /* @__PURE__ */ booleanFlag(false, [["--debug-arraybuffer-allocations", 1], ["--no-debug-arraybuffer-allocations", 2], ["--node-memory-debug", 1]]);
const debugBrkFlag = /* @__PURE__ */ booleanFlag(false, [["--debug-brk", 1], ["--no-debug-brk", 2]]);
const deprecationFlag = /* @__PURE__ */ booleanFlag(true, [["--deprecation", 1], ["--no-deprecation", 2]]);
const diagnosticDirFlag = /* @__PURE__ */ stringFlag("", [["--diagnostic-dir", 0]]);
const disableProtoFlag = /* @__PURE__ */ stringFlag("", [["--disable-proto", 0]]);
const disableSigusr1Flag = /* @__PURE__ */ booleanFlag(false, [["--disable-sigusr1", 1], ["--no-disable-sigusr1", 2]]);
const disableWarningFlag = /* @__PURE__ */ stringListFlag([["--disable-warning", 0]]);
const disableWasmTrapHandlerFlag = /* @__PURE__ */ booleanFlag(false, [["--disable-wasm-trap-handler", 1], ["--no-disable-wasm-trap-handler", 2]]);
const dnsResultOrderFlag = /* @__PURE__ */ stringFlag("", [["--dns-result-order", 0]]);
const enableFipsFlag = /* @__PURE__ */ booleanFlag(false, [["--enable-fips", 1], ["--no-enable-fips", 2]]);
const enableSourceMapsFlag = /* @__PURE__ */ forMajor(26, /* @__PURE__ */ booleanFlag(false, [["--enable-source-maps", 1], ["--no-enable-source-maps", 2]]), /* @__PURE__ */ booleanFlag(false, [["--enable-source-maps", 1], ["--experimental-transform-types", 1], ["--no-enable-source-maps", 2]]));
const entryUrlFlag = /* @__PURE__ */ booleanFlag(false, [["--entry-url", 1], ["--no-entry-url", 2]]);
const envFileFlag = /* @__PURE__ */ forMajor(24, /* @__PURE__ */ stringListFlag([["--env-file", 0]]), /* @__PURE__ */ stringFlag("", [["--env-file", 0]]));
const envFileIfExistsFlag = /* @__PURE__ */ forMajor(24, /* @__PURE__ */ stringListFlag([["--env-file-if-exists", 0]]), /* @__PURE__ */ stringFlag("", [["--env-file-if-exists", 0]]));
const evalFlag = /* @__PURE__ */ stringFlag("", [["--eval", 0], ["--print", 0], ["-e", 0], ["-p", 0], ["-pe", 0]]);
const experimentalAddonModulesFlag = /* @__PURE__ */ forMajor(26, /* @__PURE__ */ booleanFlag(true, [["--experimental-addon-modules", 1], ["--no-experimental-addon-modules", 2]]), /* @__PURE__ */ booleanFlag(false, [["--experimental-addon-modules", 1], ["--no-experimental-addon-modules", 2]]));
const experimentalConfigFileFlag = /* @__PURE__ */ stringFlag("", [["--experimental-config-file", 0], ["--experimental-default-config-file", 0]]);
const experimentalDetectModuleFlag = /* @__PURE__ */ forMajor(23, /* @__PURE__ */ booleanFlag(true, [["--experimental-detect-module", 1], ["--no-experimental-detect-module", 2]]), /* @__PURE__ */ forMajor(22, /* @__PURE__ */ booleanFlag(true, [["--experimental-detect-module", 1], ["--experimental-strip-types", 1], ["--no-experimental-detect-module", 2]]), /* @__PURE__ */ forMajor(21, /* @__PURE__ */ booleanFlag(false, [["--experimental-detect-module", 1], ["--no-experimental-detect-module", 2]]), /* @__PURE__ */ booleanFlag(true, [["--experimental-detect-module", 1], ["--no-experimental-detect-module", 2]]))));
const experimentalEventsourceFlag = /* @__PURE__ */ booleanFlag(false, [["--experimental-eventsource", 1], ["--no-experimental-eventsource", 2]]);
const experimentalFfiFlag = /* @__PURE__ */ booleanFlag(false, [["--experimental-ffi", 1], ["--no-experimental-ffi", 2]]);
const experimentalGlobalNavigatorFlag = /* @__PURE__ */ booleanFlag(true, [["--experimental-global-navigator", 1], ["--no-experimental-global-navigator", 2]]);
const experimentalImportMetaResolveFlag = /* @__PURE__ */ booleanFlag(false, [["--experimental-import-meta-resolve", 1], ["--no-experimental-import-meta-resolve", 2]]);
const experimentalImportTextFlag = /* @__PURE__ */ booleanFlag(false, [["--experimental-import-text", 1], ["--no-experimental-import-text", 2]]);
const experimentalInspectorNetworkResourceFlag = /* @__PURE__ */ booleanFlag(false, [["--experimental-inspector-network-resource", 1], ["--no-experimental-inspector-network-resource", 2]]);
const experimentalLoaderFlag = /* @__PURE__ */ stringListFlag([["--experimental-loader", 0], ["--loader", 0]]);
const experimentalNetworkInspectionFlag = /* @__PURE__ */ booleanFlag(false, [["--experimental-network-inspection", 1], ["--no-experimental-network-inspection", 2]]);
const experimentalPackageMapFlag = /* @__PURE__ */ stringFlag("", [["--experimental-package-map", 0]]);
const experimentalPrintRequiredTlaFlag = /* @__PURE__ */ booleanFlag(false, [["--experimental-print-required-tla", 1], ["--no-experimental-print-required-tla", 2]]);
const experimentalReplAwaitFlag = /* @__PURE__ */ booleanFlag(true, [["--experimental-repl-await", 1], ["--no-experimental-repl-await", 2]]);
const experimentalRequireModuleFlag = /* @__PURE__ */ booleanFlag(true, [["--experimental-require-module", 1], ["--no-experimental-require-module", 2]]);
const experimentalSeaConfigFlag = /* @__PURE__ */ stringFlag("", [["--experimental-sea-config", 0]]);
const experimentalShadowRealmFlag = /* @__PURE__ */ booleanFlag(false, [["--experimental-shadow-realm", 1], ["--harmony-shadow-realm", 1], ["--no-experimental-shadow-realm", 2], ["--no-harmony-shadow-realm", 2]]);
const experimentalSqliteFlag = /* @__PURE__ */ booleanFlag(true, [["--experimental-sqlite", 1], ["--no-experimental-sqlite", 2]]);
const experimentalStorageInspectionFlag = /* @__PURE__ */ booleanFlag(false, [["--experimental-storage-inspection", 1], ["--no-experimental-storage-inspection", 2]]);
const experimentalStreamIterFlag = /* @__PURE__ */ booleanFlag(false, [["--experimental-stream-iter", 1], ["--no-experimental-stream-iter", 2]]);
const experimentalTestCoverageFlag = /* @__PURE__ */ booleanFlag(false, [["--experimental-test-coverage", 1], ["--no-experimental-test-coverage", 2]]);
const experimentalTestModuleMocksFlag = /* @__PURE__ */ booleanFlag(false, [["--experimental-test-module-mocks", 1], ["--no-experimental-test-module-mocks", 2]]);
const experimentalTestTagFilterFlag = /* @__PURE__ */ stringListFlag([["--experimental-test-tag-filter", 0]]);
const experimentalVfsFlag = /* @__PURE__ */ booleanFlag(false, [["--experimental-vfs", 1], ["--no-experimental-vfs", 2]]);
const experimentalVmModulesFlag = /* @__PURE__ */ booleanFlag(false, [["--experimental-vm-modules", 1], ["--no-experimental-vm-modules", 2]]);
const experimentalWebsocketFlag = /* @__PURE__ */ forMajor(22, /* @__PURE__ */ booleanFlag(true, [["--experimental-websocket", 1], ["--no-experimental-websocket", 2]]), /* @__PURE__ */ booleanFlag(false, [["--experimental-websocket", 1], ["--no-experimental-websocket", 2]]));
const experimentalWebstorageFlag = /* @__PURE__ */ forMajor(25, /* @__PURE__ */ booleanFlag(true, [["--experimental-webstorage", 1], ["--no-experimental-webstorage", 2], ["--no-webstorage", 2], ["--webstorage", 1]]), /* @__PURE__ */ booleanFlag(false, [["--experimental-webstorage", 1], ["--no-experimental-webstorage", 2]]));
const experimentalWorkerInspectionFlag = /* @__PURE__ */ booleanFlag(false, [["--experimental-worker-inspection", 1], ["--no-experimental-worker-inspection", 2]]);
const exposeInternalsFlag = /* @__PURE__ */ booleanFlag(false, [["--expose-internals", 1], ["--no-expose-internals", 2]]);
const extraInfoOnFatalExceptionFlag = /* @__PURE__ */ booleanFlag(true, [["--extra-info-on-fatal-exception", 1], ["--no-extra-info-on-fatal-exception", 2]]);
const forceAsyncHooksChecksFlag = /* @__PURE__ */ booleanFlag(true, [["--force-async-hooks-checks", 1], ["--no-force-async-hooks-checks", 2]]);
const forceContextAwareFlag = /* @__PURE__ */ booleanFlag(false, [["--force-context-aware", 1], ["--no-force-context-aware", 2]]);
const forceFipsFlag = /* @__PURE__ */ booleanFlag(false, [["--force-fips", 1], ["--no-force-fips", 2]]);
const forceNodeApiUncaughtExceptionsPolicyFlag = /* @__PURE__ */ booleanFlag(false, [["--force-node-api-uncaught-exceptions-policy", 1], ["--no-force-node-api-uncaught-exceptions-policy", 2]]);
const frozenIntrinsicsFlag = /* @__PURE__ */ booleanFlag(false, [["--frozen-intrinsics", 1], ["--no-frozen-intrinsics", 2]]);
const globalSearchPathsFlag = /* @__PURE__ */ booleanFlag(true, [["--global-search-paths", 1], ["--no-global-search-paths", 2]]);
const heapProfFlag = /* @__PURE__ */ booleanFlag(false, [["--heap-prof", 1], ["--no-heap-prof", 2]]);
const heapProfDirFlag = /* @__PURE__ */ stringFlag("", [["--heap-prof-dir", 0]]);
const heapProfIntervalFlag = /* @__PURE__ */ unsignedIntegerFlag(524288, [["--heap-prof-interval", 0]]);
const heapProfNameFlag = /* @__PURE__ */ stringFlag("", [["--heap-prof-name", 0]]);
const heapsnapshotNearHeapLimitFlag = /* @__PURE__ */ integerFlag(0, [["--heapsnapshot-near-heap-limit", 0]]);
const heapsnapshotSignalFlag = /* @__PURE__ */ stringFlag("", [["--heapsnapshot-signal", 0]]);
const helpFlag = /* @__PURE__ */ booleanFlag(false, [["--help", 1], ["--no-help", 2], ["-h", 1]]);
const icuDataDirFlag = /* @__PURE__ */ stringFlag("", [["--icu-data-dir", 0]]);
const importFlag = /* @__PURE__ */ stringListFlag([["--import", 0]]);
const inputTypeFlag = /* @__PURE__ */ stringFlag("", [["--input-type", 0]]);
const insecureHttpParserFlag = /* @__PURE__ */ booleanFlag(false, [["--insecure-http-parser", 1], ["--no-insecure-http-parser", 2]]);
const inspectFlag = /* @__PURE__ */ booleanFlag(false, [["--inspect-brk-node", 1], ["--inspect-brk", 1], ["--inspect-wait", 1], ["--inspect", 1], ["--no-inspect", 2]]);
const inspectBrkFlag = /* @__PURE__ */ booleanFlag(false, [["--inspect-brk", 1], ["--no-inspect-brk", 2]]);
const inspectBrkNodeFlag = /* @__PURE__ */ booleanFlag(false, [["--inspect-brk-node", 1], ["--no-inspect-brk-node", 2]]);
const inspectPortFlag = /* @__PURE__ */ hostPortFlag({ "host": "127.0.0.1", "port": 9229 }, [["--debug-port", 0], ["--inspect-brk-node", 3], ["--inspect-brk", 3], ["--inspect-port", 0], ["--inspect-wait", 3], ["--inspect", 3]]);
const inspectPublishUidFlag = /* @__PURE__ */ stringFlag("stderr,http", [["--inspect-publish-uid", 0]]);
const inspectWaitFlag = /* @__PURE__ */ booleanFlag(false, [["--inspect-wait", 1], ["--no-inspect-wait", 2]]);
const interactiveFlag = /* @__PURE__ */ booleanFlag(false, [["--interactive", 1], ["--no-interactive", 2], ["-i", 1]]);
const localstorageFileFlag = /* @__PURE__ */ stringFlag("", [["--localstorage-file", 0]]);
const maxHttpHeaderSizeFlag = /* @__PURE__ */ unsignedIntegerFlag(16384, [["--max-http-header-size", 0]]);
const maxOldSpaceSizePercentageFlag = /* @__PURE__ */ stringFlag("", [["--max-old-space-size-percentage", 0]]);
const networkFamilyAutoselectionFlag = /* @__PURE__ */ booleanFlag(true, [["--enable-network-family-autoselection", 1], ["--network-family-autoselection", 1], ["--no-enable-network-family-autoselection", 2], ["--no-network-family-autoselection", 2]]);
const networkFamilyAutoselectionAttemptTimeoutFlag = /* @__PURE__ */ forMajor(25, /* @__PURE__ */ unsignedIntegerFlag(500, [["--network-family-autoselection-attempt-timeout", 0]]), /* @__PURE__ */ unsignedIntegerFlag(250, [["--network-family-autoselection-attempt-timeout", 0]]));
const nodeSnapshotFlag = /* @__PURE__ */ booleanFlag(true, [["--no-node-snapshot", 2], ["--node-snapshot", 1]]);
const opensslConfigFlag = /* @__PURE__ */ stringFlag("", [["--openssl-config", 0]]);
const opensslLegacyProviderFlag = /* @__PURE__ */ booleanFlag(false, [["--no-openssl-legacy-provider", 2], ["--openssl-legacy-provider", 1]]);
const opensslSharedConfigFlag = /* @__PURE__ */ booleanFlag(false, [["--no-openssl-shared-config", 2], ["--openssl-shared-config", 1]]);
const pendingDeprecationFlag = /* @__PURE__ */ booleanFlag(false, [["--no-pending-deprecation", 2], ["--pending-deprecation", 1]]);
const permissionFlag = /* @__PURE__ */ forMajor(24, /* @__PURE__ */ booleanFlag(false, [["--no-permission", 2], ["--permission", 1]]), /* @__PURE__ */ booleanFlag(false, [["--experimental-permission", 1], ["--no-experimental-permission", 2], ["--no-permission", 2], ["--permission", 1]]));
const permissionAuditFlag = /* @__PURE__ */ booleanFlag(false, [["--no-permission-audit", 2], ["--permission-audit", 1]]);
const preserveSymlinksFlag = /* @__PURE__ */ booleanFlag(false, [["--no-preserve-symlinks", 2], ["--preserve-symlinks", 1]]);
const preserveSymlinksMainFlag = /* @__PURE__ */ booleanFlag(false, [["--no-preserve-symlinks-main", 2], ["--preserve-symlinks-main", 1]]);
const printFlag = /* @__PURE__ */ booleanFlag(false, [["--no-print", 2], ["--print", 1], ["-p", 1], ["-pe", 1]]);
const profProcessFlag = /* @__PURE__ */ booleanFlag(false, [["--no-prof-process", 2], ["--prof-process", 1]]);
const redirectWarningsFlag = /* @__PURE__ */ stringFlag("", [["--redirect-warnings", 0]]);
const reportCompactFlag = /* @__PURE__ */ booleanFlag(false, [["--no-report-compact", 2], ["--report-compact", 1]]);
const reportDirFlag = /* @__PURE__ */ stringFlag("", [["--report-dir", 0], ["--report-directory", 0]]);
const reportExcludeEnvFlag = /* @__PURE__ */ booleanFlag(false, [["--no-report-exclude-env", 2], ["--report-exclude-env", 1]]);
const reportExcludeNetworkFlag = /* @__PURE__ */ booleanFlag(false, [["--no-report-exclude-network", 2], ["--report-exclude-network", 1]]);
const reportFilenameFlag = /* @__PURE__ */ stringFlag("", [["--report-filename", 0]]);
const reportOnFatalerrorFlag = /* @__PURE__ */ booleanFlag(false, [["--no-report-on-fatalerror", 2], ["--report-on-fatalerror", 1]]);
const reportOnSignalFlag = /* @__PURE__ */ booleanFlag(false, [["--no-report-on-signal", 2], ["--report-on-signal", 1], ["--report-signal", 1]]);
const reportSignalFlag = /* @__PURE__ */ stringFlag("SIGUSR2", [["--report-signal", 0]]);
const reportUncaughtExceptionFlag = /* @__PURE__ */ booleanFlag(false, [["--no-report-uncaught-exception", 2], ["--report-uncaught-exception", 1]]);
const requireFlag = /* @__PURE__ */ stringListFlag([["--require", 0], ["-r", 0]]);
const requireModuleFlag = /* @__PURE__ */ booleanFlag(true, [["--experimental-require-module", 1], ["--no-require-module", 2], ["--require-module", 1]]);
const runFlag = /* @__PURE__ */ stringFlag("", [["--run", 0]]);
const secureHeapFlag = /* @__PURE__ */ integerFlag(0, [["--secure-heap", 0]]);
const secureHeapMinFlag = /* @__PURE__ */ integerFlag(2, [["--secure-heap-min", 0]]);
const securityRevertFlag = /* @__PURE__ */ stringListFlag([["--security-revert", 0], ["--security-reverts", 0]]);
const snapshotBlobFlag = /* @__PURE__ */ stringFlag("", [["--snapshot-blob", 0]]);
const stackTraceLimitFlag = /* @__PURE__ */ forMajor(22, /* @__PURE__ */ integerFlag(10, [["--stack-trace-limit", 0]]), /* @__PURE__ */ undefinedFlag());
const stripTypesFlag = /* @__PURE__ */ forMajor(26, /* @__PURE__ */ booleanFlag(true, [["--experimental-strip-types", 1], ["--no-experimental-strip-types", 2], ["--no-strip-types", 2], ["--strip-types", 1]]), /* @__PURE__ */ booleanFlag(true, [["--experimental-strip-types", 1], ["--experimental-transform-types", 1], ["--no-experimental-strip-types", 2], ["--no-strip-types", 2], ["--strip-types", 1]]));
const testFlag = /* @__PURE__ */ booleanFlag(false, [["--no-test", 2], ["--test", 1]]);
const testConcurrencyFlag = /* @__PURE__ */ unsignedIntegerFlag(0, [["--test-concurrency", 0]]);
const testCoverageBranchesFlag = /* @__PURE__ */ unsignedIntegerFlag(0, [["--test-coverage-branches", 0]]);
const testCoverageExcludeFlag = /* @__PURE__ */ stringListFlag([["--test-coverage-exclude", 0]]);
const testCoverageFunctionsFlag = /* @__PURE__ */ unsignedIntegerFlag(0, [["--test-coverage-functions", 0]]);
const testCoverageIncludeFlag = /* @__PURE__ */ stringListFlag([["--test-coverage-include", 0]]);
const testCoverageLinesFlag = /* @__PURE__ */ unsignedIntegerFlag(0, [["--test-coverage-lines", 0]]);
const testForceExitFlag = /* @__PURE__ */ booleanFlag(false, [["--no-test-force-exit", 2], ["--test-force-exit", 1]]);
const testGlobalSetupFlag = /* @__PURE__ */ stringFlag("", [["--test-global-setup", 0]]);
const testIsolationFlag = /* @__PURE__ */ stringFlag("process", [["--experimental-test-isolation", 0], ["--test-isolation", 0]]);
const testNamePatternFlag = /* @__PURE__ */ stringListFlag([["--test-name-pattern", 0]]);
const testOnlyFlag = /* @__PURE__ */ booleanFlag(false, [["--no-test-only", 2], ["--test-only", 1]]);
const testRandomSeedFlag = /* @__PURE__ */ unsignedIntegerFlag(0, [["--test-random-seed", 0]]);
const testRandomizeFlag = /* @__PURE__ */ booleanFlag(false, [["--no-test-randomize", 2], ["--test-randomize", 1]]);
const testReporterFlag = /* @__PURE__ */ stringListFlag([["--test-reporter", 0]]);
const testReporterDestinationFlag = /* @__PURE__ */ stringListFlag([["--test-reporter-destination", 0]]);
const testRerunFailuresFlag = /* @__PURE__ */ stringFlag("", [["--test-rerun-failures", 0]]);
const testShardFlag = /* @__PURE__ */ stringFlag("", [["--test-shard", 0]]);
const testSkipPatternFlag = /* @__PURE__ */ stringListFlag([["--test-skip-pattern", 0]]);
const testTimeoutFlag = /* @__PURE__ */ unsignedIntegerFlag(0, [["--test-timeout", 0]]);
const testUdpNoTrySendFlag = /* @__PURE__ */ booleanFlag(false, [["--no-test-udp-no-try-send", 2], ["--test-udp-no-try-send", 1]]);
const testUpdateSnapshotsFlag = /* @__PURE__ */ booleanFlag(false, [["--no-test-update-snapshots", 2], ["--test-update-snapshots", 1]]);
const throwDeprecationFlag = /* @__PURE__ */ booleanFlag(false, [["--no-throw-deprecation", 2], ["--throw-deprecation", 1]]);
const titleFlag = /* @__PURE__ */ stringFlag("", [["--title", 0]]);
const tlsCipherListFlag = /* @__PURE__ */ stringFlag("TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:DHE-RSA-AES256-SHA384:ECDHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA256:HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA", [["--tls-cipher-list", 0]]);
const tlsKeylogFlag = /* @__PURE__ */ stringFlag("", [["--tls-keylog", 0]]);
const tlsMaxV12Flag = /* @__PURE__ */ booleanFlag(false, [["--no-tls-max-v1.2", 2], ["--tls-max-v1.2", 1]]);
const tlsMaxV13Flag = /* @__PURE__ */ booleanFlag(false, [["--no-tls-max-v1.3", 2], ["--tls-max-v1.3", 1]]);
const tlsMinV10Flag = /* @__PURE__ */ booleanFlag(false, [["--no-tls-min-v1.0", 2], ["--tls-min-v1.0", 1]]);
const tlsMinV11Flag = /* @__PURE__ */ booleanFlag(false, [["--no-tls-min-v1.1", 2], ["--tls-min-v1.1", 1]]);
const tlsMinV12Flag = /* @__PURE__ */ booleanFlag(false, [["--no-tls-min-v1.2", 2], ["--tls-min-v1.2", 1]]);
const tlsMinV13Flag = /* @__PURE__ */ booleanFlag(false, [["--no-tls-min-v1.3", 2], ["--tls-min-v1.3", 1]]);
const traceDeprecationFlag = /* @__PURE__ */ booleanFlag(false, [["--no-trace-deprecation", 2], ["--trace-deprecation", 1]]);
const traceEnvFlag = /* @__PURE__ */ booleanFlag(false, [["--no-trace-env", 2], ["--trace-env-js-stack", 1], ["--trace-env-native-stack", 1], ["--trace-env", 1]]);
const traceEnvJsStackFlag = /* @__PURE__ */ booleanFlag(false, [["--no-trace-env-js-stack", 2], ["--trace-env-js-stack", 1]]);
const traceEnvNativeStackFlag = /* @__PURE__ */ booleanFlag(false, [["--no-trace-env-native-stack", 2], ["--trace-env-native-stack", 1]]);
const traceEventCategoriesFlag = /* @__PURE__ */ stringFlag("", [["--trace-event-categories", 0], ["--trace-events-enabled", 4, "v8,node,node.async_hooks"]]);
const traceEventFilePatternFlag = /* @__PURE__ */ stringFlag("node_trace.${rotation}.log", [["--trace-event-file-pattern", 0]]);
const traceExitFlag = /* @__PURE__ */ booleanFlag(false, [["--no-trace-exit", 2], ["--trace-exit", 1]]);
const tracePromisesFlag = /* @__PURE__ */ booleanFlag(false, [["--no-trace-promises", 2], ["--trace-promises", 1]]);
const traceRequireModuleFlag = /* @__PURE__ */ stringFlag("", [["--trace-require-module", 0]]);
const traceSigintFlag = /* @__PURE__ */ booleanFlag(false, [["--no-trace-sigint", 2], ["--trace-sigint", 1]]);
const traceSyncIoFlag = /* @__PURE__ */ booleanFlag(false, [["--no-trace-sync-io", 2], ["--trace-sync-io", 1]]);
const traceTlsFlag = /* @__PURE__ */ booleanFlag(false, [["--no-trace-tls", 2], ["--trace-tls", 1]]);
const traceUncaughtFlag = /* @__PURE__ */ booleanFlag(false, [["--no-trace-uncaught", 2], ["--trace-uncaught", 1]]);
const traceWarningsFlag = /* @__PURE__ */ booleanFlag(false, [["--no-trace-warnings", 2], ["--trace-warnings", 1]]);
const trackHeapObjectsFlag = /* @__PURE__ */ booleanFlag(false, [["--no-track-heap-objects", 2], ["--track-heap-objects", 1]]);
const unhandledRejectionsFlag = /* @__PURE__ */ stringFlag("", [["--unhandled-rejections", 0]]);
const useBundledCaFlag = /* @__PURE__ */ booleanFlag(false, [["--no-use-bundled-ca", 2], ["--use-bundled-ca", 1]]);
const useEnvProxyFlag = /* @__PURE__ */ booleanFlag(false, [["--no-use-env-proxy", 2], ["--use-env-proxy", 1]]);
const useLargepagesFlag = /* @__PURE__ */ stringFlag("off", [["--use-largepages", 0]]);
const useOpensslCaFlag = /* @__PURE__ */ booleanFlag(false, [["--no-use-openssl-ca", 2], ["--use-openssl-ca", 1]]);
const useSystemCaFlag = /* @__PURE__ */ booleanFlag(false, [["--no-use-system-ca", 2], ["--use-system-ca", 1]]);
const v8OptionsFlag = /* @__PURE__ */ booleanFlag(false, [["--no-v8-options", 2], ["--v8-options", 1]]);
const v8PoolSizeFlag = /* @__PURE__ */ integerFlag(4, [["--v8-pool-size", 0]]);
const verifyBaseObjectsFlag = /* @__PURE__ */ booleanFlag(false, [["--no-verify-base-objects", 2], ["--node-memory-debug", 1], ["--verify-base-objects", 1]]);
const versionFlag = /* @__PURE__ */ booleanFlag(false, [["--no-version", 2], ["--version", 1], ["-v", 1]]);
const warningsFlag = /* @__PURE__ */ booleanFlag(true, [["--no-warnings", 2], ["--warnings", 1]]);
const watchFlag = /* @__PURE__ */ booleanFlag(false, [["--no-watch", 2], ["--watch-path", 1], ["--watch", 1]]);
const watchKillSignalFlag = /* @__PURE__ */ stringFlag("SIGTERM", [["--watch-kill-signal", 0]]);
const watchPathFlag = /* @__PURE__ */ stringListFlag([["--watch-path", 0]]);
const watchPreserveOutputFlag = /* @__PURE__ */ booleanFlag(false, [["--no-watch-preserve-output", 2], ["--watch-preserve-output", 1]]);
const zeroFillBuffersFlag = /* @__PURE__ */ booleanFlag(false, [["--no-zero-fill-buffers", 2], ["--zero-fill-buffers", 1]]);

export { abortOnUncaughtExceptionFlag, addonsFlag, allowAddonsFlag, allowChildProcessFlag, allowFfiFlag, allowFsReadFlag, allowFsWriteFlag, allowInspectorFlag, allowNetFlag, allowWasiFlag, allowWorkerFlag, asyncContextFrameFlag, buildSeaFlag, buildSnapshotConfigFlag, buildSnapshotFlag, checkFlag, completionBashFlag, conditionsFlag, cpuProfDirFlag, cpuProfFlag, cpuProfIntervalFlag, cpuProfNameFlag, debugArraybufferAllocationsFlag, debugBrkFlag, debugFlag, deprecationFlag, diagnosticDirFlag, disableProtoFlag, disableSigusr1Flag, disableWarningFlag, disableWasmTrapHandlerFlag, dnsResultOrderFlag, enableFipsFlag, enableSourceMapsFlag, entryUrlFlag, envFileFlag, envFileIfExistsFlag, evalFlag, experimentalAddonModulesFlag, experimentalConfigFileFlag, experimentalDetectModuleFlag, experimentalEventsourceFlag, experimentalFfiFlag, experimentalGlobalNavigatorFlag, experimentalImportMetaResolveFlag, experimentalImportTextFlag, experimentalInspectorNetworkResourceFlag, experimentalLoaderFlag, experimentalNetworkInspectionFlag, experimentalPackageMapFlag, experimentalPrintRequiredTlaFlag, experimentalReplAwaitFlag, experimentalRequireModuleFlag, experimentalSeaConfigFlag, experimentalShadowRealmFlag, experimentalSqliteFlag, experimentalStorageInspectionFlag, experimentalStreamIterFlag, experimentalTestCoverageFlag, experimentalTestModuleMocksFlag, experimentalTestTagFilterFlag, experimentalVfsFlag, experimentalVmModulesFlag, experimentalWebsocketFlag, experimentalWebstorageFlag, experimentalWorkerInspectionFlag, exposeInternalsFlag, extraInfoOnFatalExceptionFlag, forceAsyncHooksChecksFlag, forceContextAwareFlag, forceFipsFlag, forceNodeApiUncaughtExceptionsPolicyFlag, frozenIntrinsicsFlag, globalSearchPathsFlag, heapProfDirFlag, heapProfFlag, heapProfIntervalFlag, heapProfNameFlag, heapsnapshotNearHeapLimitFlag, heapsnapshotSignalFlag, helpFlag, icuDataDirFlag, importFlag, inputTypeFlag, insecureHttpParserFlag, inspectBrkFlag, inspectBrkNodeFlag, inspectFlag, inspectPortFlag, inspectPublishUidFlag, inspectWaitFlag, interactiveFlag, localstorageFileFlag, maxHttpHeaderSizeFlag, maxOldSpaceSizePercentageFlag, networkFamilyAutoselectionAttemptTimeoutFlag, networkFamilyAutoselectionFlag, nodeSnapshotFlag, opensslConfigFlag, opensslLegacyProviderFlag, opensslSharedConfigFlag, pendingDeprecationFlag, permissionAuditFlag, permissionFlag, preserveSymlinksFlag, preserveSymlinksMainFlag, printFlag, profProcessFlag, redirectWarningsFlag, reportCompactFlag, reportDirFlag, reportExcludeEnvFlag, reportExcludeNetworkFlag, reportFilenameFlag, reportOnFatalerrorFlag, reportOnSignalFlag, reportSignalFlag, reportUncaughtExceptionFlag, requireFlag, requireModuleFlag, runFlag, secureHeapFlag, secureHeapMinFlag, securityRevertFlag, snapshotBlobFlag, stackTraceLimitFlag, stripTypesFlag, testConcurrencyFlag, testCoverageBranchesFlag, testCoverageExcludeFlag, testCoverageFunctionsFlag, testCoverageIncludeFlag, testCoverageLinesFlag, testFlag, testForceExitFlag, testGlobalSetupFlag, testIsolationFlag, testNamePatternFlag, testOnlyFlag, testRandomSeedFlag, testRandomizeFlag, testReporterDestinationFlag, testReporterFlag, testRerunFailuresFlag, testShardFlag, testSkipPatternFlag, testTimeoutFlag, testUdpNoTrySendFlag, testUpdateSnapshotsFlag, throwDeprecationFlag, titleFlag, tlsCipherListFlag, tlsKeylogFlag, tlsMaxV12Flag, tlsMaxV13Flag, tlsMinV10Flag, tlsMinV11Flag, tlsMinV12Flag, tlsMinV13Flag, traceDeprecationFlag, traceEnvFlag, traceEnvJsStackFlag, traceEnvNativeStackFlag, traceEventCategoriesFlag, traceEventFilePatternFlag, traceExitFlag, tracePromisesFlag, traceRequireModuleFlag, traceSigintFlag, traceSyncIoFlag, traceTlsFlag, traceUncaughtFlag, traceWarningsFlag, trackHeapObjectsFlag, unhandledRejectionsFlag, useBundledCaFlag, useEnvProxyFlag, useLargepagesFlag, useOpensslCaFlag, useSystemCaFlag, v8OptionsFlag, v8PoolSizeFlag, verifyBaseObjectsFlag, versionFlag, warningsFlag, watchFlag, watchKillSignalFlag, watchPathFlag, watchPreserveOutputFlag, zeroFillBuffersFlag };

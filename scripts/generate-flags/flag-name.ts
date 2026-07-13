/**
 * The export name for an option's flag: drop leading dashes, camelCase on any
 * non-alphanumeric separator (`-`, `.`), and suffix `Flag`. The suffix keeps
 * reserved words like `import` valid (`importFlag`).
 *
 *   --conditions              -> conditionsFlag
 *   --inspect-brk             -> inspectBrkFlag
 *   --tls-max-v1.2            -> tlsMaxV12Flag
 *   --abort-on-uncaught-exception -> abortOnUncaughtExceptionFlag
 */
export const flagExportName = (optionName: string) => {
	const camel = optionName
		.replace(/^-+/, '')
		.replaceAll(
			/[^a-z0-9]+([a-z0-9])?/gi,
			(_match, next: string | undefined) => (next ? next.toUpperCase() : ''),
		);
	return `${camel}Flag`;
};

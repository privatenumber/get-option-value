import { describe, test, expect } from 'manten';
import { deriveEntryForms } from '../../scripts/generate-flags/emit.ts';
import type { Effect } from '../../scripts/generate-flags/resolve-effects.ts';

const VALUE: Effect = 0;
const SET_TRUE: Effect = 1;
const SET_FALSE: Effect = 2;

const effects = (...entries: [string, Effect][]) => new Map<string, Effect>(entries);
const alwaysEmittable = () => true;
const neverEmittable = () => false;

/**
 * Unit tests for the generate-time form derivation and its representability
 * guards. These exercise paths the real Node oracle sweep doesn't (the happy
 * path is covered there), using hand-built probe-effect maps.
 */
describe('deriveEntryForms', () => {
	describe('stores negated spellings literally', () => {
		test('a plain spelling that sets a flag false', () => {
			// e.g. a bare ImpliesNot — representable as a plain SET_FALSE form.
			expect(deriveEntryForms(
				'--x',
				{
					bare: effects(['--a', SET_FALSE]),
					space: effects(),
					equals: effects(),
				},
				alwaysEmittable,
			)).toStrictEqual([['--a', ['--x', SET_FALSE]]]);
		});

		test('a --no- spelling that sets a flag true', () => {
			// e.g. a negationImplies — stored as ["--no-x", 1], not on the plain spelling.
			expect(deriveEntryForms(
				'--x',
				{
					bare: effects(),
					space: effects(),
					equals: effects(),
					negated: effects(['--a', SET_TRUE]),
				},
				alwaysEmittable,
			)).toStrictEqual([['--a', ['--no-x', SET_TRUE]]]);
		});
	});

	describe('rejects unrepresentable spellings', () => {
		test('an =-only spelling with a non-value effect', () => {
			expect(() => deriveEntryForms(
				'--x',
				{
					bare: effects(),
					space: effects(),
					equals: effects(['--a', SET_TRUE]),
				},
				alwaysEmittable,
			)).toThrow(/"--x=" affects --a with a non-value effect/);
		});
	});

	describe('rejects spelling-dependent effects on the same flag', () => {
		test('bare vs space disagree', () => {
			expect(() => deriveEntryForms(
				'--x',
				{
					bare: effects(['--a', SET_TRUE]),
					space: effects(['--a', VALUE]),
					equals: effects(),
				},
				alwaysEmittable,
			)).toThrow(/Conflicting effects for --a: "--x" resolves it to 1 bare but 0 with a value/);
		});

		test('= vs non-equals disagree (space true, = false)', () => {
			// --x value -> --a true, --x=value -> --a false: a single form would
			// silently emit only the true spelling.
			expect(() => deriveEntryForms(
				'--x',
				{
					bare: effects(),
					space: effects(['--a', SET_TRUE]),
					equals: effects(['--a', SET_FALSE]),
				},
				alwaysEmittable,
			)).toThrow(/Conflicting effects for --a: "--x" resolves it to 1 but "--x=" to 2/);
		});
	});

	describe('ignores non-emittable targets', () => {
		test('a conflict on a bracketed internal does not throw', () => {
			// Mirrors the real `--use-bundled-ca` -> `[ssl_openssl_cert_store]`
			// plain ImpliesNot: unrepresentable in isolation, but never emitted.
			expect(() => deriveEntryForms(
				'--x',
				{
					bare: effects(['[internal]', SET_FALSE]),
					space: effects(),
					equals: effects(['[internal]', SET_TRUE]),
				},
				neverEmittable,
			)).not.toThrow();
		});
	});

	describe('emits representable forms', () => {
		test('a fixed alias value becomes a fixed-value form', () => {
			const forms = deriveEntryForms(
				'--trace-events-enabled',
				{
					bare: effects(['--trace-event-categories', 'v8,node,node.async_hooks']),
					space: effects(['--trace-event-categories', 'v8,node,node.async_hooks']),
					equals: effects(['--trace-event-categories', 'v8,node,node.async_hooks']),
				},
				alwaysEmittable,
			);
			expect(forms).toStrictEqual([
				['--trace-event-categories', [
					'--trace-events-enabled',
					4,
					'v8,node,node.async_hooks',
				]],
			]);
		});

		test('a boolean: plain sets true, --no- sets false', () => {
			const forms = deriveEntryForms(
				'--x',
				{
					bare: effects(['--x', SET_TRUE]),
					space: effects(['--x', SET_TRUE]),
					equals: effects(['--x', SET_TRUE]),
					negated: effects(['--x', SET_FALSE]),
				},
				alwaysEmittable,
			);
			expect(forms).toStrictEqual([
				['--x', ['--x', SET_TRUE]],
				['--x', ['--no-x', SET_FALSE]],
			]);
		});

		test('an =-only value option becomes a mode-3 form', () => {
			const forms = deriveEntryForms(
				'--x',
				{
					bare: effects(),
					space: effects(),
					equals: effects(['--a', VALUE]),
				},
				alwaysEmittable,
			);
			expect(forms).toStrictEqual([['--a', ['--x', 3]]]);
		});
	});
});

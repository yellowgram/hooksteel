import { grantCreditAdapter } from './grant_credit.js';
import { inviteGithubAdapter } from './invite_github.js';
import { sendEmailAdapter } from './send_email.js';
import type { FulfillmentAdapter } from './types.js';

/**
 * The built-in adapters are examples: they validate the payload and do nothing else.
 * Register your own under the same names (or new ones) before the worker runs.
 */
const examples = new Map<string, FulfillmentAdapter>([
  [grantCreditAdapter.name, grantCreditAdapter],
  [sendEmailAdapter.name, sendEmailAdapter],
  [inviteGithubAdapter.name, inviteGithubAdapter],
]);
const registered = new Map<string, FulfillmentAdapter>();

/** Register (or replace) the adapter for `adapter.name`. */
export function registerAdapter(adapter: FulfillmentAdapter): void {
  if (!adapter || typeof adapter.name !== 'string' || adapter.name === '' || typeof adapter.execute !== 'function') {
    throw new TypeError('registerAdapter needs { name: string, execute(ctx) }');
  }
  registered.set(adapter.name, adapter);
}

/** Forget every registered adapter (tests). */
export function resetAdapters(): void {
  registered.clear();
}

export function getAdapter(name: string): FulfillmentAdapter | undefined {
  return registered.get(name) ?? examples.get(name);
}

/** True when `name` would run a built-in example rather than an adapter you registered. */
export function isExampleAdapter(name: string): boolean {
  return !registered.has(name) && examples.has(name);
}

/**
 * Examples only run in tests or when asked for explicitly. Anywhere else they would
 * mark real orders fulfilled without doing anything, so they fail and retry instead.
 */
export function exampleAdaptersAllowed(): boolean {
  return process.env.NODE_ENV === 'test' || process.env.HOOKSTEEL_EXAMPLE_ADAPTERS === 'true';
}

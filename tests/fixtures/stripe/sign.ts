import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Stripe from 'stripe';
import { TEST_WEBHOOK_SECRET } from './secrets.js';

const fixturePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'checkout.session.completed.json');

let stripe: Stripe | undefined;

function client(): Stripe {
  if (!stripe) {
    stripe = new Stripe('hooksteel_webhook_verify_only_not_an_api_key');
  }
  return stripe;
}

export function readCheckoutFixture(): string {
  return readFileSync(fixturePath, 'utf8');
}

export interface FixtureOverrides {
  id?: string;
  type?: string;
  livemode?: boolean;
  customer_email?: string | null;
  /** The checkout session id. Defaults to one per event id, so distinct test events are distinct orders. */
  sessionId?: string;
}

/** The outbox idempotency key HookSteel derives for a fixture event (see src/outbox/enqueue.ts). */
export function stripeKey(eventId: string, adapter: string, type = 'checkout.session.completed', sessionId?: string): string {
  const session = sessionId ?? `cs_for_${eventId}`;
  // Payment-success events are keyed on the payment. The fixture session has no payment_intent
  // or invoice, so its id is the payment id; for invoice/payment_intent events pass the object id.
  if (['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'payment_intent.succeeded', 'invoice.paid', 'invoice.payment_succeeded'].includes(type)) {
    return `stripe|pay:${session}|${adapter}`;
  }
  return `stripe|${type}|${session}|${adapter}`;
}

export function checkoutBody(overrides: FixtureOverrides = {}): string {
  const event = JSON.parse(readCheckoutFixture()) as {
    id: string;
    type: string;
    livemode: boolean;
    data: { object: Record<string, unknown> };
  };
  if (overrides.id !== undefined) event.id = overrides.id;
  if (overrides.sessionId !== undefined) event.data.object.id = overrides.sessionId;
  else if (overrides.id !== undefined) event.data.object.id = `cs_for_${overrides.id}`;
  if (overrides.type !== undefined) event.type = overrides.type;
  if (overrides.livemode !== undefined) event.livemode = overrides.livemode;
  if (overrides.customer_email !== undefined) {
    event.data.object.customer_email = overrides.customer_email;
  }
  return JSON.stringify(event);
}

export function signBody(payload: string, secret = TEST_WEBHOOK_SECRET): string {
  return client().webhooks.generateTestHeaderString({
    payload,
    secret,
  });
}

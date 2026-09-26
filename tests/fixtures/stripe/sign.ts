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
}

export function checkoutBody(overrides: FixtureOverrides = {}): string {
  const event = JSON.parse(readCheckoutFixture()) as {
    id: string;
    type: string;
    livemode: boolean;
    data: { object: Record<string, unknown> };
  };
  if (overrides.id !== undefined) event.id = overrides.id;
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

import Stripe from 'stripe';

const PLACEHOLDER_SECRETS = new Set(['whsec_replace_me', 'replace_me', 'changeme', 'test']);

export type WebhookRejectCode = 'invalid_webhook_secret' | 'invalid_signature' | 'livemode_mismatch';

export class WebhookRejected extends Error {
  readonly code: WebhookRejectCode;

  constructor(code: WebhookRejectCode) {
    super(code);
    this.name = 'WebhookRejected';
    this.code = code;
  }
}

let stripe: Stripe | undefined;

/** Not a Stripe API key. The SDK constructor requires a non-empty string; verify never calls the API. */
export const WEBHOOK_VERIFY_CLIENT_SENTINEL = 'hooksteel_webhook_verify_only_not_an_api_key';

function stripeClient(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY || WEBHOOK_VERIFY_CLIENT_SENTINEL;
    stripe = new Stripe(key);
  }
  return stripe;
}

export function isInvalidWebhookSecret(secret: string | undefined | null): boolean {
  if (secret == null) return true;
  const trimmed = secret.trim();
  if (!trimmed) return true;
  if (PLACEHOLDER_SECRETS.has(trimmed)) return true;
  if (!trimmed.startsWith('whsec_')) return true;
  return false;
}

export function expectedLivemode(): boolean {
  const raw = process.env.STRIPE_EXPECT_LIVEMODE;
  if (raw === undefined || raw.trim() === '') return false;
  return raw === 'true' || raw === '1';
}

export function verifyStripeEvent(rawBody: string, signature: string | null): Stripe.Event {
  const secret = (process.env.STRIPE_WEBHOOK_SECRET ?? '').trim();
  if (isInvalidWebhookSecret(secret)) {
    throw new WebhookRejected('invalid_webhook_secret');
  }
  if (!signature) {
    throw new WebhookRejected('invalid_signature');
  }
  try {
    const event = stripeClient().webhooks.constructEvent(rawBody, signature, secret);
    if (event.livemode !== expectedLivemode()) {
      throw new WebhookRejected('livemode_mismatch');
    }
    return event;
  } catch (err) {
    if (err instanceof WebhookRejected) throw err;
    throw new WebhookRejected('invalid_signature');
  }
}

import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { POLAR_TEST_WEBHOOK_SECRET } from './secrets.js';

const fixturePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'order.paid.json');

export type PolarSignScheme = 'polar_hmac' | 'standard_webhooks';

export function readOrderPaidFixture(): string {
  return readFileSync(fixturePath, 'utf8');
}

export interface OrderPaidOverrides {
  type?: string;
  orderId?: string;
  customerId?: string;
  customerEmail?: string | null;
  totalAmount?: number;
  billingReason?: string;
  currency?: string;
  paid?: boolean;
  status?: string;
}

export function orderPaidBody(overrides: OrderPaidOverrides = {}): string {
  const event = JSON.parse(readOrderPaidFixture()) as {
    type: string;
    data: {
      id: string;
      customer_id: string;
      customer: { id?: string; email: string | null } | null;
      total_amount: number;
      currency: string;
      status: string;
      paid: boolean;
      billing_reason: string;
    };
  };
  if (overrides.type !== undefined) event.type = overrides.type;
  if (overrides.orderId !== undefined) event.data.id = overrides.orderId;
  if (overrides.customerId !== undefined) {
    event.data.customer_id = overrides.customerId;
    if (event.data.customer) event.data.customer.id = overrides.customerId;
  }
  if (overrides.customerEmail !== undefined && event.data.customer) {
    event.data.customer.email = overrides.customerEmail;
  }
  if (overrides.totalAmount !== undefined) event.data.total_amount = overrides.totalAmount;
  if (overrides.billingReason !== undefined) event.data.billing_reason = overrides.billingReason;
  if (overrides.currency !== undefined) event.data.currency = overrides.currency;
  if (overrides.paid !== undefined) event.data.paid = overrides.paid;
  if (overrides.status !== undefined) event.data.status = overrides.status;
  return JSON.stringify(event);
}

/** Independent of verify.ts so a shared key-derivation bug cannot hide. */
function strictBase64(value: string): Buffer | null {
  if (value.length === 0) return Buffer.alloc(0);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return null;
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  if (padding > 0 && value.length % 4 !== 0) return null;
  const dataLength = value.length - padding;
  if (dataLength % 4 === 1) return null;
  if (padding === 1 && dataLength % 4 !== 3) return null;
  if (padding === 2 && dataLength % 4 !== 2) return null;
  const padded = value.length % 4 === 0 ? value : value + '='.repeat(4 - (value.length % 4));
  const decoded = Buffer.from(padded, 'base64');
  const canonical = decoded.toString('base64').replace(/=+$/, '');
  if (canonical !== value.replace(/=+$/, '')) return null;
  return decoded;
}

function keyForScheme(secret: string, scheme: PolarSignScheme): Buffer {
  if (scheme === 'polar_hmac') return Buffer.from(secret, 'utf8');
  const remainder = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret;
  const decoded = strictBase64(remainder);
  if (!decoded || decoded.length === 0) {
    throw new Error('polar test secret remainder is not valid base64');
  }
  return decoded;
}

export interface PolarSignature {
  webhookId: string;
  webhookTimestamp: string;
  webhookSignature: string;
}

export function signPolar(options: {
  rawBody: string;
  secret?: string;
  scheme?: PolarSignScheme;
  webhookId?: string;
  webhookTimestamp?: string;
}): PolarSignature {
  const secret = options.secret ?? POLAR_TEST_WEBHOOK_SECRET;
  const scheme = options.scheme ?? 'standard_webhooks';
  const webhookId = options.webhookId ?? `msg_polar_${Date.now()}`;
  const webhookTimestamp = options.webhookTimestamp ?? String(Math.floor(Date.now() / 1000));
  const signed = `${webhookId}.${webhookTimestamp}.${options.rawBody}`;
  const mac = createHmac('sha256', keyForScheme(secret, scheme)).update(signed, 'utf8').digest('base64');
  return {
    webhookId,
    webhookTimestamp,
    webhookSignature: `v1,${mac}`,
  };
}

/** Chaos mints only the post-cutoff standard_webhooks key. */
export function polarHandleInput(
  rawBody: string,
  webhookId: string,
): {
  rawBody: string;
  webhookId: string;
  webhookTimestamp: string;
  webhookSignature: string;
} {
  const signed = signPolar({ rawBody, webhookId, scheme: 'standard_webhooks' });
  return {
    rawBody,
    webhookId: signed.webhookId,
    webhookTimestamp: signed.webhookTimestamp,
    webhookSignature: signed.webhookSignature,
  };
}

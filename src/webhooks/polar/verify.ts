import { createHmac, timingSafeEqual } from 'node:crypto';

const PLACEHOLDER_SECRETS = new Set(['whsec_replace_me', 'replace_me', 'changeme', 'test']);
const TIMESTAMP_TOLERANCE_SECONDS = 300;
const INTEGER_TIMESTAMP = /^-?(?:0|[1-9][0-9]*)$/;

export type PolarRejectCode = 'invalid_webhook_secret' | 'invalid_signature' | 'invalid_payload';

export class PolarWebhookRejected extends Error {
  readonly code: PolarRejectCode;

  constructor(code: PolarRejectCode) {
    super(code);
    this.name = 'PolarWebhookRejected';
    this.code = code;
  }
}

export interface VerifiedPolarWebhook {
  webhookId: string;
  livemode: boolean;
  event: {
    type: string;
    data?: unknown;
  };
}

export interface PolarVerifyInput {
  rawBody: string;
  webhookId: string | null;
  webhookTimestamp: string | null;
  webhookSignature: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Standard base64 only. Illegal characters and whitespace are rejected, not skipped. */
export function strictBase64(value: string): Uint8Array | null {
  if (value.length === 0) return new Uint8Array();
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

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  return timingSafeEqual(left, right);
}

function isInvalidWebhookSecret(secret: string): boolean {
  if (!secret) return true;
  if (PLACEHOLDER_SECRETS.has(secret)) return true;
  if (!secret.startsWith('whsec_')) return true;
  return false;
}

/** Unset or empty → false. `true` or `1` → true. Anything else → false. */
export function expectedPolarLivemode(): boolean {
  const raw = process.env.POLAR_EXPECT_LIVEMODE;
  if (raw === undefined || raw.trim() === '') return false;
  return raw === 'true' || raw === '1';
}

function headerValue(value: string | null): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseTimestamp(value: string): number | null {
  if (!INTEGER_TIMESTAMP.test(value)) return null;
  if (value.replace('-', '').length > 15) return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) return null;
  return parsed;
}

/**
 * Dual-key HMAC. Pre-2026-09-08 Polar secrets use the UTF-8 secret.
 * Later secrets use the base64 remainder after `whsec_`. Both are tried.
 */
function hmacKeys(secret: string): Uint8Array[] {
  const utf8Key = Buffer.from(secret, 'utf8');
  const keys: Uint8Array[] = [utf8Key];
  const remainder = secret.slice('whsec_'.length);
  const decoded = strictBase64(remainder);
  if (decoded && decoded.byteLength > 0 && !sameBytes(decoded, utf8Key)) {
    keys.push(decoded);
  }
  return keys;
}

function signatureMatches(webhookSignature: string, signed: string, keys: readonly Uint8Array[]): boolean {
  for (const token of webhookSignature.split(' ')) {
    if (!token) continue;
    const comma = token.indexOf(',');
    if (comma <= 0) continue;
    if (token.slice(0, comma) !== 'v1') continue;
    const sigBytes = strictBase64(token.slice(comma + 1));
    if (!sigBytes) continue;
    for (const key of keys) {
      const mac = createHmac('sha256', key).update(signed, 'utf8').digest();
      if (sameBytes(sigBytes, mac)) return true;
    }
  }
  return false;
}

export function verifyPolarWebhook(input: PolarVerifyInput): VerifiedPolarWebhook {
  const secret = (process.env.POLAR_WEBHOOK_SECRET ?? '').trim();
  if (isInvalidWebhookSecret(secret)) {
    throw new PolarWebhookRejected('invalid_webhook_secret');
  }

  const webhookId = headerValue(input.webhookId);
  const webhookTimestamp = headerValue(input.webhookTimestamp);
  const webhookSignature = headerValue(input.webhookSignature);
  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    throw new PolarWebhookRejected('invalid_signature');
  }
  if (webhookId.includes('.')) {
    throw new PolarWebhookRejected('invalid_signature');
  }

  const timestamp = parseTimestamp(webhookTimestamp);
  if (timestamp === null) {
    throw new PolarWebhookRejected('invalid_signature');
  }
  const now = Date.now() / 1000;
  if (timestamp < now - TIMESTAMP_TOLERANCE_SECONDS || timestamp > now + TIMESTAMP_TOLERANCE_SECONDS) {
    throw new PolarWebhookRejected('invalid_signature');
  }

  const signed = `${webhookId}.${webhookTimestamp}.${input.rawBody}`;
  if (!signatureMatches(webhookSignature, signed, hmacKeys(secret))) {
    throw new PolarWebhookRejected('invalid_signature');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(input.rawBody);
  } catch {
    throw new PolarWebhookRejected('invalid_payload');
  }
  if (!isRecord(parsed) || typeof parsed.type !== 'string') {
    throw new PolarWebhookRejected('invalid_payload');
  }

  return {
    webhookId,
    livemode: expectedPolarLivemode(),
    event: parsed as { type: string; data?: unknown },
  };
}

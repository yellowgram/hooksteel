import { grantCreditAdapter } from './grant_credit.js';
import { inviteGithubAdapter } from './invite_github.js';
import { sendEmailAdapter } from './send_email.js';
import type { FulfillmentAdapter } from './types.js';

const adapters = new Map<string, FulfillmentAdapter>([
  [grantCreditAdapter.name, grantCreditAdapter],
  [sendEmailAdapter.name, sendEmailAdapter],
  [inviteGithubAdapter.name, inviteGithubAdapter],
]);

export function getAdapter(name: string): FulfillmentAdapter | undefined {
  return adapters.get(name);
}

let afterInvocation: ((idempotencyKey: string) => Promise<void> | void) | null = null;

function chaosHooksAllowed(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.ALLOW_CHAOS_INJECT === 'true';
}

export function setAfterInvocationHook(
  hook: ((idempotencyKey: string) => Promise<void> | void) | null,
): void {
  if (!chaosHooksAllowed()) {
    throw new Error('after-invocation hook is disabled (production forces off; ALLOW_CHAOS_INJECT must be true)');
  }
  afterInvocation = hook;
}

export async function runAfterInvocationHook(idempotencyKey: string): Promise<void> {
  if (!chaosHooksAllowed() || !afterInvocation) return;
  await afterInvocation(idempotencyKey);
}

import { handlePolar } from 'hooksteel';

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  return handlePolar({
    rawBody,
    webhookId: request.headers.get('webhook-id'),
    webhookTimestamp: request.headers.get('webhook-timestamp'),
    webhookSignature: request.headers.get('webhook-signature'),
  });
}

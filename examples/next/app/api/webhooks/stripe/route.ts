import { handle } from 'hooksteel';

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');
  return handle({ rawBody, signature });
}

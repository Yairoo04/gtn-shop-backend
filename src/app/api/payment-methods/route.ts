import { NextRequest } from 'next/server';
import { getPaymentMethods } from '~/app/controllers/payment-method.controller';

export async function GET(req: NextRequest) {
  return getPaymentMethods(req);
}

export const OPTIONS = () => new Response(null, { status: 204 });
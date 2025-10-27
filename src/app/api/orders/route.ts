import { NextRequest } from 'next/server';
import { getOrders, createOrder, placeOrderFromCartController, cancelOrderController } from '../../controllers/order.controller';

export async function GET(req: NextRequest) {
  return getOrders(req);
}

export async function POST(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path.endsWith('/from-cart')) {
    return placeOrderFromCartController(req);
  } else if (path.endsWith('/cancel')) {
    return cancelOrderController(req);
  }
  return createOrder(req);
}
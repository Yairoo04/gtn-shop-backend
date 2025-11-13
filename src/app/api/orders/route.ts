// app/api/order/route.ts (Hoàn chỉnh: Đảm bảo import đúng)
import { NextRequest } from 'next/server';
import { getOrders, createOrder, placeOrderFromCartController, cancelOrderController, buyNowController } from '~/app/controllers/order.controller'; // Sửa path nếu cần

export async function GET(req: NextRequest) {
  return getOrders(req);
}

export async function POST(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path.endsWith('/from-cart')) {
    return placeOrderFromCartController(req);
  } else if (path.endsWith('/buy-now')) {
    return buyNowController(req);
  } else if (path.endsWith('/cancel')) {
    return cancelOrderController(req);
  }
  return createOrder(req);
}
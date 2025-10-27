import { NextRequest } from 'next/server';
import { getAllOrdersAdmin, getOrderDetailsAdmin, updateOrderStatusAdmin } from '../../../controllers/order.controller';

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('orderId')) {
    return getOrderDetailsAdmin(req);
  }
  return getAllOrdersAdmin(req);
}

export async function PUT(req: NextRequest) {
  return updateOrderStatusAdmin(req);
}
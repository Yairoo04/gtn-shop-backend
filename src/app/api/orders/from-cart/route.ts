// app/api/orders/from-cart/route.ts
import { NextRequest } from "next/server";
import { placeOrderFromCartController } from "~/app/controllers/order.controller";

export async function POST(req: NextRequest) {
  return placeOrderFromCartController(req);
}

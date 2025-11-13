// app/api/orders/buy-now/route.ts
import { NextRequest } from "next/server";
import { buyNowController } from "~/app/controllers/order.controller";

export async function POST(req: NextRequest) {
  return buyNowController(req);
}

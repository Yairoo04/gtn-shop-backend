import { NextRequest } from "next/server";
import { getOrders } from "~/app/controllers/order.controller";

export async function GET(req: NextRequest) {
  return getOrders(req);
}

// CORS
export const OPTIONS = () => new Response(null, { status: 204 });

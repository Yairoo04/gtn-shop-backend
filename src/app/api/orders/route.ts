import { NextRequest } from "next/server";
import { getOrderCustomer } from "~/app/controllers/order.controller";

export async function GET(req: NextRequest) {
  return getOrderCustomer(req);
}

// CORS
export const OPTIONS = () => new Response(null, { status: 204 });

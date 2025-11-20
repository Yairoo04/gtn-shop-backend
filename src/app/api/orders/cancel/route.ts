import { NextRequest } from "next/server";
import { cancelOrderController } from "~/app/controllers/order.controller";

export async function POST(req: NextRequest) {
  return cancelOrderController(req);
}

// CORS
export const OPTIONS = () => new Response(null, { status: 204 });
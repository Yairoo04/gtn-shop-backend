import { NextRequest } from "next/server";
import { addToCartController, viewCartController } from "~/app/controllers/cart.controller";

export async function GET(req: NextRequest) {
  return viewCartController(req);
}

export async function POST(req: NextRequest) {
  return addToCartController(req);
}

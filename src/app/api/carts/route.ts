import { NextRequest } from 'next/server';
import { addToCartController, viewCartController } from '../../controllers/cart.controller';

export async function POST(req: NextRequest) {
  return addToCartController(req);
}

export async function GET(req: NextRequest) {
  return viewCartController(req);
}
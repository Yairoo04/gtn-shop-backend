import { NextRequest } from 'next/server';
import { getProductDetailsController } from '../../../controllers/product.controller';

export async function GET(req: NextRequest) {
  return getProductDetailsController(req);
}
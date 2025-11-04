// (Giả sử ở app/api/products/route.ts)
import { NextRequest } from 'next/server';
import { getProductDetailsController } from '../../../controllers/product.controller';

export async function GET(req: NextRequest) {
  return getProductDetailsController(req);
}
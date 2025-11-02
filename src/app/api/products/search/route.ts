// src/app/api/products/search/route.ts

import { NextRequest } from 'next/server';
import { searchProductsController } from '../../../controllers/product.controller';

export async function POST(req: NextRequest) {
  return searchProductsController(req);
}
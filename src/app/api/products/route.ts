import { NextRequest } from 'next/server';
import {
  getProducts,
  getProduct,
  createNewProduct,
  updateProduct,
  deleteProduct,
} from '../../controllers/product.controller';

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('id')) {
    return getProduct(req);
  }
  return getProducts();
}

export async function POST(req: NextRequest) {
  return createNewProduct(req);
}

export async function PUT(req: NextRequest) {
  return updateProduct(req);
}

export async function DELETE(req: NextRequest) {
  return deleteProduct(req);
}

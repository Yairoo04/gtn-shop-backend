import { NextRequest, NextResponse } from 'next/server';
import { getProducts, createNewProduct, updateProduct, deleteProduct } from '../../controllers/product.controller';

export async function GET() {
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
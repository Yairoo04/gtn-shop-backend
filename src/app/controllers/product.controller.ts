import { NextRequest, NextResponse } from 'next/server';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct as updateProductModel,
  deleteProduct as deleteProductModel,
} from '../models/product.model';

// GET /api/products
export const getProducts = async () => {
  try {
    const products = await getAllProducts();
    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch products' }, { status: 500 });
  }
};

// GET /api/products?id=1
export const getProduct = async (req: NextRequest) => {
  const id = parseInt(req.nextUrl.searchParams.get('id') || '0', 10);
  if (!id) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  try {
    const product = await getProductById(id);
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch product' }, { status: 500 });
  }
};

// POST /api/products
export const createNewProduct = async (req: NextRequest) => {
  try {
    const body = await req.json();
    if (!body.name || !body.price) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const newProduct = await createProduct({
      name: body.name,
      description: body.description || '',
      price: body.price,
      category: body.category || '',
      stock: body.stock || 0,
      image_url: body.image_url || '',
    });
    return NextResponse.json({ success: true, data: newProduct }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create product' }, { status: 500 });
  }
};

// PUT /api/products
export const updateProduct = async (req: NextRequest) => {
  try {
    const body = await req.json();
    const id = parseInt(body.id, 10);
    if (!id) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const updatedProduct = await updateProductModel(id, body);
    if (!updatedProduct) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: updatedProduct });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update product' }, { status: 500 });
  }
};

// DELETE /api/products?id=1
export const deleteProduct = async (req: NextRequest) => {
  try {
    const id = parseInt(req.nextUrl.searchParams.get('id') || '0', 10);
    if (!id) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const success = await deleteProductModel(id);
    if (!success) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    return NextResponse.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete product' }, { status: 500 });
  }
};

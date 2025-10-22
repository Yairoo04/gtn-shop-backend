// product.controller.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct as updateProductModel,
  deleteProduct as deleteProductModel,
  searchProducts,
  getProductDetails,
  addProduct
} from '../models/product.model';

export const getProducts = async () => {
  try {
    const products = await getAllProducts();
    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch products' }, { status: 500 });
  }
};

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

export const createNewProduct = async (req: NextRequest) => {
  try {
    const body = await req.json();
    if (!body.name || !body.price) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const newProduct = await addProduct(body); // Use addProduct which calls dbo.AddProduct
    return NextResponse.json({ success: true, data: newProduct }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create product' }, { status: 500 });
  }
};

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

export const searchProductsController = async (req: NextRequest) => {
  try {
    const { keyword, minPrice, maxPrice, categoryId, page = 1, pageSize = 20 } = await req.json();
    const products = await searchProducts(keyword, minPrice, maxPrice, categoryId, page, pageSize);
    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to search products' }, { status: 500 });
  }
};

export const getProductDetailsController = async (req: NextRequest) => {
  const id = parseInt(req.nextUrl.searchParams.get('id') || '0', 10);
  if (!id) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  try {
    const product = await getProductDetails(id);
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch product details' }, { status: 500 });
  }
};
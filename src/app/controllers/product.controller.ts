// src/controllers/product.controller.ts

import { NextRequest, NextResponse } from 'next/server';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  getProductDetails,
} from '../models/product.model';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const keyword = searchParams.get('keyword') || undefined;
    const minPrice = parseFloat(searchParams.get('minPrice') || '') || undefined;
    const maxPrice = parseFloat(searchParams.get('maxPrice') || '') || undefined;
    const categoryId = parseInt(searchParams.get('categoryId') || '', 10) || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const details = searchParams.get('details');

    if (productId) {
      const id = parseInt(productId, 10);
      if (isNaN(id)) {
        return NextResponse.json({ success: false, error: 'Invalid productId' }, { status: 400 });
      }
      if (details) {
        const product = await getProductDetails(id);
        return NextResponse.json({ success: true, data: product });
      }
      const product = await getProductById(id);
      return NextResponse.json({ success: true, data: product });
    } else if (keyword || minPrice || maxPrice || categoryId) {
      const products = await searchProducts(keyword, minPrice, maxPrice, categoryId, page, pageSize);
      return NextResponse.json({ success: true, data: products });
    } else {
      const products = await getAllProducts();
      return NextResponse.json({ success: true, data: products });
    }
  } catch (error: any) {
    console.error('Product GET error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const product = await createProduct(body);
    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error: any) {
    console.error('Product POST error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to create product' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = parseInt(searchParams.get('productId') || '', 10);
    if (isNaN(productId)) {
      return NextResponse.json({ success: false, error: 'Invalid productId' }, { status: 400 });
    }
    const body = await req.json();
    const updatedProduct = await updateProduct(productId, body);
    if (!updatedProduct) {
      return NextResponse.json({ success: false, error: 'No updates applied or product not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: updatedProduct });
  } catch (error: any) {
    console.error('Product PUT error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = parseInt(searchParams.get('productId') || '', 10);
    if (isNaN(productId)) {
      return NextResponse.json({ success: false, error: 'Invalid productId' }, { status: 400 });
    }
    const success = await deleteProduct(productId);
    if (!success) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Product deleted' });
  } catch (error: any) {
    console.error('Product DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to delete product' }, { status: 500 });
  }
}

// Thêm hàm mới cho search qua POST
export async function searchProductsController(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      keyword,
      minPrice,
      maxPrice,
      categoryId,
      page = 1,
      pageSize = 20,
    } = body;

    // Gọi hàm search từ model
    const products = await searchProducts(
      keyword,
      minPrice,
      maxPrice,
      categoryId,
      page,
      pageSize
    );

    return NextResponse.json({ success: true, data: products });
  } catch (error: any) {
    console.error('Search products error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to search products' },
      { status: 500 }
    );
  }
}
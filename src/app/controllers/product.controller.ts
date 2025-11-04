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
  updateProductSpecs,
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
        const productDetails = await getProductDetails(id);
        if (!productDetails.product) {
          return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: productDetails });
      }
      const product = await getProductById(id);
      if (!product) {
        return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: product });
    } else if (keyword || minPrice || maxPrice || categoryId) {
      const products = await searchProducts(keyword, minPrice, maxPrice, categoryId, page, pageSize);
      return NextResponse.json({ success: true, data: products });
    } else {
      const products = await getAllProducts();
      return NextResponse.json({ success: true, data: products });
    }
  } catch (error: any) {
    console.error('Product GET error:', error.message, error.stack);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const product = await createProduct(body);
    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error: any) {
    console.error('Product POST error:', error.message, error.stack);
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

    let body;
    try {
      body = await req.json(); // Parse JSON
      console.log('Received body for PUT:', body);  // Debug: Check body có specs không
    } catch (parseError: any) {
      console.error('JSON parse error:', parseError.message);
      return NextResponse.json({ success: false, error: 'Invalid JSON body: ' + parseError.message }, { status: 400 });
    }

    // Validation cơ bản
    if (body.specs && !Array.isArray(body.specs)) {
      return NextResponse.json({ success: false, error: 'Specs must be an array' }, { status: 400 });
    }
    if (Object.keys(body).length === 0) {
      return NextResponse.json({ success: false, error: 'No data to update' }, { status: 400 });
    }

    const updatedProduct = await updateProduct(productId, body);
    if (!updatedProduct) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    // Update specs nếu có
    if (body.specs && Array.isArray(body.specs)) {
      console.log('Updating specs with:', body.specs);  // Debug: Check specs trước khi update
      await updateProductSpecs(productId, body.specs);
    }

    // Fetch lại details để trả về full data
    const productDetails = await getProductDetails(productId);
    return NextResponse.json({ success: true, data: productDetails });
  } catch (error: any) {
    console.error('Product PUT error:', error.message, error.stack);
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
    console.error('Product DELETE error:', error.message, error.stack);
    return NextResponse.json({ success: false, error: error.message || 'Failed to delete product' }, { status: 500 });
  }
}

// Additional controllers (if used)
export async function searchProductsController(req: NextRequest) {
  try {
    const body = await req.json();
    const { keyword, minPrice, maxPrice, categoryId, page = 1, pageSize = 20 } = body;
    const products = await searchProducts(keyword, minPrice, maxPrice, categoryId, page, pageSize);
    return NextResponse.json({ success: true, data: products });
  } catch (error: any) {
    console.error('Search products error:', error.message, error.stack);
    return NextResponse.json({ success: false, error: error.message || 'Failed to search products' }, { status: 500 });
  }
}

export async function getProductDetailsController(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productIdStr = searchParams.get('productId');
    const details = searchParams.get('details');

    if (!productIdStr) {
      return NextResponse.json({ success: false, error: 'Missing productId' }, { status: 400 });
    }

    const productId = parseInt(productIdStr, 10);
    if (isNaN(productId)) {
      return NextResponse.json({ success: false, error: 'Invalid productId' }, { status: 400 });
    }

    let data;
    if (details) {
      data = await getProductDetails(productId);
      if (!data.product) {
        return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
      }
    } else {
      data = await getProductById(productId);
      if (!data) {
        return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Get product details error:', error.message, error.stack);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch product details' }, { status: 500 });
  }
}
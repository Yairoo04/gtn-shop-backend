// app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  getProductDetails,
  seedSpecsForProduct, // Import nếu cần seed (comment out nếu không dùng)
} from '~/app/models/product.model';
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
    // // Comment out: Param test để seed specs (chỉ dùng cho dev, gọi /api/products?seed=true&productId=3)
    // const seed = searchParams.get('seed');
    // if (seed && productId) {
    //   const id = parseInt(productId, 10);
    //   if (!isNaN(id)) {
    //     await seedSpecsForProduct(id);
    //     return NextResponse.json({ success: true, message: Seeded specs for product ${id} });
    //   }
    // }
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
      } else {
        const product = await getProductById(id);
        if (!product) {
          return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: product });
      }
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
    const body = await req.json();
    const updatedProduct = await updateProduct(productId, body);
    if (!updatedProduct) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: updatedProduct });
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
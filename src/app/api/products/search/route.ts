// src/app/api/search/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { searchProducts } from '~/app/models/product.model'; // Adjust path based on your structure

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get('q') || undefined;
    const minPrice = parseFloat(searchParams.get('minPrice') || '') || undefined;
    const maxPrice = parseFloat(searchParams.get('maxPrice') || '') || undefined;
    const categoryId = parseInt(searchParams.get('categoryId') || '', 10) || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    if (!keyword) {
      return NextResponse.json({ success: false, error: 'Missing search query (q)' }, { status: 400 });
    }

    const products = await searchProducts(keyword, minPrice, maxPrice, categoryId, page, pageSize);
    return NextResponse.json({ success: true, data: products });
  } catch (error: any) {
    console.error('Search GET error:', error.message, error.stack);
    return NextResponse.json({ success: false, error: error.message || 'Failed to search products' }, { status: 500 });
  }
}
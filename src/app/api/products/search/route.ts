// src/app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { searchProducts } from '~/app/models/product.model'; // đảm bảo đúng đường dẫn

// === Phân tích text query kiểu "laptop tren 20 trieu"
function parseQueryText(q: string) {
  const lower = q.toLowerCase();
  let minPrice: number | undefined;
  let maxPrice: number | undefined;
  let categoryId: number | undefined;

  // Danh mục
  if (lower.includes('laptop')) categoryId = 1;
  else if (lower.includes('pc')) categoryId = 2;
  else if (lower.includes('màn hình') || lower.includes('monitor')) categoryId = 3;
  else if (lower.includes('bàn phím') || lower.includes('keyboard')) categoryId = 4;
  else if (lower.includes('chuột') || lower.includes('mouse')) categoryId = 5;

  // Giá tiền
  const priceRegex = /(\d+)\s*(tr|triệu)/g;
  const matches = Array.from(lower.matchAll(priceRegex));

  if (lower.includes('duoi') || lower.includes('dưới')) {
    const val = matches[0] ? parseInt(matches[0][1]) * 1_000_000 : undefined;
    maxPrice = val;
  } else if (lower.includes('tren') || lower.includes('trên')) {
    const val = matches[0] ? parseInt(matches[0][1]) * 1_000_000 : undefined;
    minPrice = val;
  } else if (lower.includes('tu') || lower.includes('từ')) {
    if (matches.length >= 2) {
      minPrice = parseInt(matches[0][1]) * 1_000_000;
      maxPrice = parseInt(matches[1][1]) * 1_000_000;
    }
  }

  return { keyword: q, minPrice, maxPrice, categoryId };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let keyword = searchParams.get('q') || '';
    let minPrice = parseFloat(searchParams.get('minPrice') || '') || undefined;
    let maxPrice = parseFloat(searchParams.get('maxPrice') || '') || undefined;
    let categoryId = parseInt(searchParams.get('categoryId') || '', 10) || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    if (!keyword) {
      return NextResponse.json({ success: false, error: 'Missing search query (q)' }, { status: 400 });
    }

    // Tự động suy luận điều kiện
    const inferred = parseQueryText(keyword);
    minPrice = minPrice ?? inferred.minPrice;
    maxPrice = maxPrice ?? inferred.maxPrice;
    categoryId = categoryId ?? inferred.categoryId;

    // Thực thi truy vấn
    const products = await searchProducts(
      inferred.keyword,
      minPrice,
      maxPrice,
      categoryId,
      page,
      pageSize
    );

    // Nếu không có kết quả, fallback lấy toàn bộ (giúp demo)
    if (!products || products.length === 0) {
      console.warn(`[search] No result for "${keyword}", fallback to all`);
      const fallback = await searchProducts('', undefined, undefined, categoryId, 1, 100);
      return NextResponse.json({ success: true, data: fallback });
    }

    return NextResponse.json({ success: true, data: products });
  } catch (error: any) {
    console.error('Search GET error:', error.message, error.stack);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to search products' },
      { status: 500 }
    );
  }
}

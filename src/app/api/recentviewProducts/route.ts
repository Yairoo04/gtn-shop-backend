import { NextRequest, NextResponse } from 'next/server';
import { addRecentView, getRecentViewProducts } from '~/app/models/recentViewProduct.model';

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// === OPTIONS (Preflight) ===
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// === POST: /api/recentviewProducts ===
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, productId } = body;

    console.log('[POST /api/recentviewProducts] Request:', { userId, productId });

    // === VALIDATION ===
    if (!userId || !productId) {
      return NextResponse.json(
        { success: false, error: 'userId và productId là bắt buộc' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!Number.isInteger(userId) || !Number.isInteger(productId) || userId <= 0 || productId <= 0) {
      return NextResponse.json(
        { success: false, error: 'userId và productId phải là số nguyên dương' },
        { status: 400, headers: corsHeaders }
      );
    }

    // === GỌI SP AddRecentView ===
    await addRecentView(userId, productId);

    console.log(`[POST] Đã lưu thành công: userId=${userId}, productId=${productId}`);

    return NextResponse.json(
      { success: true, message: 'Đã thêm vào sản phẩm đã xem' },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('[POST] Lỗi khi thêm sản phẩm đã xem:', error);

    const message = error.message?.includes('Product') 
      ? 'Sản phẩm không tồn tại hoặc đã bị ẩn' 
      : 'Lỗi hệ thống khi lưu sản phẩm đã xem';

    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// === GET: /api/recentviewProducts?userId=3&limit=10 ===
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get('userId');
    const limitParam = searchParams.get('limit');

    console.log('[GET /api/recentviewProducts] Query:', { userId: userIdParam, limit: limitParam });

    // === VALIDATION userId ===
    if (!userIdParam) {
      return NextResponse.json(
        { success: false, error: 'Thiếu tham số userId' },
        { status: 400, headers: corsHeaders }
      );
    }

    const userId = parseInt(userIdParam, 10);
    if (isNaN(userId) || userId <= 0) {
      return NextResponse.json(
        { success: false, error: 'userId không hợp lệ' },
        { status: 400, headers: corsHeaders }
      );
    }

    // === VALIDATION limit ===
    const rawLimit = limitParam ? parseInt(limitParam, 10) : 10;
    const limit = isNaN(rawLimit) ? 10 : Math.min(Math.max(rawLimit, 1), 50);

    // === GỌI SP GetRecentViewedProducts ===
    const products = await getRecentViewProducts(userId, limit);

    console.log(`[GET] Trả về ${products.length} sản phẩm cho userId=${userId}`);

    return NextResponse.json(
      {
        success: true,
        count: products.length,
        data: products.map(p => ({
          ProductId: p.ProductId,
          Name: p.Name,
          Price: p.Price,
          DiscountPrice: p.DiscountPrice,
          DisplayPrice: p.DisplayPrice,
          ImageUrl: p.ImageUrl,
          ViewedAt: p.ViewedAt,
        })),
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('[GET] Lỗi khi lấy danh sách sản phẩm đã xem:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi hệ thống khi lấy dữ liệu' },
      { status: 500, headers: corsHeaders }
    );
  }
}
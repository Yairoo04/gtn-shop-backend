import { NextRequest, NextResponse } from 'next/server';
import {
  addRecentView,
  getRecentViewProducts,
  getAllRecentViewProducts,
} from '~/app/models/recentViewProduct.model';

// --- Cấu hình CORS (nếu cần gọi từ domain khác) ---
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// OPTIONS: để preflight trả về 204 thay vì đụng vào POST
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// =========================
// POST: thêm sản phẩm đã xem
// =========================
export async function POST(req: NextRequest) {
  try {
    // Đọc body an toàn: nếu rỗng thì không parse
    const raw = await req.text().catch(() => '');
    if (!raw || raw.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Empty body. Expect JSON: { userId, productId }' },
        { status: 400, headers: corsHeaders }
      );
    }

    let body: any;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400, headers: corsHeaders }
      );
    }

    let { userId, productId } = body ?? {};
    // Cho phép client gửi string; ép về number
    userId = Number(userId);
    productId = Number(productId);

    if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(productId) || productId <= 0) {
      return NextResponse.json(
        { success: false, error: 'userId and productId must be positive integers' },
        { status: 400, headers: corsHeaders }
      );
    }

    await addRecentView(userId, productId);
    return NextResponse.json(
      { success: true, message: 'Recent view added' },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Add recent view error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to add recent view' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// =========================
// GET: lấy danh sách đã xem
//  - Có userId: danh sách của user
//  - Không có userId: admin xem toàn bộ
// =========================
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get('userId');
    const limitParam = searchParams.get('limit');

    // Limit mặc định 10, chặn biên 1..50 để tránh lạm dụng
    let limit = Number(limitParam ?? 10);
    if (!Number.isInteger(limit) || limit < 1) limit = 10;
    if (limit > 50) limit = 50;

    if (userIdParam) {
      const userId = Number(userIdParam);
      if (!Number.isInteger(userId) || userId <= 0) {
        return NextResponse.json(
          { success: false, error: 'Valid userId is required' },
          { status: 400, headers: corsHeaders }
        );
      }

      const products = await getRecentViewProducts(userId, limit);
      return NextResponse.json(
        { success: true, data: products },
        { status: 200, headers: corsHeaders }
      );
    }

    // Admin: không truyền userId
    const allRecentViews = await getAllRecentViewProducts();
    return NextResponse.json(
      { success: true, count: allRecentViews.length, data: allRecentViews },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Get recent views error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch recent views' },
      { status: 500, headers: corsHeaders }
    );
  }
}

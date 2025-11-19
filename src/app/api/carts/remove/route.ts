import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getPool } from "~/app/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cartId, productId } = body;

    if (!cartId || !productId) {
      return NextResponse.json(
        { success: false, message: "Thiếu cartId hoặc productId" },
        { status: 400 }
      );
    }

    const GUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!GUID_REGEX.test(cartId)) {
      return NextResponse.json(
        { success: false, message: "cartId không hợp lệ" },
        { status: 400 }
      );
    }

    const pool = await getPool();
    const result = await pool
      .request()
      .input("CartId", sql.UniqueIdentifier, cartId)
      .input("ProductId", sql.Int, Number(productId))
      .execute("dbo.RemoveFromCart");

    // SP trả về số dòng bị xóa
    const rowsAffected = result.rowsAffected[0];
    if (rowsAffected === 0) {
      return NextResponse.json(
        { success: false, message: "Sản phẩm không tồn tại trong giỏ" },
        { status: 404 }
      );
    }

    console.log(`[REMOVE] Xóa thành công ProductId=${productId} khỏi CartId=${cartId}`);
    return NextResponse.json({ success: true, message: "Đã xóa khỏi giỏ hàng" }, { status: 200 });
  } catch (err: any) {
    console.error("[REMOVE API] Lỗi:", err);
    return NextResponse.json(
      { success: false, message: "Lỗi server", error: err.message },
      { status: 500 }
    );
  }
}
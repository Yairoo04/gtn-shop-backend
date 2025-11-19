// app/api/carts/view/route.ts
import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getPool } from "~/app/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cartId = searchParams.get("cartId");

    if (!cartId || !/^[0-9a-fA-F-]{36}$/i.test(cartId)) {
      return NextResponse.json(
        { success: false, message: "cartId không hợp lệ" },
        { status: 400 }
      );
    }

    const pool = await getPool();
    const result = await pool
      .request()
      .input("CartId", sql.UniqueIdentifier, cartId)
      .execute("dbo.ViewCart");

    const items = result.recordset;

    return NextResponse.json({
      success: true,
      cartId,
      items,
      totalItems: items.length,
      totalAmount: items.reduce((sum: number, item: any) => sum + item.LineTotal, 0),
    });
  } catch (err: any) {
    console.error("[VIEW CART API] Lỗi:", err);
    return NextResponse.json(
      { success: false, message: "Lỗi server", error: err.message },
      { status: 500 }
    );
  }
}
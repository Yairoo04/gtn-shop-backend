import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getPool } from "~/app/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cartId, productId, quantity } = body; 

    if (!cartId || !productId || quantity == null) {
      return NextResponse.json(
        { success: false, message: "Thiếu cartId, productId hoặc quantity" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return NextResponse.json(
        { success: false, message: "Số lượng phải từ 1 đến 99" },
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
    const request = pool.request();

    request.input("CartId", sql.UniqueIdentifier, cartId);
    request.input("ProductId", sql.Int, Number(productId));
    request.input("Quantity", sql.Int, quantity);

    const result = await request.execute("dbo.UpdateCartItem");

    const rowsAffected = result.rowsAffected[0];
    if (rowsAffected === 0) {
      return NextResponse.json(
        { success: false, message: "Sản phẩm không tồn tại trong giỏ" },
        { status: 404 }
      );
    }

    // Lấy thông tin cập nhật
    const selectRequest = pool.request();
    selectRequest.input("CartId", sql.UniqueIdentifier, cartId);
    selectRequest.input("ProductId", sql.Int, Number(productId));

    const selectResult = await selectRequest.query(`
      SELECT PriceAtAdded, PriceAtAdded * ${quantity} AS LineTotal
      FROM CartItems 
      WHERE CartId = @CartId AND ProductId = @ProductId
    `);

    const itemData = selectResult.recordset[0] || { PriceAtAdded: 0, LineTotal: 0 };

    return NextResponse.json(
      {
        success: true,
        message: "Cập nhật thành công",
        item: {
          ProductId: Number(productId),
          Quantity: quantity,
          PriceAtAdded: itemData.PriceAtAdded,
          LineTotal: itemData.LineTotal,
        }
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[UPDATE API] Lỗi:", err);
    return NextResponse.json(
      { success: false, message: "Lỗi server", error: err.message },
      { status: 500 }
    );
  }
}
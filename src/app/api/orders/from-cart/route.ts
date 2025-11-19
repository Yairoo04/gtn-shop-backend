// app/api/orders/from-cart/route.ts
import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getPool } from "~/app/lib/db";
import { requireLogin } from "~/app/controllers/order.controller";

// Tên procedure bạn đã tạo (thay đúng tên nếu bạn đổi)
const PROC_NAME = "dbo.CreateOrderFromSelectedCartItems";

export async function POST(req: NextRequest) {
  // 1. Kiểm tra đăng nhập
  const user = await requireLogin(req);
  if (!user?.userId) {
    return NextResponse.json(
      { success: false, message: "Vui lòng đăng nhập" },
      { status: 401 }
    );
  }

  try {
    const { cartId, addressId, selectedProductIds = [] } = await req.json();

    // 2. Validate đầu vào
    if (!cartId || !addressId) {
      return NextResponse.json(
        { success: false, message: "Thiếu cartId hoặc addressId" },
        { status: 400 }
      );
    }

    if (!Array.isArray(selectedProductIds)) {
      return NextResponse.json(
        { success: false, message: "selectedProductIds phải là mảng" },
        { status: 400 }
      );
    }

    // 3. Kết nối DB + tạo TVP
    const pool = await getPool();

    const tvp = new sql.Table();           // Dùng đúng Table Type bạn đã tạo
    tvp.columns.add("ProductId", sql.Int); // Tên cột phải trùng với TYPE

    // Nếu không chọn gì → để TVP rỗng = procedure sẽ lấy hết
    selectedProductIds.forEach((id: number) => {
      if (Number.isInteger(id)) {
        tvp.rows.add(id);
      }
    });

    // 4. Gọi procedure (toàn bộ logic nằm trong SQL → an toàn + nhanh)
    const result = await pool
      .request()
      .input("CartId", sql.UniqueIdentifier, cartId)
      .input("UserId", sql.Int, user.userId)
      .input("AddressId", sql.Int, addressId)
      .input("SelectedProductIds", tvp)           // TVP truyền vào đây
      .output("NewOrderId", sql.Int)              // Tên output đúng như procedure
      .execute(PROC_NAME);

    const orderId = result.output.NewOrderId;

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "Đặt hàng thất bại (giỏ hàng trống hoặc lỗi)" },
        { status: 400 }
      );
    }

    // 5. Thành công → trả về orderId
    return NextResponse.json(
      {
        success: true,
        message: "Đặt hàng thành công!",
        data: { orderId },
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error("[API] Lỗi đặt hàng từ giỏ:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error?.message?.includes("RAISERROR")
            ? error.message.split("Msg")[0].trim()
            : "Đặt hàng thất bại, vui lòng thử lại",
      },
      { status: 500 }
    );
  }
}
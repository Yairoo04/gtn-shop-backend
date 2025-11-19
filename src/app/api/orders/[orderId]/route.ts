import { NextRequest, NextResponse } from "next/server";
import { getOrderDetailsCustomer } from "~/app/models/order.model";
import { requireLogin } from "~/app/controllers/order.controller";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> } // params là Promise
) {
  try {
    // 1. Kiểm tra đăng nhập
    const user = await requireLogin(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Lấy orderId từ params
    const { orderId: orderIdStr } = await params;
    const orderId = parseInt(orderIdStr, 10);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: "Invalid orderId" }, { status: 400 });
    }

    console.log(`[DEBUG] User ${user.userId} requesting order ${orderId}`);

    // 3. Lấy thông tin order
    const result = await getOrderDetailsCustomer(orderId);
    if (!result || !result.orderInfo) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderInfo = result.orderInfo;

    // 4. Kiểm tra quyền truy cập
    if (orderInfo.UserId !== user.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log(`[DEBUG] Order ${orderId} details sent to user ${user.userId}`);

    // 5. Trả về kết quả
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("getOrderDetail error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi server" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getOrderDetails } from "~/app/models/order.model";
import { requireLogin } from "~/app/controllers/order.controller";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> } // params là Promise
) {
  const user = await requireLogin(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // AWAIT params TRƯỚC KHI DÙNG
  const { orderId: orderIdStr } = await params;
  const orderId = parseInt(orderIdStr);

  if (isNaN(orderId)) {
    return NextResponse.json({ error: "Invalid orderId" }, { status: 400 });
  }

  try {
      const result = await getOrderDetails(orderId);
      // Kiểm tra kết quả trả về
      if (!result || typeof result !== 'object') {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      // Nếu kết quả là mảng (cũ), chuyển sang object
      let orderInfo;
      if (Array.isArray(result)) {
        if (result.length === 0 || !result[0]) {
          return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }
        orderInfo = result[0];
      } else {
        orderInfo = result;
      }
      // Kiểm tra quyền truy cập
      if (!orderInfo.UserId || orderInfo.UserId !== user.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.json({ success: true, data: orderInfo });
  } catch (error: any) {
    console.error("getOrderDetail error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi server" },
      { status: 500 }
    );
  }
}
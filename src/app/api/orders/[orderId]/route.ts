import { NextRequest, NextResponse } from "next/server";
import { getOrderDetailsCustomer } from "~/app/models/order.model";
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
    const result = await getOrderDetailsCustomer(orderId);
    if (!result) {
      return NextResponse.json({ success: false, message: "Không tìm thấy đơn hàng" }, { status: 404 });
    }

    // KIỂM TRA QUYỀN
    if (result.orderInfo.UserId !== user.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: result });

  } catch (error: any) {
    console.error("getOrderDetail error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi server" },
      { status: 500 }
    );
  }
}
// app/api/orders/update-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { updateOrderStatusAfterMoMo } from "~/app/models/order.model";
import { requireLogin } from "~/app/controllers/order.controller"; // reuse hàm bạn đã có

export async function POST(req: NextRequest) {
  const user = await requireLogin(req);
  if (!user) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    //const { orderId, statusId = 2, paymentMethodId = 2 } = body;
    const { orderId, statusId, paymentMethodId } = body;

    if (!orderId || isNaN(Number(orderId))) {
      return NextResponse.json(
        { success: false, message: "Thiếu hoặc sai orderId" },
        { status: 400 }
      );
    }

    // Optional: kiểm tra đơn có thuộc user này không (tăng bảo mật)
    const success = await updateOrderStatusAfterMoMo(Number(orderId), statusId, paymentMethodId);

    if (!success) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy đơn hàng" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Cập nhật trạng thái thành công",
      data: { orderId }
    });

  } catch (error: any) {
    console.error("update-status API error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi server" },
      { status: 500 }
    );
  }
}
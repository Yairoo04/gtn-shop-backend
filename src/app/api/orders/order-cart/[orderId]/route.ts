import { NextRequest, NextResponse } from "next/server";
import { getOrderDetails } from "~/app/models/order.model";
import { requireLogin } from "~/app/controllers/order.controller";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  // 1. Kiểm tra đăng nhập
  const user = await requireLogin(req);
  if (!user || !user.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Lấy orderId
  const { orderId: orderIdStr } = await params;
  const orderId = parseInt(orderIdStr, 10);
  if (isNaN(orderId) || orderId <= 0) {
    return NextResponse.json({ error: "Invalid orderId" }, { status: 400 });
  }

  try {
    // 3. Lấy dữ liệu (bạn đã sửa model → result có { orderInfo, items })
    const result = await getOrderDetails(orderId);

    if (!result || !result.orderInfo) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 4. Kiểm tra quyền sở hữu
    if (result.orderInfo.UserId !== user.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 5. TRẢ VỀ ĐÚNG ĐỊNH DẠNG
    return NextResponse.json({
      success: true,
      data: {
        OrderId: result.orderInfo.OrderId,
        CreatedAt: result.orderInfo.CreatedAt,
        StatusName: result.orderInfo.StatusName || "Pending",
        RecipientName: result.orderInfo.RecipientName || "Khách lẻ",
        RecipientPhone: result.orderInfo.RecipientPhone || "—",
        RecipientAddress: result.orderInfo.RecipientAddress || "—",
        TotalAmount: Number(result.orderInfo.TotalAmount) || 0,
        items: result.items.map((item: any) => ({
          ProductId: item.ProductId,
          ProductName: item.ProductName || "Sản phẩm",
          Quantity: Number(item.Quantity) || 1,
          Price: Number(item.Price || 0),
          ImageUrl: item.ImageUrl, 
        })),
      },
    });
  } catch (error: any) {
    console.error("getOrderDetail error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi server" },
      { status: 500 }
    );
  }
}
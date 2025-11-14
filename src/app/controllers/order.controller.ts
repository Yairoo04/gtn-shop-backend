import { NextRequest, NextResponse } from "next/server";
import {
  getOrdersByUserId,
  placeOrderFromCart,
  buyNow,
  cancelOrder,
  getAllOrders,
  getOrderDetails,
  updateOrderStatus,
} from "~/app/models/order.model";
import { verifyToken } from "./user.controller";

export const requireLogin = async (req: NextRequest) => {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.substring(7);
  try {
    const user = await verifyToken(token);
    return user;
  } catch (err) {
    console.error("Token verify error:", err);
    return null;
  }
};

// =======================
// LẤY DANH SÁCH ĐƠN HÀNG CỦA USER
// =======================
export const getOrders = async (req: NextRequest) => {
  const user = await requireLogin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");

  try {
    const result = await getOrdersByUserId({
      userId: user.userId,
      status: status === "all" ? undefined : status,
      search: search || undefined,
      page,
      limit,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("getOrders error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi server" },
      { status: 500 }
    );
  }
};

// =======================
// ĐẶT HÀNG TỪ GIỎ HÀNG (DÙNG AddressId)
// =======================
export const placeOrderFromCartController = async (req: NextRequest) => {
  const user = await requireLogin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { cartId, addressId } = await req.json();

  if (!cartId || !addressId) {
    return NextResponse.json(
      { error: "Thiếu cartId hoặc addressId" },
      { status: 400 }
    );
  }

  try {
    const orderId = await placeOrderFromCart(cartId, user.userId, addressId);
    return NextResponse.json(
      { success: true, data: { orderId } },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("placeOrderFromCartController error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Không thể đặt hàng" },
      { status: 500 }
    );
  }
};

// =======================
// MUA NGAY (DÙNG AddressId)
// =======================
export const buyNowController = async (req: NextRequest) => {
  const user = await requireLogin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { productId, quantity, addressId } = await req.json();

  if (!productId || !quantity || !addressId) {
    return NextResponse.json(
      { error: "Thiếu productId, quantity hoặc addressId" },
      { status: 400 }
    );
  }

  try {
    const orderId = await buyNow(user.userId, productId, quantity, addressId);
    return NextResponse.json(
      { success: true, data: { orderId } },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("buyNowController error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Không thể mua ngay" },
      { status: 500 }
    );
  }
};

// =======================
// HỦY ĐƠN HÀNG
// =======================
export const cancelOrderController = async (req: NextRequest) => {
  // 1. XÁC THỰC USER
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = auth.substring(7);

  let user: { userId: number } | null = null; // khai báo kiểu rõ ràng
  try {
    user = await verifyToken(token);
  } catch (err) {
    console.error("Token verify error:", err);
    return NextResponse.json({ error: "Token không hợp lệ" }, { status: 401 });
  }

  // KIỂM TRA user CÓ TỒN TẠI
  if (!user || !user.userId) {
    return NextResponse.json({ error: "Không tìm thấy người dùng" }, { status: 401 });
  }

  // 2. ĐỌC BODY
  let body;
  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const { orderId } = body;
  if (!orderId || isNaN(Number(orderId))) {
    return NextResponse.json({ error: "Thiếu hoặc sai orderId" }, { status: 400 });
  }

  // 3. GỌI MODEL – ĐÃ ĐẢM BẢO user.userId KHÔNG NULL
  try {
    await cancelOrder(Number(orderId), user.userId);
    return NextResponse.json(
      { success: true, message: "Đơn hàng đã hủy thành công" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Cancel order error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Không thể hủy đơn" },
      { status: 400 }
    );
  }
};
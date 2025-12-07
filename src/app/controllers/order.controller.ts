import { NextRequest, NextResponse } from "next/server";
import {
  getOrdersByUserId,
  placeOrderFromCart,
  placeOrderFromCartWithSelection,
  cancelOrder,
  getAllOrders,
  getOrderDetails,
  updateOrderStatus,
  getOrdersByUserIdCustomer,
  buyNow,
} from "~/app/models/order.model";
import { verifyToken } from "./user.controller";
import { revalidatePath } from 'next/cache';

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
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const searchParams = url.searchParams;

  const statusParam = searchParams.get("status");
  const search = searchParams.get("search") || undefined;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  // FE gửi 'all' thì coi như không filter trạng thái
  const status =
    statusParam && statusParam !== "all" ? statusParam : undefined;

  try {
    const { orders, pagination } = await getOrdersByUserIdCustomer(
      user.userId,
      {
        status,
        search,
        page,
        limit,
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        orders,
        pagination,
      },
    });
  } catch (error: any) {
    console.error("getOrders error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Lỗi server",
      },
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
    // Thêm các tham số còn thiếu cho đúng với model
    // Giả sử nhận thêm recipientName, recipientPhone, recipientAddress từ body nếu cần
    const { recipientName = '', recipientPhone = '', recipientAddress = '', selectedItems = [] } = await req.json();
    // Gọi hàm mới nếu có selectedItems
    let orderId;
    if (selectedItems && Array.isArray(selectedItems) && selectedItems.length > 0) {
      orderId = await placeOrderFromCartWithSelection(cartId, user.userId, recipientName, recipientPhone, recipientAddress, selectedItems);
    } else {
      orderId = await placeOrderFromCart(cartId, user.userId, recipientName, recipientPhone, recipientAddress);
    }
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

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const {
    productId,
    quantity = 1,
    addressId,
    paymentMethodId
  } = body;

  if (!productId || !addressId) {
    return NextResponse.json(
      { message: "Thiếu productId hoặc addressId" },
      { status: 400 }
    );
  }

  try {
    // const orderId = await buyNow(
    //   user.userId,
    //   Number(productId),
    //   Number(quantity),
    //   Number(addressId),
    //   Number(paymentMethodId) || 1
    // );

    // return NextResponse.json(
    //   { success: true, data: { orderId } },
    //   { status: 201 }
    // );

    const result = await buyNow(
      user.userId,
      Number(productId),
      Number(quantity),
      Number(addressId),
      Number(paymentMethodId) || 1
    );
    return NextResponse.json(
      {
        success: true,
        data: {
          orderId: result.orderId,
          totalAmount: result.totalAmount
        }
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("buyNowController error:", error);

    if (error.message.includes("kho") || error.message.includes("không tồn tại")) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { message: error.message || "Đặt hàng thất bại" },
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
    revalidatePath(`/don-hang/${orderId}`);
    revalidatePath('/don-hang');
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

// // Dung cho Quan ly don hang
// export const getOrderCustomer = async (req: NextRequest) => {
//   const user = await requireLogin(req);
//   if (!user)
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//   const page = parseInt(new URL(req.url).searchParams.get("page") || "1");
//   const limit = parseInt(new URL(req.url).searchParams.get("limit") || "10");

//   try {
//     const allOrders = await getOrdersByUserIdCustomer(user.userId);

//     // phân trang
//     const total = allOrders.length;
//     const totalPages = Math.ceil(total / limit);
//     const start = (page - 1) * limit;
//     const paginated = allOrders.slice(start, start + limit);

//     return NextResponse.json({
//       success: true,
//       data: {
//         orders: paginated,
//         pagination: { total, totalPages }
//       },
//     });
//   } catch (error: any) {
//     console.error("getOrders error:", error);
//     return NextResponse.json(
//       { success: false, message: error.message || "Lỗi server" },
//       { status: 500 }
//     );
//   }
// };


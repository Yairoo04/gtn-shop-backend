// src/app/controllers/order.controller.ts
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

// Helper auth
const requireLogin = async (req: NextRequest) => {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;

  const token = auth.substring(7);
  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
};

// =======================
// GET ORDERS USER
// =======================
export const getOrders = async (req: NextRequest) => {
  const user = await requireLogin(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orders = await getOrdersByUserId(user.userId);
  return NextResponse.json({ success: true, data: orders });
};

// =======================
// PLACE ORDER FROM CART
// =======================
export const placeOrderFromCartController = async (req: NextRequest) => {
  const user = await requireLogin(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { cartId, recipientName, recipientPhone, recipientAddress } =
    await req.json();

  if (!cartId || !recipientName || !recipientPhone || !recipientAddress) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const orderId = await placeOrderFromCart(
    cartId,
    user.userId,
    recipientName,
    recipientPhone,
    recipientAddress
  );

  if (!orderId) {
    return NextResponse.json(
      { error: "Order failed: OutOrderId null" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: { orderId } }, { status: 201 });
};

// =======================
// BUY NOW
// =======================
export const buyNowController = async (req: NextRequest) => {
  const user = await requireLogin(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    productId,
    quantity,
    recipientName,
    recipientPhone,
    recipientAddress,
  } = await req.json();

  if (!productId || !quantity || !recipientName || !recipientPhone || !recipientAddress) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const orderId = await buyNow(
    user.userId,
    productId,
    quantity,
    recipientName,
    recipientPhone,
    recipientAddress
  );

  return NextResponse.json({ success: true, data: { orderId } }, { status: 201 });
};

// =======================
// CANCEL ORDER
// =======================
export const cancelOrderController = async (req: NextRequest) => {
  const user = await requireLogin(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId } = await req.json();
  if (!orderId)
    return NextResponse.json({ error: "Missing orderId" }, { status: 400 });

  await cancelOrder(orderId, user.userId);
  return NextResponse.json({ success: true, message: "Order cancelled" });
};

// =======================
// ADMIN GET ALL ORDERS
// =======================
export const getAllOrdersAdmin = async (req: NextRequest) => {
  const user = await requireLogin(req);
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const orders = await getAllOrders();
  return NextResponse.json({ success: true, data: orders });
};

// =======================
// ADMIN GET ORDER DETAILS
// =======================
export const getOrderDetailsAdmin = async (req: NextRequest) => {
  const user = await requireLogin(req);
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const idStr = req.nextUrl.searchParams.get("orderId");
  const orderId = Number(idStr);

  if (!orderId)
    return NextResponse.json({ error: "Invalid orderId" }, { status: 400 });

  const result = await getOrderDetails(orderId);
  return NextResponse.json({ success: true, data: result });
};

// =======================
// ADMIN UPDATE STATUS
// =======================
export const updateOrderStatusAdmin = async (req: NextRequest) => {
  const user = await requireLogin(req);
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { orderId, status } = await req.json();
  if (!orderId || !status)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  await updateOrderStatus(orderId, status);
  return NextResponse.json({ success: true, message: "Status updated" });
};

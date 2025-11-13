// src/app/models/order.model.ts
import sql from "mssql";
import { getPool } from "~/app/lib/db";
import { addToCart } from "./cart.model";

// =======================
// LẤY ĐƠN CỦA USER
// =======================
export const getOrdersByUserId = async (userId: number) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("UserId", sql.Int, userId)
    .query(`
      SELECT *
      FROM Orders
      WHERE UserId = @UserId
      ORDER BY CreatedAt DESC
    `);

  return result.recordset;
};

// =======================
// ĐẶT HÀNG TỪ CART (SP)
// =======================
export const placeOrderFromCart = async (
  cartId: string,
  userId: number,
  recipientName: string,
  recipientPhone: string,
  recipientAddress: string
): Promise<number> => {
  try {
    const pool = await getPool();
    const request = pool.request();

    request.input("CartId", sql.UniqueIdentifier, cartId);
    request.input("UserId", sql.Int, userId);
    request.input("RecipientName", sql.NVarChar(255), recipientName);
    request.input("RecipientPhone", sql.NVarChar(50), recipientPhone);
    request.input("RecipientAddress", sql.NVarChar(255), recipientAddress);

    // OUTPUT PARAM MUST BE HERE
    request.output("OutOrderId", sql.Int);

    const result = await request.execute("dbo.PlaceOrderFromCart");

    const orderId = result.output.OutOrderId;
    return orderId;
  } catch (error) {
    console.error("PlaceOrderFromCart ERROR:", error);
    throw new Error("Failed to place order from cart");
  }
};

// =======================
// BUY NOW = CART TẠM + SP
// =======================
export const buyNow = async (
  userId: number,
  productId: number,
  quantity: number,
  recipientName: string,
  recipientPhone: string,
  recipientAddress: string
): Promise<number> => {
  try {
    const tempCartId = await addToCart(null, userId, productId, quantity);

    const orderId = await placeOrderFromCart(
      tempCartId,
      userId,
      recipientName,
      recipientPhone,
      recipientAddress
    );

    return orderId;
  } catch (error) {
    console.error("BuyNow ERROR:", error);
    throw new Error("Failed BuyNow");
  }
};

// =======================
// ADMIN – LẤY TẤT CẢ ĐƠN
// =======================
export const getAllOrders = async () => {
  const pool = await getPool();
  const result = await pool.request().execute("dbo.GetAllOrders");
  return result.recordset;
};

// =======================
// ADMIN – CHI TIẾT ĐƠN
// =======================
export const getOrderDetails = async (orderId: number) => {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("OrderId", sql.Int, orderId)
    .execute("dbo.GetOrderDetails") as sql.IProcedureResult<any>;

  // ép kiểu để tránh lỗi TS
  const recordsets = result.recordsets as sql.IRecordSet<any>[];

  const orderInfo = recordsets[0]?.[0] || null;
  const items = recordsets[1] || [];

  if (!orderInfo) return null;

  return {
    orderId: orderInfo.OrderId,
    recipientName: orderInfo.RecipientName,
    recipientPhone: orderInfo.RecipientPhone,
    recipientAddress: orderInfo.RecipientAddress,
    total: Number(orderInfo.TotalAmount) || 0,
    items: items.map((i: any) => ({
      ProductId: i.ProductId,
      Name: i.ProductName,
      Quantity: i.Quantity,
      Price: Number(i.UnitPrice) || 0,
    })),
  };
};

// =======================
// ADMIN – UPDATE STATUS
// =======================
export const updateOrderStatus = async (
  orderId: number,
  status: string
): Promise<void> => {
  const pool = await getPool();
  await pool
    .request()
    .input("OrderId", sql.Int, orderId)
    .input("Status", sql.NVarChar, status)
    .execute("dbo.UpdateOrderStatus");
};

// =======================
// HỦY ĐƠN
// =======================
export const cancelOrder = async (orderId: number, userId: number) => {
  const pool = await getPool();
  await pool
    .request()
    .input("OrderId", sql.Int, orderId)
    .input("UserId", sql.Int, userId)
    .execute("dbo.CancelOrder");
};

import sql from "mssql";
import { getPool } from "~/app/lib/db";
import { addToCart } from "./cart.model";

interface GetOrdersParams {
  userId: number;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// =======================
// LẤY DANH SÁCH ĐƠN HÀNG CỦA USER (JOIN Addresses)
// =======================
export const getOrdersByUserId = async (input: number | GetOrdersParams) => {
  const params: GetOrdersParams = typeof input === "number" ? { userId: input } : input;
  const { userId, status, search, page = 1, limit = 4 } = params;

  const pool = await getPool();
  const request = pool.request();

  request.input("UserId", sql.Int, userId);
  if (status && status !== "all") request.input("StatusName", sql.NVarChar(50), status);
  if (search) request.input("Search", sql.NVarChar(100), `%${search}%`); // Tăng độ dài
  request.input("Offset", sql.Int, (page - 1) * limit);
  request.input("Limit", sql.Int, limit);

  let whereClause = `WHERE o.UserId = @UserId`;
  if (status && status !== "all") {
    whereClause += ` AND os.StatusName = @StatusName`;
  }
  if (search) {
    whereClause += ` AND (
      CAST(o.OrderId AS NVARCHAR) LIKE @Search
      OR EXISTS (
        SELECT 1 
        FROM OrderItems oi 
        JOIN Products p ON oi.ProductId = p.ProductId 
        WHERE oi.OrderId = o.OrderId 
          AND p.Name LIKE @Search
      )
    )`;
  }

  const baseQuery = `
    SELECT 
      o.OrderId, o.TotalAmount, o.CreatedAt, os.StatusName,
      a.ReceiverName AS RecipientName,
      a.PhoneNumber AS RecipientPhone,
      (SELECT COUNT(*) FROM OrderItems oi WHERE oi.OrderId = o.OrderId) AS ItemCount
    FROM Orders o
    LEFT JOIN OrderStatus os ON o.StatusId = os.StatusId
    LEFT JOIN Addresses a ON o.AddressId = a.AddressId
  `;

  // === ĐẾM TỔNG ===
  const countQuery = `
    SELECT COUNT(*) AS total 
    FROM Orders o
    LEFT JOIN OrderStatus os ON o.StatusId = os.StatusId
    ${whereClause}
  `;
  const countResult = await request.query(countQuery);
  const total = countResult.recordset[0]?.total || 0;

  // === LẤY DỮ LIỆU + PHÂN TRANG ===
  const dataQuery = `
    ${baseQuery}
    ${whereClause}
    ORDER BY o.CreatedAt DESC
    OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY
  `;
  const result = await request.query(dataQuery);

  return {
    orders: result.recordset.map(o => ({
      OrderId: o.OrderId,
      TotalAmount: Number(o.TotalAmount),
      CreatedAt: o.CreatedAt,
      StatusName: o.StatusName,
      RecipientName: o.RecipientName,
      RecipientPhone: o.RecipientPhone,
      ItemCount: Number(o.ItemCount) || 0,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

// =======================
// ĐẶT HÀNG TỪ CART (CHỈ DÙNG AddressId)
// =======================
export const placeOrderFromCart = async (
  cartId: string,
  userId: number,
  addressId: number  // CHỈ DÙNG AddressId
): Promise<number> => {
  try {
    const pool = await getPool();
    const request = pool.request();

    request.input("CartId", sql.UniqueIdentifier, cartId);
    request.input("UserId", sql.Int, userId);
    request.input("AddressId", sql.Int, addressId); // DÙNG AddressId

    request.output("OutOrderId", sql.Int);

    const result = await request.execute("dbo.PlaceOrderFromCart");
    return result.output.OutOrderId;
  } catch (error) {
    console.error("PlaceOrderFromCart ERROR:", error);
    throw new Error("Failed to place order from cart");
  }
};

// =======================
// BUY NOW = CART TẠM + SP (CHỈ DÙNG AddressId)
// =======================
export const buyNow = async (
  userId: number,
  productId: number,
  quantity: number,
  addressId: number  // CHỈ DÙNG AddressId
): Promise<number> => {
  try {
    const tempCartId = await addToCart(null, userId, productId, quantity);
    return await placeOrderFromCart(tempCartId, userId, addressId);
  } catch (error) {
    console.error("BuyNow ERROR:", error);
    throw new Error("Failed BuyNow");
  }
};

// =======================
// ADMIN – LẤY TẤT CẢ ĐƠN (JOIN Addresses)
// =======================
export const getAllOrders = async () => {
  const pool = await getPool();
  const result = await pool.request().execute("dbo.GetAllOrders");
  return result.recordset;
};

// =======================
// ADMIN – CHI TIẾT ĐƠN (JOIN Addresses)
// =======================
export const getOrderDetails = async (orderId: number) => {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("OrderId", sql.Int, orderId)
    .execute("dbo.GetOrderDetails") as sql.IProcedureResult<any>;

  const recordsets = result.recordsets as sql.IRecordSet<any>[];
  const orderInfo = recordsets[0]?.[0] || null;
  const items = recordsets[1] || [];

  if (!orderInfo) return null;

  return {
    orderId: orderInfo.OrderId,
    recipientName: orderInfo.RecipientName,       // từ JOIN Addresses
    recipientPhone: orderInfo.RecipientPhone,     // từ JOIN Addresses
    recipientAddress: orderInfo.RecipientAddress, // từ JOIN Addresses
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
// ~/app/models/order.model.js
export const cancelOrder = async (orderId: number, userId: number): Promise<void> => {
  const pool = await getPool();
  await pool
    .request()
    .input("OrderId", sql.Int, orderId)
    .input("UserId", sql.Int, userId)
    .execute("dbo.CancelOrder");
};

// =======================
// CUSTOMER – CHI TIẾT ĐƠN (JOIN Addresses + CHUẨN HÓA Status)
// =======================
export const getOrderDetailsCustomer = async (orderId: number) => {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("OrderId", sql.Int, orderId)
    .execute("dbo.GetOrderDetails") as sql.IProcedureResult<any>;

  const recordsets = result.recordsets as sql.IRecordSet<any>[];
  const orderInfo = recordsets[0]?.[0] || null;
  const items = recordsets[1] || [];

  if (!orderInfo) return null;

  // CHUẨN HÓA StatusName
  let statusName = orderInfo.StatusName || 'Pending';
  statusName = statusName.trim();
  if (statusName) {
    statusName = statusName.charAt(0).toUpperCase() + statusName.slice(1).toLowerCase();
  }

  return {
    orderInfo: {
      OrderId: orderInfo.OrderId,
      UserId: orderInfo.UserId,
      CreatedAt: orderInfo.CreatedAt,
      StatusName: statusName,
      RecipientName: orderInfo.RecipientName,       // từ JOIN Addresses
      RecipientPhone: orderInfo.RecipientPhone,     // từ JOIN Addresses
      RecipientAddress: orderInfo.RecipientAddress, // từ JOIN Addresses
      TotalAmount: Number(orderInfo.TotalAmount) || 0,
    },
    items: items.map((i: any) => ({
      ProductId: i.ProductId,
      Name: i.ProductName,
      Quantity: i.Quantity,
      Price: Number(i.UnitPrice) || 0,
    })),
  };
};
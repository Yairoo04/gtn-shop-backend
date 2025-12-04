import sql from 'mssql';
import { getPool } from '../lib/db';

export interface Order {
  orderId: number;
  userId: number;
  productId: number;
  quantity: number;
  totalPrice: number;
  status: string;
}

export interface CustomerOrderFilter {
  status?: string;     // Pending / Processing / ...
  search?: string;     // mã đơn hoặc tên sản phẩm
  page?: number;
  limit?: number;
}

// Dùng cho Quản lý đơn hàng (customer)
export const getOrdersByUserIdCustomer = async (
  userId: number,
  options: CustomerOrderFilter = {}
) => {
  const {
    status,
    search,
    page = 1,
    limit = 10,
  } = options;

  const offset = (page - 1) * limit;

  try {
    const pool = await getPool();

    const listRequest = pool.request()
      .input("UserId", sql.Int, userId)
      .input("Status", sql.NVarChar(50), status || null)
      .input("Search", sql.NVarChar(255), search ? `%${search}%` : null)
      .input("Offset", sql.Int, offset)
      .input("Limit", sql.Int, limit);

    // WHERE chung cho cả 2 query
    const baseWhere = `
      WHERE O.UserId = @UserId
        AND (@Status IS NULL OR S.StatusName = @Status)
        AND (
          @Search IS NULL
          OR CAST(O.OrderId AS NVARCHAR(50)) LIKE @Search
          OR EXISTS (
              SELECT 1
              FROM OrderItems OI
              WHERE OI.OrderId = O.OrderId
                AND OI.ProductName LIKE @Search
          )
        )
    `;

    const listSql = `
      SELECT 
        O.OrderId,
        O.UserId,
        O.TotalAmount,
        O.CreatedAt,
        O.StatusId,
        S.StatusName,
        (SELECT COUNT(*) FROM OrderItems OI WHERE OI.OrderId = O.OrderId) AS ItemCount
      FROM Orders O
      JOIN OrderStatus S ON O.StatusId = S.StatusId
      ${baseWhere}
      ORDER BY O.CreatedAt DESC
      OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;
    `;

    const countRequest = pool.request()
      .input("UserId", sql.Int, userId)
      .input("Status", sql.NVarChar(50), status || null)
      .input("Search", sql.NVarChar(255), search ? `%${search}%` : null);

    const countSql = `
      SELECT COUNT(*) AS Total
      FROM Orders O
      JOIN OrderStatus S ON O.StatusId = S.StatusId
      ${baseWhere};
    `;

    const [listResult, countResult] = await Promise.all([
      listRequest.query(listSql),
      countRequest.query(countSql),
    ]);

    const orders = listResult.recordset;
    const total = countResult.recordset[0]?.Total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      orders,
      pagination: { total, totalPages },
    };
  } catch (err) {
    console.error("getOrdersByUserIdCustomer error:", err);
    throw err;
  }
};


export const getOrdersByUserId = async (userId: number): Promise<Order[]> => {
  try {
    const pool = await getPool();
    const request = pool.request().input('userId', sql.Int, userId);
    const result = await request.query('SELECT * FROM dbo.Orders WHERE UserId = @userId');
    console.log('Orders fetched:', result.recordset);
    return result.recordset;
  } catch (error) {
    console.error('Error fetching orders by user ID:', error);
    throw error;
  }
};

export const createOrder = async (order: Omit<Order, 'orderId'>): Promise<Order> => {
  try {
    const pool = await getPool();
    const request = pool.request();
    const result = await request
      .input('userId', sql.Int, order.userId)
      .input('productId', sql.Int, order.productId)
      .input('quantity', sql.Int, order.quantity)
      .input('totalPrice', sql.Decimal(18, 2), order.totalPrice)
      .input('status', sql.NVarChar, order.status || 'Pending')
      .query(`
        INSERT INTO dbo.Orders (UserId, TotalAmount, Status)
        OUTPUT INSERTED.*
        VALUES (@userId, @totalPrice, @status)
      `);
    const newOrderId = result.recordset[0].OrderId;
    await pool.request()
      .input('OrderId', sql.Int, newOrderId)
      .input('ProductId', sql.Int, order.productId)
      .input('ProductName', sql.NVarChar, 'Placeholder Name')
      .input('UnitPrice', sql.Decimal(18, 2), order.totalPrice / order.quantity)
      .input('Quantity', sql.Int, order.quantity)
      .query(`
        INSERT INTO dbo.OrderItems (OrderId, ProductId, ProductName, UnitPrice, Quantity)
        VALUES (@OrderId, @ProductId, @ProductName, @UnitPrice, @Quantity)
      `);
    console.log('Order created:', result.recordset[0]);
    return result.recordset[0];
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};

export const cancelOrder = async (orderId: number, userId: number): Promise<void> => {
  try {
    const pool = await getPool();
    const request = pool.request()
      .input('OrderId', sql.Int, orderId)
      .input('UserId', sql.Int, userId);
    await request.execute('dbo.CancelOrder');
    console.log('Order cancelled:', orderId);
  } catch (error) {
    console.error('Error cancelling order:', error);
    throw error;
  }
};

export const getAllOrders = async (): Promise<Order[]> => {
  try {
    const pool = await getPool();
    const result = await pool.request().execute('dbo.GetAllOrders');
    console.log('All orders fetched:', result.recordset);
    return result.recordset;
  } catch (error) {
    console.error('Error fetching all orders:', error);
    throw error;
  }
};

export const getOrderDetails = async (orderId: number) => {
  try {
    const pool = await getPool();
    const request = pool.request().input('OrderId', sql.Int, orderId);
    const result = await request.execute('dbo.GetOrderDetails');

    const recordsets = result.recordsets as sql.IRecordSet<any>[];
    if (!recordsets || recordsets.length < 2) return null;

    const orderInfoRaw = recordsets[0][0]; // Thông tin chung của đơn
    const rawItems = recordsets[1]; // Danh sách sản phẩm

    if (!orderInfoRaw) return null;

    // === HÀM CHUẨN HÓA ẢNH ===
    const normalizeImageUrl = (rawUrl: any): string => {
      if (!rawUrl) return '/images/placeholder.png';

      let url = String(rawUrl).trim();

      // BƯỚC QUAN TRỌNG NHẤT: LOẠI BỎ DẤU NHÁY ĐƠN BAO NGOÀI (NGUYÊN NHÂN CHÍNH!)
      if ((url.startsWith("'") && url.endsWith("'")) || (url.startsWith('"') && url.endsWith('"'))) {
        url = url.slice(1, -1);
      }

      // Fix escape \"
      url = url.replace(/\\"/g, '"');

      // Bây giờ mới parse được!
      if (url.startsWith('[') && url.endsWith(']')) {
        try {
          const parsed = JSON.parse(url);
          if (Array.isArray(parsed) && parsed.length > 0) {
            url = parsed[0];
          }
        } catch (e) {
          console.log('JSON parse failed sau khi fix nháy:', url);
        }
      }

      // Fix dấu \ thừa
      url = url.replace(/\\/g, '/');

      // Đảm bảo có / đầu
      if (url && !url.startsWith('/') && !url.startsWith('http')) {
        url = '/' + url;
      }
      return url && /\.(webp|jpg|jpeg|png|gif)$/i.test(url) ? url : '/images/placeholder.png';
    };
    // === CHUẨN HÓA ORDER INFO ===
    const orderInfo = {
      OrderId: orderInfoRaw.OrderId,
      UserId: orderInfoRaw.UserId,
      CreatedAt: orderInfoRaw.CreatedAt,
      StatusName: orderInfoRaw.StatusName || 'Pending',
      RecipientName: orderInfoRaw.RecipientName || 'Khách lẻ',
      RecipientPhone: orderInfoRaw.RecipientPhone || '—',
      RecipientAddress: orderInfoRaw.RecipientAddress || '—',
      TotalAmount: Number(orderInfoRaw.TotalAmount || 0),
      PaymentMethod: orderInfoRaw.PaymentMethod || 'Khi nhận hàng (COD)',
    };

    // === CHUẨN HÓA ITEMS ===
    const items = rawItems.map((i: any) => ({
      ProductId: i.ProductId,
      ProductName: i.ProductName || 'Sản phẩm không tên',
      Quantity: Number(i.Quantity || 1),
      Price: Number(i.Price || i.UnitPrice || 0),
      ImageUrl: normalizeImageUrl(i.ImageUrl),
    }));

    return {
      orderInfo,
      items,
    };
  } catch (error) {
    console.error('Error fetching order details:', error);
    throw error;
  }
};

export const updateOrderStatus = async (orderId: number, status: string): Promise<void> => {
  try {
    const pool = await getPool();
    const request = pool.request()
      .input('OrderId', sql.Int, orderId)
      .input('Status', sql.NVarChar, status);
    await request.execute('dbo.UpdateOrderStatus');
    console.log('Order status updated:', orderId, status);
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
};

export const placeOrderFromCart = async (cartId: string, userId: number | null, recipientName: string, recipientPhone: string, recipientAddress: string): Promise<number> => {
  try {
    const pool = await getPool();
    const request = pool.request()
      .input('CartId', sql.UniqueIdentifier, cartId)
      .input('UserId', sql.Int, userId)
      .input('RecipientName', sql.NVarChar, recipientName)
      .input('RecipientPhone', sql.NVarChar, recipientPhone)
      .input('RecipientAddress', sql.NVarChar, recipientAddress)
      .output('OutOrderId', sql.Int);
    await request.execute('dbo.PlaceOrderFromCart');
    const orderId = request.parameters.OutOrderId.value;
    console.log('Order placed from cart (selected items):', orderId);
    return orderId;
  } catch (error) {
    console.error('Error placing order from cart:', error);
    throw error;
  }
};

// New version: accepts selectedItems array
export const placeOrderFromCartWithSelection = async (
  cartId: string,
  userId: number | null,
  recipientName: string,
  recipientPhone: string,
  recipientAddress: string,
  selectedItems: Array<{ productId: number; quantity: number }>
): Promise<number> => {
  try {
    const pool = await getPool();
    // Convert selectedItems to JSON string for SQL
    const selectedItemsJson = JSON.stringify(selectedItems);
    const request = pool.request()
      .input('CartId', sql.UniqueIdentifier, cartId)
      .input('UserId', sql.Int, userId)
      .input('RecipientName', sql.NVarChar, recipientName)
      .input('RecipientPhone', sql.NVarChar, recipientPhone)
      .input('RecipientAddress', sql.NVarChar, recipientAddress)
      .input('SelectedItems', sql.NVarChar(sql.MAX), selectedItemsJson)
      .output('OutOrderId', sql.Int);
    await request.execute('dbo.PlaceOrderFromCart');
    const orderId = request.parameters.OutOrderId.value;
    console.log('Order placed from cart (selected items):', orderId);
    return orderId;
  } catch (error) {
    console.error('Error placing order from cart (selected items):', error);
    throw error;
  }
};

// // getOrderByUserIdCustomer dung cho Quan ly don hang
// export const getOrdersByUserIdCustomer = async (userId: number) => {
//   try {
//     const pool = await getPool();
//     const result = await pool.request()
//       .input("UserId", sql.Int, userId)
//       .query(`
//         SELECT 
//           O.OrderId,
//           O.UserId,
//           O.TotalAmount,
//           O.CreatedAt,
//           O.StatusId,
//           S.StatusName,
//           (SELECT COUNT(*) FROM OrderItems OI WHERE OI.OrderId = O.OrderId) AS ItemCount
//         FROM Orders O
//         JOIN OrderStatus S ON O.StatusId = S.StatusId
//         WHERE O.UserId = @UserId
//         ORDER BY O.CreatedAt DESC
//       `);

//     return result.recordset;
//   } catch (err) {
//     console.error("getOrdersByUserIdCustomer error:", err);
//     throw err;
//   }
// };


// Dung cho Xem chi tiet trong quan ly don hang
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

  return {
    orderInfo: {
      OrderId: orderInfo.OrderId,
      UserId: orderInfo.UserId,
      CreatedAt: orderInfo.CreatedAt,
      StatusName: orderInfo.StatusName || 'Pending',
      RecipientName: orderInfo.RecipientName,
      RecipientPhone: orderInfo.RecipientPhone,
      RecipientAddress: orderInfo.RecipientAddress,
      TotalAmount: Number(orderInfo.TotalAmount) || 0,
    },
    items: items.map((i: any) => ({
      ProductId: i.ProductId,
      Name: i.ProductName,
      Quantity: i.Quantity,
      Price: Number(i.Price) || 0,  // SỬA: i.Price, KHÔNG PHẢI i.UnitPrice
      ImageUrl: i.ImageUrl,
    })),
  };
};

// Mua ngay - Buy now
export const buyNow = async (
  userId: number,
  productId: number,
  quantity: number = 1,
  addressId: number,
  paymentMethodId?: number
): Promise<string> => {
  const pool = await getPool();
  const transaction = pool.transaction();
  await transaction.begin();

  try {
    // 1. KIỂM TRA ĐỊA CHỈ CÓ THUỘC USER KHÔNG
    const addrResult = await transaction.request()
      .input('AddressId', sql.Int, addressId)
      .input('UserId', sql.Int, userId)
      .query(`
        SELECT AddressId 
        FROM Addresses 
        WHERE AddressId = @AddressId AND UserId = @UserId AND IsDefault = 0 OR IsDefault = 1
      `);

    if (addrResult.recordset.length === 0) {
      throw new Error('Địa chỉ không tồn tại hoặc không thuộc về bạn!');
    }

    // 2. KIỂM TRA SẢN PHẨM + TỒN KHO
    const productResult = await transaction.request()
      .input('ProductId', sql.Int, productId)
      .query(`
        SELECT Name, Price, DiscountPrice, Stock, ImageUrl
        FROM Products
        WHERE ProductId = @ProductId AND IsPublished = 1
      `);

    if (productResult.recordset.length === 0) {
      throw new Error('Sản phẩm không tồn tại hoặc đã bị ẩn');
    }

    const product = productResult.recordset[0];
    if (product.Stock < quantity) {
      throw new Error(`Chỉ còn ${product.Stock} sản phẩm "${product.Name}" trong kho!`);
    }

    // Lấy giá đã giảm nếu có, nếu không thì lấy giá gốc
    const finalPrice = (product.DiscountPrice !== null && product.DiscountPrice > 0) ? product.DiscountPrice : product.Price;
    const totalAmount = finalPrice * quantity;
    const pmId = paymentMethodId || 1;
    const pmResult = await transaction.request()
    .input('PaymentMethodId', sql.Int, pmId)
    .query('SELECT Name FROM PaymentMethods WHERE Id = @PaymentMethodId');
    const paymentMethodName = pmResult.recordset[0]?.Name || 'Thanh toán khi nhận hàng (COD)';

    // 3. TẠO ĐƠN HÀNG – CHỈ LƯU AddressId )
    const orderResult = await transaction.request()
      .input('UserId', sql.Int, userId)
      .input('TotalAmount', sql.Decimal(18, 2), totalAmount)
      .input('AddressId', sql.Int, addressId)
      .input('PaymentMethodId', sql.Int, pmId)
      .input('PaymentMethodName', sql.NVarChar(100), paymentMethodName)
      .query(`
        INSERT INTO Orders (UserId, TotalAmount, StatusId, AddressId, PaymentMethod, PaymentMethodId, CreatedAt)
        OUTPUT INSERTED.OrderId
        VALUES (@UserId, @TotalAmount, 1, @AddressId, @PaymentMethodName, @PaymentMethodId, GETDATE())
      `);

    const orderId = orderResult.recordset[0].OrderId;

    // 4. THÊM CHI TIẾT ĐƠN HÀNG (dùng bảng OrderItems )
    await transaction.request()
      .input('OrderId', sql.Int, orderId)
      .input('ProductId', sql.Int, productId)
      .input('ProductName', sql.NVarChar(300), product.Name)
      .input('UnitPrice', sql.Decimal(18, 2), finalPrice)
      .input('Quantity', sql.Int, quantity)
      .query(`
        INSERT INTO OrderItems (OrderId, ProductId, ProductName, UnitPrice, Quantity)
        VALUES (@OrderId, @ProductId, @ProductName, @UnitPrice, @Quantity)
      `);

    // 5. TRỪ KHO
    await transaction.request()
      .input('ProductId', sql.Int, productId)
      .input('Quantity', sql.Int, quantity)
      .query(`
        UPDATE Products 
        SET Stock = Stock - @Quantity 
        WHERE ProductId = @ProductId AND Stock >= @Quantity
      `);

    await transaction.commit();
    return orderId.toString();

  } catch (error: any) {
    await transaction.rollback();
    console.error('buyNow error:', error);
    throw error;
  }
};

// ================================
// CẬP NHẬT TRẠNG THÁI SAU KHI MOMO THANH TOÁN THÀNH CÔNG
// ================================
export const updateOrderStatusAfterMoMo = async (
  orderId: number,
  statusId: number = 2,        // 2 
  paymentMethodId: number = 2   // 2 = MoMo
): Promise<boolean> => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('OrderId', sql.Int, orderId)
      .input('StatusId', sql.Int, statusId)
      .input('PaymentMethodId', sql.Int, paymentMethodId)
      .query(`
        UPDATE Orders 
        SET 
          StatusId = @StatusId,
          PaymentMethodId = @PaymentMethodId,
          UpdatedAt = GETDATE()
        WHERE OrderId = @OrderId
      `);

    return result.rowsAffected[0] > 0;
  } catch (error) {
    console.error('updateOrderStatusAfterMoMo error:', error);
    throw error;
  }
};




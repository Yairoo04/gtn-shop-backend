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

export const getOrderDetails = async (orderId: number): Promise<any> => {
  try {
    const pool = await getPool();
    const request = pool.request().input('OrderId', sql.Int, orderId);
    const result = await request.execute('dbo.GetOrderDetails');
    // Ép kiểu về mssql.IRecordSet<any>[] để truy cập đúng các result set
    const recordsets = result.recordsets as sql.IRecordSet<any>[];
    if (!recordsets || recordsets.length < 2) {
      return null;
    }
    const orderInfo = recordsets[0][0];
    const items = recordsets[1];
    const order = { ...orderInfo, items };
    console.log('Order details fetched:', order);
    return order;
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

// getOrderByUserIdCustomer dung cho Quan ly don hang
export const getOrdersByUserIdCustomer = async (userId: number) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("UserId", sql.Int, userId)
      .query(`
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
        WHERE O.UserId = @UserId
        ORDER BY O.CreatedAt DESC
      `);

    return result.recordset;
  } catch (err) {
    console.error("getOrdersByUserIdCustomer error:", err);
    throw err;
  }
};


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
    })),
  };
};





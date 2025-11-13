import sql from 'mssql';
import { getPool } from '../lib/db';
import { addToCart } from './cart.model'; // Import để tạo cart tạm cho buyNow

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
    throw new Error('Database error: Failed to fetch orders');
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

    // Fetch product name and unit price dynamically
    const productResult = await pool.request()
      .input('productId', sql.Int, order.productId)
      .query('SELECT Name, ISNULL(DiscountPrice, Price) AS UnitPrice FROM dbo.Products WHERE ProductId = @productId');
    if (productResult.recordset.length === 0) throw new Error('Product not found');

    const { Name: productName, UnitPrice } = productResult.recordset[0];

    await pool.request()
      .input('OrderId', sql.Int, newOrderId)
      .input('ProductId', sql.Int, order.productId)
      .input('ProductName', sql.NVarChar, productName)
      .input('UnitPrice', sql.Decimal(18, 2), UnitPrice)
      .input('Quantity', sql.Int, order.quantity)
      .query(`
        INSERT INTO dbo.OrderItems (OrderId, ProductId, ProductName, UnitPrice, Quantity)
        VALUES (@OrderId, @ProductId, @ProductName, @UnitPrice, @Quantity)
      `);
    console.log('Order created:', result.recordset[0]);
    return result.recordset[0];
  } catch (error) {
    console.error('Error creating order:', error);
    throw new Error('Database error: Failed to create order');
  }
};

// New: Buy Now - Create order directly from single product
export const buyNow = async (userId: number | null, productId: number, quantity: number, recipientName: string, recipientPhone: string, recipientAddress: string): Promise<number> => {
  try {
    // Create temporary cart
    let tempCartId = await addToCart(null, userId, productId, quantity);

    // Place order from temp cart
    const orderId = await placeOrderFromCart(tempCartId, userId, recipientName, recipientPhone, recipientAddress);

    // Optional: Delete temp cart after (implement if needed via SP or query)
    // await deleteCart(tempCartId);

    console.log('Buy Now order created:', orderId);
    return orderId;
  } catch (error) {
    console.error('Error in Buy Now:', error);
    throw new Error('Database error: Failed to process Buy Now');
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
    throw new Error('Database error: Failed to cancel order');
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
    throw new Error('Database error: Failed to fetch all orders');
  }
};

export const getOrderDetails = async (orderId: number): Promise<any> => {
  try {
    const pool = await getPool();
    const request = pool.request().input('OrderId', sql.Int, orderId);
    const result = await request.execute('dbo.GetOrderDetails');
    console.log('Order details fetched:', result.recordset);
    return result.recordset;
  } catch (error) {
    console.error('Error fetching order details:', error);
    throw new Error('Database error: Failed to fetch order details');
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
    throw new Error('Database error: Failed to update order status');
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
    console.log('Order placed from cart:', orderId);
    return orderId;
  } catch (error) {
    console.error('Error placing order from cart:', error);
    throw new Error('Database error: Failed to place order from cart');
  }
};
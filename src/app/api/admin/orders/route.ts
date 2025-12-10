// API Admin - Quản lý đơn hàng
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '../../../lib/db';
import sql from 'mssql';

// GET: Lấy danh sách đơn hàng HOẶC chi tiết 1 đơn hàng
export async function GET(req: NextRequest) {
  try {
    const pool = await getPool();
    const orderId = req.nextUrl.searchParams.get('orderId');

    // Nếu có orderId -> trả về chi tiết đơn hàng
    if (orderId) {
      console.log('📋 Fetching order details for OrderId:', orderId);
      const orderIdNum = parseInt(orderId, 10);
      if (!orderIdNum) {
        return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
      }

      try {
        // Query thông tin đơn hàng (có địa chỉ)
        const orderResult = await pool.request()
          .input('OrderId', sql.Int, orderIdNum)
          .query(`
            SELECT 
              o.OrderId,
              o.UserId,
              COALESCE(u.FullName, u.Username) AS RecipientName,
              u.Phone AS RecipientPhone,
              o.TotalAmount,
              o.ShippingFee,
              o.Status,
              o.PaymentMethod,
              o.CreatedAt,
              o.StatusId,
              u.UserId AS CustomerId,
              COALESCE(u.FullName, u.Username) AS CustomerName,
              u.Email AS CustomerEmail,
              a.Street,
              a.City,
              a.Province
            FROM dbo.Orders o
            LEFT JOIN dbo.Users u ON o.UserId = u.UserId
            LEFT JOIN dbo.Addresses a ON o.AddressId = a.AddressId
            WHERE o.OrderId = @OrderId
          `);

        if (orderResult.recordset.length === 0) {
          console.log('⚠️ Order not found:', orderIdNum);
          return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Query danh sách sản phẩm trong đơn (OrderItems)
        const itemsResult = await pool.request()
          .input('OrderId', sql.Int, orderIdNum)
          .query(`
            SELECT 
              oi.OrderItemId,
              oi.ProductId,
              oi.ProductName,
              oi.UnitPrice,
              oi.Quantity,
              p.SKU,
              p.ImageUrl
            FROM dbo.OrderItems oi
            LEFT JOIN dbo.Products p ON oi.ProductId = p.ProductId
            WHERE oi.OrderId = @OrderId
          `);

        const order = orderResult.recordset[0];
        order.Items = itemsResult.recordset;

        console.log(' Order details fetched:', order.OrderId, 'with', order.Items.length, 'items');
        return NextResponse.json({ success: true, data: order });
      } catch (detailError: any) {
        console.error('❌ Error fetching order details:', detailError);
        throw detailError;
      }
    }

    // Không có orderId -> trả về danh sách tất cả đơn hàng (TOP 1000)
    const result = await pool.request().query(`
      SELECT 
        o.OrderId,
        o.UserId,
        COALESCE(u.FullName, u.Username) AS RecipientName,
        u.Phone AS RecipientPhone,
        o.TotalAmount,
        o.Status,
        o.PaymentMethod,
        o.CreatedAt,
        o.StatusId,
        COALESCE(u.FullName, u.Username) AS CustomerName,
        u.Email AS CustomerEmail,
        (SELECT COUNT(*) FROM dbo.OrderItems oi WHERE oi.OrderId = o.OrderId) AS ItemCount
      FROM dbo.Orders o
      LEFT JOIN dbo.Users u ON o.UserId = u.UserId
      ORDER BY o.CreatedAt DESC
    `);

    return NextResponse.json({ success: true, data: result.recordset });
  } catch (error: any) {
    console.error('❌ GET /api/admin/orders error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

// PUT: Cập nhật trạng thái đơn hàng
export async function PUT(req: NextRequest) {
  try {
    const pool = await getPool();
    const body = await req.json();
    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json(
        { error: 'Missing orderId or status' }, 
        { status: 400 }
      );
    }

    // Map trạng thái sang StatusId (theo DB schema)
    let statusId = 1; // Default: Pending
    switch (status.toLowerCase()) {
      case 'pending':
      case 'chờ xác nhận':
        statusId = 1;
        break;
      case 'processing':
      case 'đang chuẩn bị':
        statusId = 2;
        break;
      case 'shipping':
      case 'đang giao':
        statusId = 3;
        break;
      case 'delivered':
      case 'đã giao':
        statusId = 4;
        break;
      case 'completed':
      case 'hoàn thành':
        statusId = 5;
        break;
      case 'cancelled':
      case 'huỷ':
        statusId = 6;
        break;
    }

    // Lấy trạng thái cũ của đơn hàng
    const oldStatusResult = await pool.request()
      .input('OrderId', sql.Int, orderId)
      .query('SELECT Status FROM dbo.Orders WHERE OrderId = @OrderId');
    const oldStatus = oldStatusResult.recordset[0]?.Status?.toLowerCase().trim() || "";

    // Update trạng thái
    await pool.request()
      .input('OrderId', sql.Int, orderId)
      .input('Status', sql.NVarChar, status)
      .input('StatusId', sql.Int, statusId)
      .query(`
        UPDATE dbo.Orders 
        SET Status = @Status, StatusId = @StatusId 
        WHERE OrderId = @OrderId
      `);

    // ...Không còn logic tạo thông báo cho trạng thái đơn hàng...

    return NextResponse.json({ 
      success: true, 
      message: 'Order status updated successfully' 
    });
  } catch (error: any) {
    console.error('❌ PUT /api/admin/orders error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update order status' },
      { status: 500 }
    );
  }
}
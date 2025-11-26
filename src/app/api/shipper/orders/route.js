// API lấy danh sách đơn hàng cho shipper (Next.js app router)
// GET: /api/shipper/orders
// Trả về danh sách đơn hàng ở trạng thái shipper có thể nhận/giao

import { getPool } from '../../../lib/db';

export async function GET() {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT 
          o.OrderId,
          o.UserId,
          o.ShipperId,
          COALESCE(u.FullName, u.Username) AS RecipientName,
          u.Phone AS RecipientPhone,
          o.TotalAmount,
          o.Status,
          o.PaymentMethod,
          o.CreatedAt,
          o.StatusId,
          COALESCE(u.FullName, u.Username) AS CustomerName,
          u.Email AS CustomerEmail,
          (SELECT COUNT(*) FROM dbo.OrderItems oi WHERE oi.OrderId = o.OrderId) AS ItemCount,
          A.Street, A.City, A.Province
        FROM dbo.Orders o
        LEFT JOIN dbo.Users u ON o.UserId = u.UserId
        LEFT JOIN dbo.Addresses A ON o.AddressId = A.AddressId
        ORDER BY o.CreatedAt DESC
      `);
    const orders = result.recordset.map(o => ({
      id: o.OrderId,
      total: o.TotalAmount,
      status: o.Status,
      statusId: o.StatusId,
      ShipperId: o.ShipperId,
      createdAt: o.CreatedAt,
      customerName: o.CustomerName,
      phone: o.RecipientPhone,
      address: [o.Street, o.City, o.Province].filter(Boolean).join(', '),
      itemCount: o.ItemCount,
      payment: o.PaymentMethod
    }));
    return new Response(JSON.stringify({ success: true, orders }), { status: 200 });
  } catch (e) {
    console.error('Shipper orders error:', e);
    return new Response(JSON.stringify({ success: false, message: 'Lỗi máy chủ', error: e.message }), { status: 500 });
  }
}

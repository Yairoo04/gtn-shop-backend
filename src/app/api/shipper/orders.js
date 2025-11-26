// API lấy danh sách đơn hàng cho shipper
// GET: /api/shipper/orders
// Trả về danh sách đơn hàng cần giao cho shipper đã đăng nhập

import { getPool } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  try {
    const pool = await getPool();
    // Lấy tất cả đơn hàng ở các trạng thái shipper có thể nhận/giao
    const allowedStatus = [N'Chờ xác nhận', N'Đang chuẩn bị', N'Đang giao'];
    const result = await pool.request()
      .query(`
        SELECT O.OrderId, O.TotalAmount, O.Status, O.CreatedAt, O.UserId, A.Street, A.City, A.Province, U.FullName, U.Phone
        FROM Orders O
        LEFT JOIN Addresses A ON O.AddressId = A.AddressId
        LEFT JOIN Users U ON O.UserId = U.UserId
        WHERE O.Status IN (N'Chờ xác nhận', N'Đang chuẩn bị', N'Đang giao')
        ORDER BY O.Status, O.CreatedAt DESC
      `);
    const orders = result.recordset.map(o => ({
      id: o.OrderId,
      total: o.TotalAmount,
      status: o.Status,
      createdAt: o.CreatedAt,
      customerName: o.FullName,
      phone: o.Phone,
      address: [o.Street, o.City, o.Province].filter(Boolean).join(', ')
    }));
    return res.status(200).json({ success: true, orders });
  } catch (e) {
    console.error('Shipper orders error:', e);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: e.message });
  }
}

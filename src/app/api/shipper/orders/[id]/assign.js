// API nhận đơn cho shipper
// POST: /api/shipper/orders/[id]/assign
// Body: { shipperId }

import { getPool } from '../../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  const { id } = req.query;
  const { shipperId } = req.body;
  if (!id || !shipperId) {
    return res.status(400).json({ success: false, message: 'Thiếu thông tin' });
  }
  try {
    const pool = await getPool();
    // Chỉ nhận đơn khi trạng thái là 'Chờ xác nhận' hoặc 'Đang chuẩn bị'
    const check = await pool.request()
      .input('OrderId', id)
      .query(`SELECT Status FROM Orders WHERE OrderId = @OrderId`);
    const status = check.recordset[0]?.Status;
    if (status !== 'Chờ xác nhận' && status !== 'Đang chuẩn bị') {
      return res.status(400).json({ success: false, message: 'Đơn hàng không thể nhận!' });
    }
    // Cập nhật shipperId và trạng thái
    await pool.request()
      .input('OrderId', id)
      .input('ShipperId', shipperId)
      .query(`UPDATE Orders SET ShipperId = @ShipperId, Status = N'Đang giao' WHERE OrderId = @OrderId`);
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: e.message });
  }
}

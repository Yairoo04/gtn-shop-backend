// API xác nhận giao hàng thành công
// POST: /api/shipper/orders/[id]/delivered
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
    // Kiểm tra đơn có đúng shipper nhận không và trạng thái hợp lệ
    const check = await pool.request()
      .input('OrderId', id)
      .query(`SELECT ShipperId, Status FROM Orders WHERE OrderId = @OrderId`);
    const order = check.recordset[0];
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }
    if (order.ShipperId != shipperId) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xác nhận đơn này!' });
    }
    if (order.Status !== 'Đang giao') {
      return res.status(400).json({ success: false, message: 'Chỉ xác nhận đơn đang giao!' });
    }
    await pool.request()
      .input('OrderId', id)
      .query(`UPDATE Orders SET Status = N'Đã giao', Completed = 1 WHERE OrderId = @OrderId`);
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: e.message });
  }
}

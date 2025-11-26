import { getPool } from '../../../../../lib/db';

export async function POST(req, context) {
  try {
    const { id } = await context.params;
    const { shipperId } = await req.json();
    console.log('[DELIVERED API] id:', id, 'shipperId:', shipperId);
    if (!id || !shipperId) {
      console.log('[DELIVERED API] Thiếu thông tin:', { id, shipperId });
      return new Response(JSON.stringify({ success: false, message: 'Thiếu thông tin', debug: { id, shipperId } }), { status: 400 });
    }
    const pool = await getPool();
    // Kiểm tra đơn có đúng shipper nhận không và trạng thái hợp lệ
    const check = await pool.request()
      .input('OrderId', id)
      .query(`SELECT ShipperId, StatusId FROM Orders WHERE OrderId = @OrderId`);
    const order = check.recordset[0];
    console.log('[DELIVERED API] DB order:', order);
    if (!order) {
      return new Response(JSON.stringify({ success: false, message: 'Không tìm thấy đơn hàng', debug: { id } }), { status: 404 });
    }
    if (order.ShipperId != shipperId) {
      console.log('[DELIVERED API] ShipperId mismatch:', { orderShipperId: order.ShipperId, shipperId });
      return new Response(JSON.stringify({ success: false, message: 'Bạn không có quyền xác nhận đơn này!', debug: { orderShipperId: order.ShipperId, shipperId } }), { status: 403 });
    }
    if (order.StatusId !== 3) { // 3 = Đang giao
      console.log('[DELIVERED API] StatusId not shipping:', { statusId: order.StatusId });
      return new Response(JSON.stringify({ success: false, message: 'Chỉ xác nhận đơn đang giao!', debug: { statusId: order.StatusId } }), { status: 400 });
    }
    await pool.request()
      .input('OrderId', id)
      .input('StatusId', 4) // 4 = Đã giao
      .input('Status', 'Delivered')
      .query(`UPDATE Orders SET StatusId = @StatusId, Status = @Status WHERE OrderId = @OrderId`);
    // Có thể cập nhật thêm trường Completed nếu cần
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    console.log('[DELIVERED API] Error:', e);
    return new Response(JSON.stringify({ success: false, message: 'Lỗi máy chủ', error: e.message }), { status: 500 });
  }
}

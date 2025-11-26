import { getPool } from '../../../../../lib/db';

export async function POST(req, context) {
  try {
    const { id } = await context.params;
    const { shipperId } = await req.json();
    console.log('[ASSIGN API] id:', id, 'shipperId:', shipperId);
    if (!id || !shipperId) {
      console.log('[ASSIGN API] Thiếu thông tin:', { id, shipperId });
      return new Response(JSON.stringify({ success: false, message: 'Thiếu thông tin', debug: { id, shipperId } }), { status: 400 });
    }
    const pool = await getPool();
    // Chỉ nhận đơn khi trạng thái là 'Đang chuẩn bị' và chưa có shipper
    const check = await pool.request()
      .input('OrderId', id)
      .query(`SELECT StatusId, ShipperId FROM Orders WHERE OrderId = @OrderId`);
    const order = check.recordset[0];
    console.log('[ASSIGN API] DB order:', order);
    if (!order) {
      return new Response(JSON.stringify({ success: false, message: 'Không tìm thấy đơn hàng', debug: { id } }), { status: 404 });
    }
    // Trạng thái 'Đang chuẩn bị' (StatusId = 2), chưa có shipper
    if (order.StatusId !== 2 || order.ShipperId) {
      console.log('[ASSIGN API] Không thể nhận:', { statusId: order.StatusId, shipperId: order.ShipperId });
      return new Response(JSON.stringify({ success: false, message: 'Đơn hàng không thể nhận!', debug: { statusId: order.StatusId, shipperId: order.ShipperId } }), { status: 400 });
    }
    await pool.request()
      .input('OrderId', id)
      .input('ShipperId', shipperId)
      .input('StatusId', 3) // 3 = Shipping
      .input('Status', 'Shipping')
      .query(`UPDATE Orders SET ShipperId = @ShipperId, StatusId = @StatusId, Status = @Status WHERE OrderId = @OrderId`);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    console.log('[ASSIGN API] Error:', e);
    return new Response(JSON.stringify({ success: false, message: 'Lỗi máy chủ', error: e.message }), { status: 500 });
  }
}

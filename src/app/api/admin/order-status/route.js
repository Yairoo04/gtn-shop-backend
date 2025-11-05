// API tỷ lệ đơn hàng (cho biểu đồ Pie)
// ============================================
import { getPool } from '../../../lib/db';

export async function GET() {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        CASE Status
          WHEN N'Pending' THEN N'Chờ xử lý'
          WHEN N'Processing' THEN N'Đang xử lý'
          WHEN N'Shipping' THEN N'Đang giao'
          WHEN N'Delivered' THEN N'Đã giao'
          WHEN N'Completed' THEN N'Hoàn tất'
          WHEN N'Cancelled' THEN N'Đã hủy'
          ELSE Status
        END AS TrangThai,
        COUNT(*) AS SoLuong
      FROM dbo.Orders
      GROUP BY Status
      ORDER BY SoLuong DESC
    `);
    
    return Response.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('Order Status Error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
// API doanh thu 7 ngày (cho biểu đồ Line)

import { getPool } from '../../../lib/db';

export async function GET() {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        CAST(o.CreatedAt AS DATE) AS Ngay,
        ISNULL(SUM(o.TotalAmount), 0) AS DoanhThu
      FROM dbo.Orders o
      WHERE o.CreatedAt >= DATEADD(DAY, -6, CAST(GETDATE() AS DATE))
        AND o.Status IN (N'Completed', N'Delivered')
      GROUP BY CAST(o.CreatedAt AS DATE)
      ORDER BY Ngay
    `);
    
    return Response.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('Revenue 7 Days Error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
// API sản phẩm bán chạy
// ============================================
import { getPool } from '../../../lib/db';
import sql from 'mssql';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const top = parseInt(searchParams.get('top') || '5');
    
    const pool = await getPool();
    const result = await pool.request()
      .input('Top', sql.Int, top)
      .query(`
        SELECT TOP (@Top)
          p.ProductId,
          p.Name,
          SUM(oi.Quantity) AS TongSoLuongBan,
          SUM(oi.Quantity * oi.UnitPrice) AS TongDoanhThu
        FROM dbo.Products p
        INNER JOIN dbo.OrderItems oi ON p.ProductId = oi.ProductId
        INNER JOIN dbo.Orders o ON oi.OrderId = o.OrderId
        WHERE o.Status IN (N'Completed', N'Delivered')
        GROUP BY p.ProductId, p.Name
        ORDER BY TongDoanhThu DESC
      `);
    
    return Response.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('Top Products Error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
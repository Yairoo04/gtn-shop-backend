// API doanh thu theo danh mục (thay cho "theo thương hiệu")
// ============================================
import { getPool } from '../../../lib/db';
import sql from 'mssql';

export async function GET() {
  try {
    const pool = await getPool();
    
    // Lấy doanh thu 30 ngày qua theo danh mục
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);
    const toDate = new Date();
    
    const result = await pool.request()
      .input('FromDate', sql.DateTime, fromDate)
      .input('ToDate', sql.DateTime, toDate)
      .query(`
        SELECT 
          ISNULL(c.Name, N'Khác') AS DanhMuc,
          SUM(oi.Quantity * oi.UnitPrice) AS DoanhThu
        FROM dbo.Orders o
        INNER JOIN dbo.OrderItems oi ON o.OrderId = oi.OrderId
        INNER JOIN dbo.Products p ON oi.ProductId = p.ProductId
        LEFT JOIN dbo.Categories c ON p.CategoryId = c.CategoryId
        WHERE o.CreatedAt BETWEEN @FromDate AND @ToDate
          AND o.Status IN (N'Completed', N'Delivered')
        GROUP BY c.Name
        ORDER BY DoanhThu DESC
      `);
    
    return Response.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('Revenue By Category Error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
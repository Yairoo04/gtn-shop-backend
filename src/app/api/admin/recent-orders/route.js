// API đơn hàng gần nhất
// ============================================
import { getPool } from '../../../lib/db';

export async function GET() {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT TOP 5
        o.OrderId,
        COALESCE(u.FullName, u.Username) AS RecipientName,
        o.TotalAmount,
        o.Status,
        o.PaymentMethod,
        o.CreatedAt,
        u.Username,
        u.Email
      FROM dbo.Orders o
      LEFT JOIN dbo.Users u ON o.UserId = u.UserId
      ORDER BY o.CreatedAt DESC
    `);
    
    return Response.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('Recent Orders Error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
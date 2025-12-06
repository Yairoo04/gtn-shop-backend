// API lấy tổng quan dashboard (6 cards)

import { getPool } from '../../../lib/db';

export async function GET() {
  try {
    const pool = await getPool();
    
    // Doanh thu hôm nay (Completed/Delivered)
    const todayRevenue = await pool.request().query(`
      SELECT ISNULL(SUM(TotalAmount), 0) AS DoanhThuHomNay
      FROM dbo.Orders
      WHERE CAST(CreatedAt AS DATE) = CAST(GETDATE() AS DATE)
        AND Status IN (N'Completed', N'Delivered')
    `);
    
    // Đơn hàng mới hôm nay
    const newOrders = await pool.request().query(`
      SELECT COUNT(*) AS DonHangMoi
      FROM dbo.Orders
      WHERE CAST(CreatedAt AS DATE) = CAST(GETDATE() AS DATE)
    `);
    
    // Khách hàng mới hôm nay (chỉ đếm Customer, không tính Admin/Staff)
    const newCustomers = await pool.request().query(`
      SELECT COUNT(*) AS KhachHangMoi
      FROM dbo.Users
      WHERE CAST(CreatedAt AS DATE) = CAST(GETDATE() AS DATE)
        AND RoleId = 2
    `);
    
    // Tổng sản phẩm
    const totalProducts = await pool.request().query(`
      SELECT COUNT(*) AS TongSanPham FROM dbo.Products
    `);
    
    // Đơn đang giao (bao gồm cả Processing và Shipping)
    const shipping = await pool.request().query(`
      SELECT COUNT(*) AS DonDangGiao
      FROM dbo.Orders
      WHERE Status IN (N'Shipping')
    `);
    
    // Doanh thu tháng này
    const monthRevenue = await pool.request().query(`
      SELECT ISNULL(SUM(TotalAmount), 0) AS DoanhThuThangNay
      FROM dbo.Orders
      WHERE YEAR(CreatedAt) = YEAR(GETDATE())
        AND MONTH(CreatedAt) = MONTH(GETDATE())
        AND Status IN (N'Completed', N'Delivered')
    `);
    
    return Response.json({
      success: true,
      data: {
        doanhThuHomNay: todayRevenue.recordset[0].DoanhThuHomNay,
        donHangMoi: newOrders.recordset[0].DonHangMoi,
        khachHangMoi: newCustomers.recordset[0].KhachHangMoi,
        tongSanPham: totalProducts.recordset[0].TongSanPham,
        donDangGiao: shipping.recordset[0].DonDangGiao,
        doanhThuThangNay: monthRevenue.recordset[0].DoanhThuThangNay,
      }
    });
  } catch (error) {
    console.error('Dashboard Overview Error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
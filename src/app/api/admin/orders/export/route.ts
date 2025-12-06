import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';
import { getPool } from '../../../../lib/db';
import ExcelJS from 'exceljs';

// Xuất báo cáo chi tiết đơn hàng trong 1 tháng (CSV)
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const month = url.searchParams.get('month'); // yyyy-MM
    if (!month) {
      return NextResponse.json({ error: 'Thiếu tham số tháng (yyyy-MM)' }, { status: 400 });
    }
    const [year, mon] = month.split('-');
    if (!year || !mon) {
      return NextResponse.json({ error: 'Tham số tháng không hợp lệ' }, { status: 400 });
    }
    const pool = await getPool();
    // 1. Lấy tổng thu nhập tháng
    const totalResult = await pool.request()
      .input('year', sql.Int, parseInt(year))
      .input('month', sql.Int, parseInt(mon))
      .query(`
        SELECT SUM(TotalAmount) AS TongThuNhapThang
        FROM Orders
        WHERE Status IN (N'Đã giao', N'Đã hoàn thành', 'Completed', 'Delivered')
          AND YEAR(CreatedAt) = @year AND MONTH(CreatedAt) = @month
      `);
    const totalMonth = totalResult.recordset[0]?.TongThuNhapThang || 0;
    // 2. Lấy chi tiết đơn hàng
    const detailResult = await pool.request()
      .input('year', sql.Int, parseInt(year))
      .input('month', sql.Int, parseInt(mon))
      .query(`
        SELECT 
          a.ReceiverName AS TenKhachHang,
          a.PhoneNumber AS SoDienThoai,
          (a.Street + ', ' + a.City + ', ' + a.Province) AS DiaChi,
          o.TotalAmount AS TongTien
        FROM Orders o
        INNER JOIN Addresses a ON o.AddressId = a.AddressId
        WHERE o.Status IN (N'Đã giao', N'Đã hoàn thành', 'Completed', 'Delivered')
          AND YEAR(o.CreatedAt) = @year AND MONTH(o.CreatedAt) = @month
        ORDER BY o.CreatedAt DESC, o.OrderId
      `);
    // 3. Format XLSX
    const nowStr = new Date().toLocaleString('vi-VN');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Báo cáo đơn hàng');
    // Tiêu đề lớn
    sheet.mergeCells('A1', 'E1');
    sheet.getCell('A1').value = `BÁO CÁO ĐƠN HÀNG THÁNG ${mon}/${year}`;
    sheet.getCell('A1').font = { size: 16, bold: true };
    sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    // Ngày giờ xuất file
    sheet.mergeCells('A2', 'E2');
    sheet.getCell('A2').value = `Ngày giờ xuất file: ${nowStr}`;
    sheet.getCell('A2').font = { italic: true };
    // Header
    const header = ['STT', 'Tên khách hàng', 'Số điện thoại', 'Địa chỉ', 'Tổng tiền'];
    sheet.addRow([]); // dòng trống
    sheet.addRow(header);
    const headerRow = sheet.getRow(4);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: 'center' };
    // Dữ liệu
    detailResult.recordset.forEach((row: any, idx: number) => {
      sheet.addRow([
        idx + 1,
        row.TenKhachHang || '',
        row.SoDienThoai || '',
        (row.DiaChi || '').replace(/,/g, ' - '),
        row.TongTien || 0
      ]);
    });
    // Dòng trống
    sheet.addRow([]);
    // Tổng thu nhập tháng
    const totalRow = sheet.addRow(['', '', '', 'TỔNG THU NHẬP THÁNG:', totalMonth]);
    totalRow.font = { bold: true };
    totalRow.getCell(4).alignment = { horizontal: 'right' };
    // Căn chỉnh cột
    sheet.columns = [
      { width: 6 },
      { width: 22 },
      { width: 16 },
      { width: 40 },
      { width: 16 }
    ];
    // Border cho header và dữ liệu
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber >= 4 && rowNumber <= sheet.rowCount - 2) {
        row.eachCell(cell => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      }
    });
    // Xuất file xlsx
    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="doanhThuThang_${month}.xlsx"`
      }
    });
  } catch (err) {
    console.error('Export orders error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
